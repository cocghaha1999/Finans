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
import { User, Mail, Calendar, Activity, TrendingUp, Shield, Clock, AlertTriangle, Ban, UserX, History, Eye, MapPin, Globe, Smartphone, Lock } from "lucide-react"
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

interface UserDetailDialogProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated?: () => void
}

export function UserDetailDialog({ userId, open, onOpenChange, onUserUpdated }: UserDetailDialogProps) {
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

  useEffect(() => {
    if (userId && open) {
      fetchUserDetails(userId)
    }
  }, [userId, open])
    }
  }, [userId, open])

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
      
    } catch (err) {
      console.error('Kullanıcı detayları yüklenirken hata:', err)
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Bilgi yok'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
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

  const totalTransactions = transactions.length
  const totalAmount = transactions.reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            Kullanıcı Detayları
          </DialogTitle>
          <DialogDescription>
            Kullanıcı bilgileri ve aktivite geçmişi
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={() => userId && fetchUserDetails(userId)}>
              Tekrar Dene
            </Button>
          </div>
        ) : userData ? (
          <div className="space-y-6">
            {/* Kullanıcı Profil Kartı */}
            <Card>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={userData.photoURL} alt={userData.displayName || userData.email} />
                    <AvatarFallback className="text-lg">
                      {getInitials(userData.displayName, userData.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold">
                        {userData.displayName || 'İsimsiz Kullanıcı'}
                      </h3>
                      <Badge className={getRoleColor(userData.role)}>
                        <Shield className="h-3 w-3 mr-1" />
                        {userData.role || 'user'}
                      </Badge>
                      {userData.isActive && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Aktif
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{userData.email}</span>
                      {userData.emailVerified && (
                        <Badge variant="secondary" className="text-xs">
                          ✓ Doğrulanmış
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Kayıt Tarihi</p>
                    <p className="font-semibold text-sm">{formatDate(userData.createdAt)}</p>
                  </div>
                  <div className="text-center">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Son Giriş</p>
                    <p className="font-semibold text-sm">{formatDate(userData.lastLoginAt)}</p>
                  </div>
                  <div className="text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Toplam İşlem</p>
                    <p className="font-semibold text-sm">{totalTransactions}</p>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Net Bakiye</p>
                    <p className={`font-semibold text-sm ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(totalAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Son İşlemler */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Son İşlemler
                </CardTitle>
                <CardDescription>
                  Kullanıcının son 10 işlemi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((transaction, index) => (
                      <div key={transaction.id}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium">{transaction.description}</p>
                            <p className="text-sm text-muted-foreground">
                              {transaction.category} • {formatDate(transaction.date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${
                              transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                            </p>
                          </div>
                        </div>
                        {index < transactions.length - 1 && <Separator className="mt-3" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    Henüz işlem bulunmuyor
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}