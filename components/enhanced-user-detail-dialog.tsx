"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db } from "@/lib/firebase"
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs, updateDoc, addDoc, Timestamp } from "firebase/firestore"
import { User, Mail, Calendar, Activity, TrendingUp, Shield, Clock, AlertTriangle, Ban, UserX, History, Eye, MapPin, Globe, Smartphone, Lock, CheckCircle, XCircle } from "lucide-react"
import { useAuth } from "@/components/auth-guard"

interface UserData {
  id: string
  email: string
  displayName?: string
  photoURL?: string
  role?: string
  createdAt?: any
  lastLoginAt?: any
  isActive?: boolean
  phoneNumber?: string
  emailVerified?: boolean
  isBanned?: boolean
  banReason?: string
  banExpiry?: any
  bannedBy?: string
  bannedAt?: any
  isTimedOut?: boolean
  timeoutExpiry?: any
  timeoutReason?: string
  totalTransactions?: number
  totalRevenue?: number
  lastActivity?: any
  ipAddress?: string
  deviceInfo?: string
  loginCount?: number
}

interface Transaction {
  id: string
  amount: number
  category: string
  description: string
  date: any
  type: 'income' | 'expense'
}

interface UserActivity {
  id: string
  action: string
  timestamp: any
  details?: any
  ipAddress?: string
}

interface BanRecord {
  id: string
  userId: string
  reason: string
  bannedBy: string
  bannedAt: any
  expiry?: any
  isActive: boolean
  type: 'ban' | 'timeout'
}

interface EnhancedUserDetailDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated?: () => void
}

