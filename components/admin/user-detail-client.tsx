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
import { AreaChart, Area, PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
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

export default function UserDetailClient({ userId }: { userId: string }) {
  const router = useRouter()

  const [user, setUser] = useState<User | null>(null)
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const safeToDate = (timestamp: any): Date => {
    try {
      if (!timestamp) return new Date()
      if (timestamp?.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate()
      if (timestamp instanceof Date) return timestamp
      if (typeof timestamp === 'string') return new Date(timestamp)
      if (typeof timestamp === 'number') return new Date(timestamp)
      return new Date()
    } catch {
      return new Date()
    }
  }

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || !db) return

      try {
        setLoading(true)
        const userDoc = await getDoc(doc(db, 'users', userId))
        if (userDoc.exists()) {
          const data = userDoc.data() as any
          setUser({
            id: userId,
            name: data.displayName || data.email?.split('@')[0] || 'Bilinmeyen Kullanıcı',
            email: data.email || '',
            phone: data.phone || '',
            avatar: data.photoURL || '',
            status: data.status || 'active',
            joinDate: safeToDate(data.createdAt).toISOString(),
            lastLogin: safeToDate(data.lastSeen).toISOString(),
            isOnline: data.isOnline || false,
            totalTransactions: data.totalTransactions || 0,
            totalAmount: data.totalAmount || 0,
            monthlySpent: data.monthlySpent || 0,
            monthlyIncome: data.monthlyIncome || 0,
            budgetUsage: data.budgetUsage || 0,
            savingsGoal: data.savingsGoal || 0,
            creditScore: data.creditScore || 750,
            riskLevel: data.riskLevel || 'low'
          })
        }

        const q = query(
          collection(db, 'user_activities'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(20)
        )
        const snap = await getDocs(q)
        setActivities(snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: safeToDate(d.data().timestamp) })) as any)

        const analytics = new UserAnalytics(userId)
        const summary = await analytics.getFinancialSummary()
        setFinancialSummary(summary)

        setUser(prev => prev ? {
          ...prev,
          totalTransactions: summary.transactionCount,
          totalAmount: summary.totalIncome,
          monthlySpent: summary.averageMonthlyExpense,
          monthlyIncome: summary.averageMonthlyIncome,
          budgetUsage: summary.averageMonthlyIncome > 0 ? Math.min(100, (summary.averageMonthlyExpense / summary.averageMonthlyIncome) * 100) : 0
        } : prev)
      } finally {
        setLoading(false)
      }
    }
    fetchUserData()
  }, [userId])

  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Kullanıcı ID gerekli</CardTitle>
            <CardDescription>Geçerli bir kullanıcı ID'si belirtilmedi.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/admin/users')} variant="outline">Kullanıcı listesine dön</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading || !user) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <Button variant="outline" size="sm" onClick={() => router.back()} className="flex items-center gap-2">
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
                <AvatarFallback className="text-lg">{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
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
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" />{user.email}</div>
                  {user.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4" />{user.phone}</div>}
                  <div className="flex items-center gap-2"><Calendar className="h-4 w-4" />Katılım: {new Date(user.joinDate).toLocaleDateString('tr-TR')}</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />Son giriş: {new Date(user.lastLogin).toLocaleString('tr-TR')}
                    {user.isOnline && <Badge className="bg-green-500 text-white ml-2">Online</Badge>}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">Kredi Skoru</div>
              <div className="text-3xl font-bold text-green-600">{user.creditScore}</div>
              <div className={`text-sm ${getRiskColor(user.riskLevel)}`}>Risk: {user.riskLevel === 'low' ? 'Düşük' : user.riskLevel === 'medium' ? 'Orta' : 'Yüksek'}</div>
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
                <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" />Bütçe Kullanımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Bu ay harcanan</span>
                    <span>₺{user.monthlySpent.toLocaleString()} / ₺{user.monthlyIncome.toLocaleString()}</span>
                  </div>
                  <Progress value={user.budgetUsage} className="h-2" />
                  <p className="text-sm text-muted-foreground">Gelirin %{user.budgetUsage}'ini kullanmış</p>
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
