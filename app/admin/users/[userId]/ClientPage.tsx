"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
	ArrowLeft, 
	Mail, 
	Phone, 
	Calendar, 
	Activity,
	TrendingUp,
	CreditCard,
	Wallet,
	Target,
	Ban,
	Eye,
	Settings,
	Clock
} from "lucide-react"
import { LineChart, Line, AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar } from 'recharts'
import { db } from '@/lib/firebase'
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { UserAnalytics, FinancialSummary } from '@/lib/user-analytics'

interface User {
	id: string
	name: string
	email: string
	phone?: string
	avatar?: string
	status: 'active' | 'inactive' | 'suspended'
	joinDate: string
	lastLogin: string
	isOnline: boolean
	totalTransactions: number
	totalAmount: number
	monthlySpent: number
	monthlyIncome: number
	budgetUsage: number
	savingsGoal: number
	creditScore: number
	riskLevel: 'low' | 'medium' | 'high'
}

interface UserActivity {
	id: string
	action: string
	description: string
	timestamp: Date
	ipAddress?: string
	userAgent?: string
	metadata?: Record<string, any>
}

export default function ClientUserDetailPage({ userId }: { userId: string }) {
	const router = useRouter()

	const [user, setUser] = useState<User | null>(null)
	const [activities, setActivities] = useState<UserActivity[]>([])
	const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
	const [loading, setLoading] = useState(true)

	const safeToDate = (timestamp: any): Date => {
		try {
			if (!timestamp) return new Date()
			if (timestamp.toDate && typeof timestamp.toDate === 'function') {
				return timestamp.toDate()
			}
			if (timestamp instanceof Date) {
				return timestamp
			}
			if (typeof timestamp === 'string') {
				return new Date(timestamp)
			}
			if (typeof timestamp === 'number') {
				return new Date(timestamp)
			}
			return new Date()
		} catch (error) {
			console.warn('Error converting timestamp:', timestamp, error)
			return new Date()
		}
	}

	useEffect(() => {
		const fetchUserData = async () => {
			if (!userId) return

			try {
				setLoading(true)
        
				const userDoc = await getDoc(doc(db!, 'users', userId))
				if (userDoc.exists()) {
					const userData = userDoc.data()
					setUser({
						id: userId,
						name: userData.displayName || userData.email?.split('@')[0] || 'Bilinmeyen Kullanıcı',
						email: userData.email || '',
						phone: userData.phone || '',
						avatar: userData.photoURL || '',
						status: userData.status || 'active',
						joinDate: safeToDate(userData.createdAt).toISOString(),
						lastLogin: safeToDate(userData.lastSeen).toISOString(),
						isOnline: userData.isOnline || false,
						totalTransactions: userData.totalTransactions || 0,
						totalAmount: userData.totalAmount || 0,
						monthlySpent: userData.monthlySpent || 0,
						monthlyIncome: userData.monthlyIncome || 0,
						budgetUsage: userData.budgetUsage || 0,
						savingsGoal: userData.savingsGoal || 0,
						creditScore: userData.creditScore || 750,
						riskLevel: userData.riskLevel || 'low'
					})
				}

				const activitiesQuery = query(
					collection(db!, 'user_activities'),
					where('userId', '==', userId),
					orderBy('timestamp', 'desc'),
					limit(20)
				)
        
				const activitiesSnapshot = await getDocs(activitiesQuery)
				const activitiesData = activitiesSnapshot.docs.map(doc => ({
					id: doc.id,
					...doc.data(),
					timestamp: safeToDate(doc.data().timestamp)
				})) as UserActivity[]
        
				setActivities(activitiesData)

				const analytics = new UserAnalytics(userId)
				const financialData = await analytics.getFinancialSummary()
				setFinancialSummary(financialData)

				if (userDoc.exists()) {
					setUser(prev => prev ? {
						...prev,
						totalTransactions: financialData.transactionCount,
						totalAmount: financialData.totalIncome,
						monthlySpent: financialData.averageMonthlyExpense,
						monthlyIncome: financialData.averageMonthlyIncome,
						budgetUsage: financialData.averageMonthlyIncome > 0 
							? Math.min(100, (financialData.averageMonthlyExpense / financialData.averageMonthlyIncome) * 100)
							: 0
					} : null)
				}
			} catch (error) {
				console.error('Error fetching user data:', error)
			} finally {
				setLoading(false)
			}
		}

		fetchUserData()
	}, [userId])

	if (loading) {
		return (
			<div className="container mx-auto p-6">
				<div className="flex items-center justify-center h-64">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				</div>
			</div>
		)
	}

	if (!user) {
		return (
			<div className="container mx-auto p-6">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">Kullanıcı Bulunamadı</h1>
					<p className="text-muted-foreground mb-4">Bu kullanıcı mevcut değil veya silinmiş olabilir.</p>
					<Button onClick={() => router.back()}>Geri Dön</Button>
				</div>
			</div>
		)
	}

	const transactionHistory = [
		{ month: 'Oca', income: 12000, expense: 8000 },
		{ month: 'Şub', income: 11500, expense: 8500 },
		{ month: 'Mar', income: 12500, expense: 9000 },
		{ month: 'Nis', income: 12000, expense: 7500 },
		{ month: 'May', income: 13000, expense: 8500 },
		{ month: 'Haz', income: 12500, expense: 9500 },
	]

	const recentTransactions = [
		{ id: 1, date: '2024-09-12', description: 'Market Alışverişi', amount: -150, category: 'Market', type: 'expense' },
		{ id: 2, date: '2024-09-11', description: 'Maaş', amount: 12000, category: 'Gelir', type: 'income' },
		{ id: 3, date: '2024-09-10', description: 'Netflix Abonelik', amount: -50, category: 'Eğlence', type: 'expense' },
		{ id: 4, date: '2024-09-09', description: 'Elektrik Faturası', amount: -280, category: 'Faturalar', type: 'expense' },
		{ id: 5, date: '2024-09-08', description: 'Otobüs Kartı', amount: -100, category: 'Ulaşım', type: 'expense' },
	]

	const formatActivityDescription = (activity: UserActivity) => {
		switch (activity.action) {
			case 'page_visit':
				return `${activity.metadata?.path || 'sayfa'} sayfasını ziyaret etti`
			case 'button_click':
				return activity.description
			case 'transaction_added':
				return `${activity.metadata?.type === 'income' ? 'Gelir' : 'Gider'} ekledi: ₺${activity.metadata?.amount}`
			case 'budget_updated':
				return `Bütçe güncelledi: ${activity.metadata?.budgetName}`
			case 'settings_changed':
				return `Ayarları değiştirdi: ${activity.metadata?.setting}`
			case 'error_occurred':
				return `Hata oluştu: ${activity.metadata?.error}`
			default:
				return activity.description
		}
	}

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'active': return 'bg-green-500'
			case 'inactive': return 'bg-yellow-500'
			case 'suspended': return 'bg-red-500'
			default: return 'bg-gray-500'
		}
	}

	const getRiskColor = (risk: string) => {
		switch (risk) {
			case 'low': return 'text-green-600'
			case 'medium': return 'text-yellow-600'
			case 'high': return 'text-red-600'
			default: return 'text-gray-600'
		}
	}

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex items-center gap-4">
				<Button 
					variant="outline" 
					size="sm" 
					onClick={() => router.back()}
					className="flex items-center gap-2"
				>
					<ArrowLeft className="h-4 w-4" />
					Geri
				</Button>
				<div className="flex-1">
					<h1 className="text-3xl font-bold">Kullanıcı Detayları</h1>
					<p className="text-muted-foreground">Kullanıcı profili ve finansal aktivite</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm">
						<Eye className="h-4 w-4 mr-2" />
						Logları Görüntüle
					</Button>
					<Button variant="outline" size="sm">
						<Settings className="h-4 w-4 mr-2" />
						Düzenle
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-4">
							<Avatar className="h-16 w-16">
								<AvatarImage src={user.avatar} />
								<AvatarFallback className="text-lg">
									{user.name.split(' ').map(n => n[0]).join('')}
								</AvatarFallback>
							</Avatar>
							<div>
								<div className="flex items-center gap-2 mb-1">
									<h2 className="text-2xl font-bold">{user.name}</h2>
									<div className={`w-3 h-3 rounded-full ${getStatusColor(user.status)}`}></div>
									<Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
										{user.status === 'active' ? 'Aktif' : user.status === 'inactive' ? 'Pasif' : 'Askıya Alınmış'}
									</Badge>
								</div>
								<div className="space-y-1 text-sm text-muted-foreground">
									<div className="flex items-center gap-2">
										<Mail className="h-4 w-4" />
										{user.email}
									</div>
									{user.phone && (
										<div className="flex items-center gap-2">
											<Phone className="h-4 w-4" />
											{user.phone}
										</div>
									)}
									<div className="flex items-center gap-2">
										<Calendar className="h-4 w-4" />
										Katılım: {new Date(user.joinDate).toLocaleDateString('tr-TR')}
									</div>
									<div className="flex items-center gap-2">
										<Clock className="h-4 w-4" />
										Son giriş: {new Date(user.lastLogin).toLocaleString('tr-TR')}
										{user.isOnline && (
											<Badge className="bg-green-500 text-white ml-2">
												Online
											</Badge>
										)}
									</div>
								</div>
							</div>
						</div>
						<div className="text-right">
							<div className="text-2xl font-bold">Kredi Skoru</div>
							<div className="text-3xl font-bold text-green-600">{user.creditScore}</div>
							<div className={`text-sm ${getRiskColor(user.riskLevel)}`}>
								Risk: {user.riskLevel === 'low' ? 'Düşük' : user.riskLevel === 'medium' ? 'Orta' : 'Yüksek'}
							</div>
						</div>
					</div>
				</CardHeader>
			</Card>

			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Toplam İşlem</p>
								<p className="text-2xl font-bold">{user.totalTransactions}</p>
							</div>
							<Activity className="h-8 w-8 text-blue-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Toplam Hacim</p>
								<p className="text-2xl font-bold">₺{user.totalAmount.toLocaleString()}</p>
							</div>
							<TrendingUp className="h-8 w-8 text-green-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Aylık Gelir</p>
								<p className="text-2xl font-bold text-green-600">₺{user.monthlyIncome.toLocaleString()}</p>
							</div>
							<Wallet className="h-8 w-8 text-green-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-muted-foreground">Aylık Harcama</p>
								<p className="text-2xl font-bold text-red-600">₺{user.monthlySpent.toLocaleString()}</p>
							</div>
							<CreditCard className="h-8 w-8 text-red-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			<Tabs defaultValue="overview" className="space-y-4">
				<TabsList>
					<TabsTrigger value="overview">Genel Bakış</TabsTrigger>
					<TabsTrigger value="transactions">İşlemler</TabsTrigger>
					<TabsTrigger value="analytics">Analitik</TabsTrigger>
					<TabsTrigger value="settings">Ayarlar</TabsTrigger>
				</TabsList>

				<TabsContent value="overview" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Target className="h-5 w-5" />
									Bütçe Kullanımı
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									<div className="flex justify-between text-sm">
										<span>Bu ay harcanan</span>
										<span>₺{user.monthlySpent.toLocaleString()} / ₺{user.monthlyIncome.toLocaleString()}</span>
									</div>
									<Progress value={user.budgetUsage} className="h-2" />
									<p className="text-sm text-muted-foreground">
										Gelirin %{user.budgetUsage}'ini kullanmış
									</p>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Gelir vs Gider (Son 6 Ay)</CardTitle>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={200}>
									<AreaChart data={transactionHistory}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="month" />
										<YAxis />
										<Tooltip />
										<Area type="monotone" dataKey="income" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
										<Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
									</AreaChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Son İşlemler</CardTitle>
							<CardDescription>Son 5 işlem</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-4">
								{recentTransactions.map((transaction) => (
									<div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
										<div className="flex items-center gap-3">
											<div className={`w-2 h-2 rounded-full ${transaction.type === 'income' ? 'bg-green-500' : 'bg-red-500'}`}></div>
											<div>
												<p className="font-medium">{transaction.description}</p>
												<p className="text-sm text-muted-foreground">{transaction.category} • {transaction.date}</p>
											</div>
										</div>
										<div className={`font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
											{transaction.type === 'income' ? '+' : ''}₺{Math.abs(transaction.amount).toLocaleString()}
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle>Son Aktiviteler</CardTitle>
							<CardDescription>Kullanıcının son aktiviteleri</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3 max-h-64 overflow-y-auto">
								{activities.length > 0 ? (
									activities.map((activity) => (
										<div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
											<div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
											<div className="flex-1 min-w-0">
												<p className="text-sm font-medium">{formatActivityDescription(activity)}</p>
												<div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
													<span>{activity.timestamp.toLocaleString('tr-TR')}</span>
													{activity.ipAddress && (
														<>
															<span>•</span>
															<span>{activity.ipAddress}</span>
														</>
													)}
												</div>
											</div>
										</div>
									))
								) : (
									<p className="text-muted-foreground text-center py-4">
										Henüz aktivite kaydı bulunmuyor
									</p>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="transactions" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Kullanıcı Aktivite Geçmişi</CardTitle>
							<CardDescription>Tüm aktivite kayıtları</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								{activities.length > 0 ? (
									activities.map((activity) => (
										<div key={activity.id} className="flex items-start justify-between p-4 border rounded-lg">
											<div className="flex items-start gap-3">
												<div className="w-3 h-3 rounded-full bg-blue-500 mt-1.5"></div>
												<div>
													<p className="font-medium">{formatActivityDescription(activity)}</p>
													<p className="text-sm text-muted-foreground">
														{activity.timestamp.toLocaleString('tr-TR')}
													</p>
													{activity.metadata && Object.keys(activity.metadata).length > 0 && (
														<div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs">
															<pre>{JSON.stringify(activity.metadata, null, 2)}</pre>
														</div>
													)}
												</div>
											</div>
											<Badge variant="outline">{activity.action}</Badge>
										</div>
									))
								) : (
									<p className="text-muted-foreground text-center py-8">
										Aktivite geçmişi bulunamadı
									</p>
								)}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				<TabsContent value="analytics" className="space-y-4">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
						<Card>
							<CardHeader>
								<CardTitle>Finansal Sağlık Skoru</CardTitle>
							</CardHeader>
							<CardContent>
								{financialSummary ? (
									<div className="space-y-4">
										<div className="text-center">
											<div className="text-4xl font-bold text-blue-600">
												{Math.round((financialSummary.netWorth > 0 ? 85 : 65))}
											</div>
											<p className="text-sm text-muted-foreground">100 üzerinden</p>
										</div>
                    
										<div className="space-y-2">
											<div className="flex justify-between text-sm">
												<span>Net Değer</span>
												<span className={financialSummary.netWorth >= 0 ? 'text-green-600' : 'text-red-600'}>
													₺{financialSummary.netWorth.toLocaleString()}
												</span>
											</div>
											<div className="flex justify-between text-sm">
												<span>Aylık Ortalama Gelir</span>
												<span className="text-green-600">₺{financialSummary.averageMonthlyIncome.toLocaleString()}</span>
											</div>
											<div className="flex justify-between text-sm">
												<span>Aylık Ortalama Gider</span>
												<span className="text-red-600">₺{financialSummary.averageMonthlyExpense.toLocaleString()}</span>
											</div>
											<div className="flex justify-between text-sm">
												<span>En Büyük İşlem</span>
												<span>
													{financialSummary.largestTransaction 
														? `₺${Math.abs(financialSummary.largestTransaction.amount).toLocaleString()}`
														: 'Bulunamadı'
													}
												</span>
											</div>
										</div>
									</div>
								) : (
									<div className="text-center py-8">
										<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
										<p className="text-sm text-muted-foreground mt-2">Finansal veriler yükleniyor...</p>
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Kategori Dağılımı</CardTitle>
							</CardHeader>
							<CardContent>
								{financialSummary && financialSummary.topCategories.length > 0 ? (
									<ResponsiveContainer width="100%" height={250}>
										<RechartsPieChart>
											<Pie
												data={financialSummary.topCategories}
												cx="50%"
												cy="50%"
												outerRadius={80}
												dataKey="value"
												label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
											>
												{financialSummary.topCategories.map((entry, index) => (
													<Cell key={`cell-${index}`} fill={entry.color} />
												))}
											</Pie>
											<Tooltip formatter={(value: any) => [`₺${value.toLocaleString()}`, 'Tutar']} />
										</RechartsPieChart>
									</ResponsiveContainer>
								) : (
									<div className="text-center py-8 text-muted-foreground">
										Kategori verisi bulunamadı
									</div>
								)}
							</CardContent>
						</Card>

						<Card className="lg:col-span-2">
							<CardHeader>
								<CardTitle>Aylık Finansal Trend</CardTitle>
							</CardHeader>
							<CardContent>
								{financialSummary && financialSummary.monthlyTrends.length > 0 ? (
									<ResponsiveContainer width="100%" height={300}>
										<AreaChart data={financialSummary.monthlyTrends}>
											<CartesianGrid strokeDasharray="3 3" />
											<XAxis dataKey="month" />
											<YAxis />
											<Tooltip formatter={(value: any) => [`₺${value.toLocaleString()}`, '']} />
											<Area type="monotone" dataKey="income" stackId="1" stroke="#22c55e" fill="#22c55e" fillOpacity={0.3} />
											<Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} />
										</AreaChart>
									</ResponsiveContainer>
								) : (
									<div className="text-center py-8 text-muted-foreground">
										Aylık trend verisi bulunamadı
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>İşlem İstatistikleri</CardTitle>
							</CardHeader>
							<CardContent>
								{financialSummary ? (
									<div className="space-y-4">
										<div className="grid grid-cols-2 gap-4">
											<div className="text-center p-3 border rounded-lg">
												<div className="text-2xl font-bold text-blue-600">{financialSummary.transactionCount}</div>
												<div className="text-sm text-muted-foreground">Toplam İşlem</div>
											</div>
											<div className="text-center p-3 border rounded-lg">
												<div className="text-2xl font-bold text-purple-600">{financialSummary.topCategories.length}</div>
												<div className="text-sm text-muted-foreground">Aktif Kategori</div>
											</div>
										</div>
                    
										<div className="space-y-2">
											<div className="flex justify-between text-sm">
												<span>En Çok Kullanılan Kategori</span>
												<span className="font-medium">{financialSummary.mostFrequentCategory}</span>
											</div>
											<div className="flex justify-between text-sm">
												<span>Toplam Gelir</span>
												<span className="text-green-600">₺{financialSummary.totalIncome.toLocaleString()}</span>
											</div>
											<div className="flex justify-between text-sm">
												<span>Toplam Gider</span>
												<span className="text-red-600">₺{financialSummary.totalExpense.toLocaleString()}</span>
											</div>
										</div>
									</div>
								) : (
									<div className="text-center py-8 text-muted-foreground">
										İstatistik verisi yükleniyor...
									</div>
								)}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>En Çok Harcama Yapılan Kategoriler</CardTitle>
							</CardHeader>
							<CardContent>
								{financialSummary && financialSummary.topCategories.length > 0 ? (
									<div className="space-y-3">
										{financialSummary.topCategories.slice(0, 5).map((category, index) => (
											<div key={category.name} className="flex items-center justify-between">
												<div className="flex items-center gap-3">
													<div 
														className="w-4 h-4 rounded-full" 
														style={{ backgroundColor: category.color }}
													></div>
													<span className="text-sm font-medium">{category.name}</span>
												</div>
												<div className="text-right">
													<div className="text-sm font-bold">₺{category.value.toLocaleString()}</div>
													<div className="text-xs text-muted-foreground">{category.count} işlem</div>
												</div>
											</div>
										))}
									</div>
								) : (
									<div className="text-center py-8 text-muted-foreground">
										Kategori verisi bulunamadı
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				<TabsContent value="settings" className="space-y-4">
					<Card>
						<CardHeader>
							<CardTitle>Kullanıcı Ayarları</CardTitle>
							<CardDescription>Kullanıcı hesabı yönetimi</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="flex items-center justify-between p-4 border rounded-lg">
								<div>
									<h3 className="font-medium">Hesap Durumu</h3>
									<p className="text-sm text-muted-foreground">Kullanıcı hesabını etkinleştir/devre dışı bırak</p>
								</div>
								<Button variant={user.status === 'active' ? 'destructive' : 'default'}>
									{user.status === 'active' ? 'Devre Dışı Bırak' : 'Etkinleştir'}
								</Button>
							</div>

							<div className="flex items-center justify-between p-4 border rounded-lg">
								<div>
									<h3 className="font-medium">Şifre Sıfırlama</h3>
									<p className="text-sm text-muted-foreground">Kullanıcıya şifre sıfırlama e-postası gönder</p>
								</div>
								<Button variant="outline">
									Şifre Sıfırla
								</Button>
							</div>

							<div className="flex items-center justify-between p-4 border rounded-lg">
								<div>
									<h3 className="font-medium">Hesap Silme</h3>
									<p className="text-sm text-muted-foreground">Kullanıcı hesabını kalıcı olarak sil</p>
								</div>
								<Button variant="destructive">
									<Ban className="h-4 w-4 mr-2" />
									Hesabı Sil
								</Button>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	)
}