export function EnhancedUserDetailDialog({ userId, open, onOpenChange, onUserUpdated }: EnhancedUserDetailDialogProps) {
  const { user: authUser } = useAuth()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [userActivities, setUserActivities] = useState<UserActivity[]>([])
  const [banHistory, setBanHistory] = useState<BanRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Ban/Timeout states
  const [showBanDialog, setShowBanDialog] = useState(false)
  const [banType, setBanType] = useState<'ban' | 'timeout'>('ban')
  const [banReason, setBanReason] = useState('')
  const [banDuration, setBanDuration] = useState('1h')
  const [processing, setProcessing] = useState(false)

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Bilgi yok'
    try {
      let date: Date
      if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate()
      } else if (timestamp instanceof Date) {
        date = timestamp
      } else {
        date = new Date(timestamp)
      }
      if (isNaN(date.getTime())) return 'Geçersiz tarih'
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Geçersiz tarih'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount)
  }

  const getBanDurationMs = (duration: string) => {
    const durations: Record<string, number> = {
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '3d': 3 * 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      'permanent': -1
    }
    return durations[duration] || 60 * 60 * 1000
  }

  const fetchUserDetails = async (uid: string) => {
    if (!db) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Kullanıcı verilerini getir
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        setUserData({ id: uid, ...userDoc.data() } as UserData)
      } else {
        throw new Error('Kullanıcı bulunamadı')
      }

      // Son işlemleri getir
      let userTransactions: Transaction[] = []
      try {
        const transactionsQuery = query(
          collection(db, 'transactions'),
          where('userId', '==', uid),
          orderBy('date', 'desc'),
          limit(10)
        )
        const transactionsSnapshot = await getDocs(transactionsQuery)
        userTransactions = transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Transaction[]
      } catch (transactionError) {
        console.warn('İşlemler yüklenirken hata:', transactionError)
        userTransactions = []
      }
      
      setTransactions(userTransactions)

      // Kullanıcı aktivitelerini getir
      try {
        const activitiesQuery = query(
          collection(db, 'user_activities'),
          where('userId', '==', uid),
          orderBy('timestamp', 'desc'),
          limit(20)
        )
        const activitiesSnapshot = await getDocs(activitiesQuery)
        const activities = activitiesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserActivity[]
        setUserActivities(activities)
      } catch (activityError) {
        console.warn('Aktiviteler yüklenirken hata:', activityError)
        setUserActivities([])
      }

      // Ban geçmişini getir
      try {
        const banQuery = query(
          collection(db, 'ban_records'),
          where('userId', '==', uid),
          orderBy('bannedAt', 'desc'),
          limit(10)
        )
        const banSnapshot = await getDocs(banQuery)
        const bans = banSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BanRecord[]
        setBanHistory(bans)
      } catch (banError) {
        console.warn('Ban geçmişi yüklenirken hata:', banError)
        setBanHistory([])
      }
      
    } catch (err) {
      console.error('Kullanıcı detayları yüklenirken hata:', err)
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  const handleBanUser = async () => {
    if (!userData || !banReason.trim() || !authUser) return
    
    setProcessing(true)
    
    try {
      const now = new Date()
      const durationMs = getBanDurationMs(banDuration)
      const expiry = durationMs === -1 ? null : new Date(now.getTime() + durationMs)
      
      const banData = {
        isBanned: banType === 'ban',
        isTimedOut: banType === 'timeout',
        banReason: banReason,
        timeoutReason: banType === 'timeout' ? banReason : null,
        bannedBy: authUser.uid,
        bannedAt: Timestamp.fromDate(now),
        banExpiry: expiry ? Timestamp.fromDate(expiry) : null,
        timeoutExpiry: banType === 'timeout' && expiry ? Timestamp.fromDate(expiry) : null,
        isActive: false // Deaktif et
      }
      
      // Kullanıcıyı güncelle
      await updateDoc(doc(db, 'users', userData.id), banData)
      
      // Ban kaydı ekle
      await addDoc(collection(db, 'ban_records'), {
        userId: userData.id,
        reason: banReason,
        bannedBy: authUser.uid,
        bannedAt: Timestamp.fromDate(now),
        expiry: expiry ? Timestamp.fromDate(expiry) : null,
        isActive: true,
        type: banType
      })

      // Admin action'ı logla
      await addDoc(collection(db, 'admin_logs'), {
        action: banType === 'ban' ? 'user_banned' : 'user_timed_out',
        details: {
          targetUserId: userData.id,
          targetUserEmail: userData.email,
          reason: banReason,
          duration: banDuration,
          expiry: expiry?.toISOString()
        },
        timestamp: Timestamp.fromDate(now),
        adminId: authUser.uid
      })

      console.log(`🚫 Kullanıcı ${banType === 'ban' ? 'banlandı' : 'timeout\'a alındı'}:`, {
        userId: userData.id,
        reason: banReason,
        duration: banDuration,
        expiry: expiry?.toISOString()
      })

      // UI'ı güncelle
      setUserData({ ...userData, ...banData })
      setShowBanDialog(false)
      setBanReason('')
      onUserUpdated?.()
      
    } catch (error) {
      console.error('Ban işlemi başarısız:', error)
      alert('Ban işlemi başarısız oldu. Lütfen tekrar deneyin.')
    } finally {
      setProcessing(false)
    }
  }

  const handleUnbanUser = async () => {
    if (!userData || !authUser) return
    
    setProcessing(true)
    
    try {
      const now = new Date()
      
      // Ban'ı kaldır
      await updateDoc(doc(db, 'users', userData.id), {
        isBanned: false,
        isTimedOut: false,
        banReason: null,
        timeoutReason: null,
        banExpiry: null,
        timeoutExpiry: null,
        isActive: true
      })

      // Admin action'ı logla
      await addDoc(collection(db, 'admin_logs'), {
        action: 'user_unbanned',
        details: {
          targetUserId: userData.id,
          targetUserEmail: userData.email
        },
        timestamp: Timestamp.fromDate(now),
        adminId: authUser.uid
      })

      console.log('✅ Kullanıcı ban\'ı kaldırıldı:', userData.id)

      // UI'ı güncelle
      setUserData({
        ...userData,
        isBanned: false,
        isTimedOut: false,
        isActive: true
      })
      onUserUpdated?.()
      
    } catch (error) {
      console.error('Unban işlemi başarısız:', error)
      alert('Ban kaldırma işlemi başarısız oldu. Lütfen tekrar deneyin.')
    } finally {
      setProcessing(false)
    }
  }

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'admin': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'KU'
  }

  const getBanStatus = () => {
    if (!userData) return null
    
    if (userData.isBanned) {
      const isExpired = userData.banExpiry && new Date() > userData.banExpiry.toDate()
      return {
        type: 'ban',
        active: !isExpired,
        reason: userData.banReason,
        expiry: userData.banExpiry
      }
    }
    
    if (userData.isTimedOut) {
      const isExpired = userData.timeoutExpiry && new Date() > userData.timeoutExpiry.toDate()
      return {
        type: 'timeout',
        active: !isExpired,
        reason: userData.timeoutReason,
        expiry: userData.timeoutExpiry
      }
    }
    
    return null
  }

  useEffect(() => {
    if (userId && open) {
      fetchUserDetails(userId)
    }
  }, [userId, open])

  const totalTransactions = transactions.length
  const totalAmount = transactions.reduce((sum: number, t: Transaction) => 
    sum + (t.type === 'income' ? t.amount : -t.amount), 0)
  const banStatus = getBanStatus()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 dark:text-gray-100">
            <User className="h-5 w-5" />
            Kullanıcı Detayları ve Yönetimi
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            Kullanıcı bilgileri, aktivite geçmişi ve moderasyon araçları
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <Button onClick={() => userId && fetchUserDetails(userId)}>
              Tekrar Dene
            </Button>
          </div>
        ) : userData ? (
          <div className="space-y-6">
            {/* Kullanıcı Profil Header */}
            <Card className="dark:bg-slate-700 dark:border-slate-600">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-20 w-20 ring-2 ring-gray-200 dark:ring-slate-500">
                    <AvatarImage src={userData.photoURL} alt={userData.displayName || userData.email} />
                    <AvatarFallback className="text-xl bg-gradient-to-br from-blue-400 to-purple-500 text-white">
                      {getInitials(userData.displayName, userData.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold dark:text-gray-100">
                        {userData.displayName || 'İsimsiz Kullanıcı'}
                      </h3>
                      <Badge className={getRoleColor(userData.role)}>
                        {userData.role === 'superadmin' ? 'Süper Admin' : 
                         userData.role === 'admin' ? 'Admin' : 'Kullanıcı'}
                      </Badge>
                      {userData.emailVerified ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Doğrulanmış
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                          <XCircle className="h-3 w-3 mr-1" />
                          Doğrulanmamış
                        </Badge>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 font-mono text-sm mb-2">{userData.email}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Üyelik: {formatDate(userData.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Son Giriş: {formatDate(userData.lastLoginAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      userData.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${userData.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                      {userData.isActive ? 'Aktif' : 'Pasif'}
                    </div>
                    
                    {banStatus && banStatus.active && (
                      <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-center">
                        <Ban className="h-3 w-3 mr-1" />
                        {banStatus.type === 'ban' ? 'Banlandı' : 'Timeout'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Ban Status Alert */}
                {banStatus && banStatus.active && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="font-medium text-red-800 dark:text-red-300">
                        Bu kullanıcı {banStatus.type === 'ban' ? 'banlandı' : 'timeout\'a alındı'}
                      </span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                      Sebep: {banStatus.reason}
                    </p>
                    {banStatus.expiry && (
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Bitiş: {formatDate(banStatus.expiry)}
                      </p>
                    )}
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {!banStatus?.active ? (
                <>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setBanType('ban')
                      setShowBanDialog(true)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Ban className="h-4 w-4" />
                    Banla
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBanType('timeout')
                      setShowBanDialog(true)
                    }}
                    className="flex items-center gap-2 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-900/20"
                  >
                    <UserX className="h-4 w-4" />
                    Timeout
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleUnbanUser}
                  disabled={processing}
                  className="flex items-center gap-2 border-green-300 text-green-600 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-900/20"
                >
                  <CheckCircle className="h-4 w-4" />
                  {processing ? 'İşleniyor...' : 'Ban\'ı Kaldır'}
                </Button>
              )}
            </div>

            {/* Detail Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 dark:bg-slate-700">
                <TabsTrigger value="overview" className="dark:text-gray-300">Genel Bakış</TabsTrigger>
                <TabsTrigger value="transactions" className="dark:text-gray-300">İşlemler</TabsTrigger>
                <TabsTrigger value="activity" className="dark:text-gray-300">Aktivite</TabsTrigger>
                <TabsTrigger value="moderation" className="dark:text-gray-300">Moderasyon</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="dark:bg-slate-700 dark:border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Toplam İşlem</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold dark:text-gray-100">{totalTransactions}</div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">işlem yapıldı</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="dark:bg-slate-700 dark:border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Net Bakiye</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-2xl font-bold ${totalAmount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(totalAmount)}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">toplam bakiye</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="dark:bg-slate-700 dark:border-slate-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-gray-600 dark:text-gray-400">Hesap Durumu</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-lg font-semibold ${userData.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {userData.isActive ? 'Aktif' : 'Pasif'}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">hesap durumu</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Contact Info */}
                <Card className="dark:bg-slate-700 dark:border-slate-600">
                  <CardHeader>
                    <CardTitle className="dark:text-gray-100">İletişim Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="dark:text-gray-300">{userData.email}</span>
                    </div>
                    {userData.phoneNumber && (
                      <div className="flex items-center gap-3">
                        <Smartphone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="dark:text-gray-300">{userData.phoneNumber}</span>
                      </div>
                    )}
                    {userData.ipAddress && (
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <span className="dark:text-gray-300">Son IP: {userData.ipAddress}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="transactions" className="space-y-4">
                <Card className="dark:bg-slate-700 dark:border-slate-600">
                  <CardHeader>
                    <CardTitle className="dark:text-gray-100">Son İşlemler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length > 0 ? (
                      <div className="space-y-3">
                        {transactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-600 rounded-lg">
                            <div>
                              <p className="font-medium dark:text-gray-100">{transaction.description}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{transaction.category}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(transaction.date)}</p>
                            </div>
                            <div className={`text-lg font-semibold ${
                              transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">Henüz işlem bulunmuyor</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4">
                <Card className="dark:bg-slate-700 dark:border-slate-600">
                  <CardHeader>
                    <CardTitle className="dark:text-gray-100">Kullanıcı Aktiviteleri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userActivities.length > 0 ? (
                      <div className="space-y-3">
                        {userActivities.map((activity) => (
                          <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-600 rounded-lg">
                            <Activity className="h-4 w-4 text-blue-500" />
                            <div className="flex-1">
                              <p className="font-medium dark:text-gray-100">{activity.action}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(activity.timestamp)}</p>
                              {activity.ipAddress && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">IP: {activity.ipAddress}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 dark:text-gray-400 mb-2">Henüz aktivite bulunmuyor</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500">Kullanıcı aktiviteleri burada görünecek</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="moderation" className="space-y-4">
                <Card className="dark:bg-slate-700 dark:border-slate-600">
                  <CardHeader>
                    <CardTitle className="dark:text-gray-100">Ban/Timeout Geçmişi</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {banHistory.length > 0 ? (
                      <div className="space-y-3">
                        {banHistory.map((ban) => (
                          <div key={ban.id} className="p-3 border rounded-lg dark:border-slate-500">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge className={ban.type === 'ban' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'}>
                                  {ban.type === 'ban' ? 'Ban' : 'Timeout'}
                                </Badge>
                                <Badge className={ban.isActive ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'}>
                                  {ban.isActive ? 'Aktif' : 'Süresi Dolmuş'}
                                </Badge>
                              </div>
                              <span className="text-sm text-gray-500 dark:text-gray-400">{formatDate(ban.bannedAt)}</span>
                            </div>
                            <p className="text-sm dark:text-gray-300 mb-1">Sebep: {ban.reason}</p>
                            {ban.expiry && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">Bitiş: {formatDate(ban.expiry)}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">Henüz ban/timeout geçmişi bulunmuyor</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        ) : null}

        {/* Ban/Timeout Dialog */}
        {showBanDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">
                Kullanıcıyı {banType === 'ban' ? 'Banla' : 'Timeout\'a Al'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="ban-reason" className="dark:text-gray-200">Sebep</Label>
                  <Textarea
                    id="ban-reason"
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder={`${banType === 'ban' ? 'Ban' : 'Timeout'} sebebini açıklayın...`}
                    className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                  />
                </div>
                
                <div>
                  <Label htmlFor="ban-duration" className="dark:text-gray-200">Süre</Label>
                  <Select value={banDuration} onValueChange={setBanDuration}>
                    <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:border-slate-700">
                      <SelectItem value="15m" className="dark:text-gray-300">15 Dakika</SelectItem>
                      <SelectItem value="30m" className="dark:text-gray-300">30 Dakika</SelectItem>
                      <SelectItem value="1h" className="dark:text-gray-300">1 Saat</SelectItem>
                      <SelectItem value="6h" className="dark:text-gray-300">6 Saat</SelectItem>
                      <SelectItem value="12h" className="dark:text-gray-300">12 Saat</SelectItem>
                      <SelectItem value="1d" className="dark:text-gray-300">1 Gün</SelectItem>
                      <SelectItem value="3d" className="dark:text-gray-300">3 Gün</SelectItem>
                      <SelectItem value="7d" className="dark:text-gray-300">1 Hafta</SelectItem>
                      <SelectItem value="30d" className="dark:text-gray-300">1 Ay</SelectItem>
                      {banType === 'ban' && (
                        <SelectItem value="permanent" className="dark:text-gray-300">Kalıcı</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowBanDialog(false)
                    setBanReason('')
                  }}
                  className="flex-1 dark:border-slate-600 dark:text-gray-300"
                >
                  İptal
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleBanUser}
                  disabled={!banReason.trim() || processing}
                  className="flex-1"
                >
                  {processing ? 'İşleniyor...' : (banType === 'ban' ? 'Banla' : 'Timeout')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}