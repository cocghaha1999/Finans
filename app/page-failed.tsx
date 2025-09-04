'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Activity, 
  ArrowUpRight, 
  Calculator, 
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  Target,
  BarChart3,
  Filter,
  Grid3X3,
  List,
  Calendar,
  ChevronRight,
  ChevronDown,
  Plus,
  Settings,
  Bell,
  Search,
  MoreVertical,
  Home,
  Banknote
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { listTransactions as getTransactions, addTransaction, upsertTransaction as updateTransaction, removeTransaction as deleteTransaction } from '@/lib/db'
import { useNotifications } from '@/lib/notifications'
import { useOfflineAuth as useAuth } from '@/hooks/use-offline-auth'
import { useSync } from '@/lib/sync-manager'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar, Legend } from 'recharts'
import type { Transaction, Notification as AppNotification } from '@/lib/types'
import { AddTransactionDialog } from '@/components/add-transaction-dialog'
import { SettingsDialog } from '@/components/settings-dialog'
import { NotificationCenter } from '@/components/notification-center'
import OfflineIndicator from '@/components/offline-indicator'
import { SyncStatusIndicator } from '@/components/sync-status-indicator'
import { SwipeableTransactionItem } from '@/components/swipeable-transaction-item'

const CHART_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#84cc16', '#f97316', '#06b6d4'
]

interface DashboardStats {
  totalBalance: number
  monthlyIncome: number
  monthlyExpenses: number
  savingsRate: number
  transactionCount: number
}

export default function FinanceDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, isOffline } = useAuth()
  
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [resetDay, setResetDay] = useState(1)
  const [isSyncing, setIsSyncing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedDateRange, setSelectedDateRange] = useState<string>('month')
  const [transactionSearch, setTransactionSearch] = useState('')
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false)
  const [transactionViewMode, setTransactionViewMode] = useState<'list' | 'grid'>('list')
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('month')
  const [showPredictions, setShowPredictions] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!isOffline) {
      checkSyncStatus()
    }
  }, [isOffline])

  const loadData = async () => {
    try {
      const [transactionsData, notificationsData] = await Promise.all([
        getTransactions(),
        getLocalNotifications()
      ])
      setTransactions(transactionsData)
      setNotifications(notificationsData)
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Hata",
        description: "Veriler yüklenirken bir hata oluştu",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const checkSyncStatus = async () => {
    try {
      setIsSyncing(true)
      const status = await getSyncStatus()
      if (status.hasChanges) {
        await loadData()
      }
    } catch (error) {
      console.error('Sync check failed:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTransaction = await addTransaction(transaction)
      setTransactions(prev => [newTransaction, ...prev])
      setShowAddDialog(false)
      toast({
        title: "Başarılı",
        description: "İşlem başarıyla eklendi",
      })
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast({
        title: "Hata",
        description: "İşlem eklenirken bir hata oluştu",
        variant: "destructive",
      })
    }
  }

  const handleEditTransaction = async (id: string, updates: Partial<Transaction>) => {
    try {
      const updatedTransaction = await updateTransaction(id, updates)
      setTransactions(prev => prev.map(t => t.id === id ? updatedTransaction : t))
      toast({
        title: "Başarılı",
        description: "İşlem başarıyla güncellendi",
      })
    } catch (error) {
      console.error('Error updating transaction:', error)
      toast({
        title: "Hata",
        description: "İşlem güncellenirken bir hata oluştu",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction(id)
      setTransactions(prev => prev.filter(t => t.id !== id))
      toast({
        title: "Başarılı",
        description: "İşlem başarıyla silindi",
      })
    } catch (error) {
      console.error('Error deleting transaction:', error)
      toast({
        title: "Hata",
        description: "İşlem silinirken bir hata oluştu",
        variant: "destructive",
      })
    }
  }

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
      persistLocalNotifications(updated as AppNotification[])
      return updated as AppNotification[]
    })
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(notif => notif.id !== id)
      if (updated.length > 0) {
        persistLocalNotifications(updated as AppNotification[])
        return updated as AppNotification[]
      } else {
        const emptyNotifications: AppNotification[] = []
        persistLocalNotifications(emptyNotifications)
        return emptyNotifications
      }
    })
  }

  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesCategory = selectedCategory === 'all' || transaction.category === selectedCategory
      const matchesSearch = transaction.description.toLowerCase().includes(transactionSearch.toLowerCase()) ||
                          transaction.category.toLowerCase().includes(transactionSearch.toLowerCase())
      
      const today = new Date()
      let matchesDateRange = true
      
      if (selectedDateRange === 'week') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesDateRange = new Date(transaction.date) >= weekAgo
      } else if (selectedDateRange === 'month') {
        const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
        matchesDateRange = new Date(transaction.date) >= monthAgo
      } else if (selectedDateRange === 'year') {
        const yearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
        matchesDateRange = new Date(transaction.date) >= yearAgo
      }
      
      return matchesCategory && matchesSearch && matchesDateRange
    })
  }, [transactions, selectedCategory, transactionSearch, selectedDateRange])

  const {
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlyData,
    expenseCategories,
    predictions,
    dailyExpenseData,
  } = useMemo(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    const dayOfMonth = today.getDate()
    const day = Math.min(Math.max(1, resetDay), 28)

    let start, end
    if (dayOfMonth >= day) {
      start = new Date(currentYear, currentMonth, day)
      end = new Date(currentYear, currentMonth + 1, day - 1)
    } else {
      start = new Date(currentYear, currentMonth - 1, day)
      end = new Date(currentYear, currentMonth, day - 1)
    }
    end.setHours(23, 59, 59, 999)

    const periodTransactions = transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })

    const monthlyIncome = periodTransactions
      .filter((t) => t.type === "gelir" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => acc + t.amount, 0)

    const monthlyExpenses = periodTransactions
      .filter((t) => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => acc + t.amount, 0)

    const totalBalance = transactions.reduce((acc, t) => {
      if (t.type === "gelir") return acc + t.amount
      if (t.type === "gider") return acc - t.amount
      return acc
    }, 0)

    const byCategory: Record<string, number> = periodTransactions
      .filter((t) => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = 0
        acc[t.category] += t.amount
        return acc
      }, {} as Record<string, number>)

    const expenseCategories = (Object.entries(byCategory) as [string, number][]) 
      .map(([name, value], i) => ({
        name,
        value: Number(value),
        percentage: monthlyExpenses > 0 ? Math.round((Number(value) / monthlyExpenses) * 100) : 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => a.value === b.value ? 0 : a.value < b.value ? 1 : -1)

    const startDate = new Date(currentYear, currentMonth - 11, 1)
    const endDate = new Date(currentYear, currentMonth + 1, 0)
    const last12MonthsTransactions = transactions.filter(t => {
      const date = new Date(t.date)
      return date >= startDate && date <= endDate
    })

    const monthlyData = Array.from({ length: 12 }, (_, i) => {
      const monthDate = new Date(currentYear, currentMonth - 11 + i, 1)
      const monthTransactions = last12MonthsTransactions.filter(t => {
        const date = new Date(t.date)
        return date.getFullYear() === monthDate.getFullYear() && 
               date.getMonth() === monthDate.getMonth()
      })

      const income = monthTransactions
        .filter(t => t.type === "gelir" && t.category !== "Eşitleme" && t.category !== "Devreden")
        .reduce((sum, t) => sum + t.amount, 0)
      
      const expenses = monthTransactions
        .filter(t => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden")
        .reduce((sum, t) => sum + t.amount, 0)

      return {
        month: monthDate.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
        gelir: income,
        gider: expenses,
        net: income - expenses
      }
    })

    const predictions = (() => {
      if (monthlyData.length < 3) return { nextMonthExpense: 0, trend: 'stable' as const }
      
      const recentExpenses = monthlyData.slice(-3).map(m => m.gider)
      const avgExpense = recentExpenses.reduce((sum, exp) => sum + exp, 0) / recentExpenses.length
      const trend = recentExpenses[2] > recentExpenses[0] ? 'increasing' as const : 
                   recentExpenses[2] < recentExpenses[0] ? 'decreasing' as const : 'stable' as const
      
      return { nextMonthExpense: avgExpense, trend }
    })()

    const dailyExpenses: Record<string, { amount: number; count: number }> = {}
    const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
    
    periodTransactions
      .filter(t => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .forEach(t => {
        const day = dayNames[new Date(t.date).getDay()]
        if (!dailyExpenses[day]) {
          dailyExpenses[day] = { amount: 0, count: 0 }
        }
        dailyExpenses[day].amount += t.amount
        dailyExpenses[day].count++
      })

    const dailyExpenseData: DailyExpense[] = [
      'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'
    ].map(day => ({
      day,
      amount: dailyExpenses[day]?.amount || 0,
      transactionCount: dailyExpenses[day]?.count || 0
    }))

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
      monthlyData,
      expenseCategories,
      predictions,
      dailyExpenseData,
    }
  }, [transactions, resetDay])

  const enhancedAnalytics = useMemo(() => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth()
    const dayOfMonth = today.getDate()
    const day = Math.min(Math.max(1, resetDay), 28)

    let start: Date
    if (dayOfMonth >= day) {
      start = new Date(currentYear, currentMonth, day)
    } else {
      start = new Date(currentYear, currentMonth - 1, day)
    }

    let end: Date
    if (dayOfMonth >= day) {
      end = new Date(currentYear, currentMonth + 1, day - 1)
    } else {
      end = new Date(currentYear, currentMonth, day - 1)
    }
    end.setHours(23, 59, 59, 999)

    const periodTransactions = transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })

    const currentMonthlyIncome = periodTransactions
      .filter((t) => t.type === "gelir" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => acc + t.amount, 0)

    const currentMonthlyExpenses = periodTransactions
      .filter((t) => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => acc + t.amount, 0)

    const byCategory: Record<string, number> = periodTransactions
      .filter((t) => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = 0
        acc[t.category] += t.amount
        return acc
      }, {} as Record<string, number>)

    const currentExpenseCategories = (Object.entries(byCategory) as [string, number][]) 
      .map(([name, value], i) => ({
        name,
        value: Number(value),
        percentage: currentMonthlyExpenses > 0 ? Math.round((Number(value) / currentMonthlyExpenses) * 100) : 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => a.value === b.value ? 0 : a.value < b.value ? 1 : -1)

    const topCategories = currentExpenseCategories.slice(0, 5)
    
    const weeklySpending = Array.from({ length: 7 }, (_, i) => {
      const weekTransactions = periodTransactions.filter(t => {
        const date = new Date(t.date)
        return date.getDay() === i && t.type === "gider" && t.category !== "Eşitleme"
      })
      return {
        day: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'][i],
        amount: weekTransactions.reduce((sum, t) => sum + t.amount, 0),
        count: weekTransactions.length
      }
    })

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dayTransactions = periodTransactions.filter(t => {
        const tDate = new Date(t.date)
        return tDate.toDateString() === date.toDateString()
      })
      return {
        date: date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
        income: dayTransactions.filter(t => t.type === 'gelir').reduce((sum, t) => sum + t.amount, 0),
        expense: dayTransactions.filter(t => t.type === 'gider').reduce((sum, t) => sum + t.amount, 0),
        count: dayTransactions.length
      }
    }).reverse()

    const expenseFrequency = currentExpenseCategories.map(cat => ({
      ...cat,
      frequency: periodTransactions.filter(t => t.category === cat.name && t.type === 'gider').length,
      avgAmount: cat.value / Math.max(1, periodTransactions.filter(t => t.category === cat.name && t.type === 'gider').length)
    }))

    const savingsRate = currentMonthlyIncome > 0 ? ((currentMonthlyIncome - currentMonthlyExpenses) / currentMonthlyIncome) * 100 : 0

    return {
      topCategories,
      weeklySpending,
      last7Days,
      expenseFrequency,
      savingsRate,
      totalTransactions: periodTransactions.length,
      avgDailyExpense: currentMonthlyExpenses / Math.max(1, new Date().getDate()),
      biggestExpense: Math.max(...periodTransactions.filter(t => t.type === 'gider').map(t => t.amount), 0),
      mostFrequentCategory: currentExpenseCategories[0]?.name || 'N/A'
    }
  }, [transactions, resetDay])

  const categories = useMemo(() => {
    const allCategories = Array.from(new Set(transactions.map(t => t.category)))
    return allCategories.filter(cat => cat !== 'Eşitleme' && cat !== 'Devreden')
  }, [transactions])

  const dashboardStats: DashboardStats = useMemo(() => ({
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0,
    transactionCount: transactions.length
  }), [totalBalance, monthlyIncome, monthlyExpenses, transactions.length])

  if (!user) {
    router.push('/login')
    return null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <div className="mr-4">
            <h1 className="text-xl font-semibold">Panel</h1>
          </div>
          
          <div className="ml-auto flex items-center space-x-4">
            <OfflineIndicator />
            <SyncStatusIndicator isSyncing={isSyncing} />
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowNotifications(true)}
              className="relative"
            >
              <Bell className="h-4 w-4" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Toplam Bakiye</p>
                  <p className="text-2xl font-bold">
                    ₺{totalBalance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <Wallet className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Aylık Gelir</p>
                  <p className="text-2xl font-bold">
                    ₺{monthlyIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100">Aylık Gider</p>
                  <p className="text-2xl font-bold">
                    ₺{monthlyExpenses.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-red-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Tasarruf Oranı</p>
                  <p className="text-2xl font-bold">
                    %{dashboardStats.savingsRate.toFixed(1)}
                  </p>
                </div>
                <Target className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Financial Analysis */}
        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border-indigo-200 dark:border-indigo-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Finans Analizi
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}
                className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100 dark:text-indigo-400 dark:hover:text-indigo-300 dark:hover:bg-indigo-900"
              >
                Detaylı Analiz
                {showAdvancedAnalytics ? <ChevronDown className="ml-1 h-4 w-4" /> : <ChevronRight className="ml-1 h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {showAdvancedAnalytics && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Calculator className="h-4 w-4 text-indigo-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Tasarruf Oranı</span>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    %{enhancedAnalytics.savingsRate.toFixed(1)}
                  </p>
                  <Progress value={Math.max(0, Math.min(100, enhancedAnalytics.savingsRate))} className="mt-2" />
                </div>
                
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Günlük Ort. Gider</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    ₺{enhancedAnalytics.avgDailyExpense.toFixed(0)}
                  </p>
                </div>
                
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">En Büyük Gider</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    ₺{enhancedAnalytics.biggestExpense.toFixed(0)}
                  </p>
                </div>
                
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-2">
                    <PieChart className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">En Çok Harcanan</span>
                  </div>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400 truncate">
                    {enhancedAnalytics.mostFrequentCategory}
                  </p>
                </div>
              </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Trend */}
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-4 backdrop-blur-sm">
                <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Aylık Trend</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: any, name: string) => [
                        `₺${Number(value).toLocaleString('tr-TR')}`,
                        name === 'gelir' ? 'Gelir' : name === 'gider' ? 'Gider' : 'Net'
                      ]}
                    />
                    <Area type="monotone" dataKey="gelir" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey="gider" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Category Distribution */}
              <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-4 backdrop-blur-sm">
                <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Kategori Dağılımı</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={expenseCategories.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {expenseCategories.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => [`₺${Number(value).toLocaleString('tr-TR')}`, 'Tutar']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {showAdvancedAnalytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Weekly Spending Pattern */}
                <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Haftalık Harcama Deseni</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={enhancedAnalytics.weeklySpending}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: any) => [`₺${Number(value).toLocaleString('tr-TR')}`, 'Harcama']} />
                      <Bar dataKey="amount" fill="url(#colorGradient)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.3}/>
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Recent 7 Days Trend */}
                <div className="bg-white/80 dark:bg-slate-800/80 rounded-lg p-4 backdrop-blur-sm">
                  <h4 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Son 7 Gün Trendi</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={enhancedAnalytics.last7Days}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99, 102, 241, 0.1)" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: any, name: string) => [
                        `₺${Number(value).toLocaleString('tr-TR')}`,
                        name === 'income' ? 'Gelir' : 'Gider'
                      ]} />
                      <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Enhanced Recent Transactions */}
        <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900 dark:to-gray-900 border-slate-200 dark:border-slate-700">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-gradient-to-r from-slate-600 to-gray-600 rounded-lg">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-xl">Son İşlemler</CardTitle>
                <Badge variant="secondary" className="ml-2">
                  {filteredTransactions.length}
                </Badge>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center space-x-2">
                  <Button
                    variant={transactionViewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionViewMode('list')}
                    className="px-3"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={transactionViewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTransactionViewMode('grid')}
                    className="px-3"
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="İşlem ara..."
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      className="pl-10 w-full sm:w-48"
                    />
                  </div>
                  
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder="Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger className="w-full sm:w-28">
                      <SelectValue placeholder="Tarih" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Hafta</SelectItem>
                      <SelectItem value="month">Ay</SelectItem>
                      <SelectItem value="year">Yıl</SelectItem>
                      <SelectItem value="all">Tümü</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Ekle
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <Banknote className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Henüz işlem yok</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">İlk işleminizi ekleyerek başlayın</p>
                <Button onClick={() => setShowAddDialog(true)} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600">
                  <Plus className="h-4 w-4 mr-2" />
                  İşlem Ekle
                </Button>
              </div>
            ) : (
              <div className={transactionViewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                : "space-y-2"
              }>
                {filteredTransactions.slice(0, 50).map((transaction) => (
                  <div key={transaction.id}>
                    {transactionViewMode === 'grid' ? (
                      <Card className="hover:shadow-lg transition-all duration-200 bg-gradient-to-r from-white to-gray-50 dark:from-slate-800 dark:to-slate-700 border-l-4"
                            style={{ borderLeftColor: transaction.type === 'gelir' ? '#10b981' : '#ef4444' }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <Badge 
                              variant={transaction.type === 'gelir' ? 'default' : 'destructive'}
                              className="text-xs px-2 py-1"
                            >
                              {transaction.category}
                            </Badge>
                            <MoreVertical className="h-4 w-4 text-gray-400 cursor-pointer hover:text-gray-600" />
                          </div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                            {transaction.description}
                          </h4>
                          <div className="flex justify-between items-end">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(transaction.date).toLocaleDateString('tr-TR')}
                            </span>
                            <span className={`text-lg font-bold ${
                              transaction.type === 'gelir' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {transaction.type === 'gelir' ? '+' : '-'}₺{transaction.amount.toLocaleString('tr-TR')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <SwipeableTransactionItem
                        transaction={transaction}
                        onEdit={(updates) => handleEditTransaction(transaction.id, updates)}
                        onDelete={() => handleDeleteTransaction(transaction.id)}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {filteredTransactions.length > 50 && (
              <div className="text-center mt-6">
                <Button variant="outline" onClick={() => router.push('/transactions')}>
                  Tüm İşlemleri Görüntüle ({filteredTransactions.length - 50} daha)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddTransactionDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddTransaction}
      />

      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        resetDay={resetDay}
        onResetDayChange={setResetDay}
      />

      <NotificationCenter
        open={showNotifications}
        onOpenChange={setShowNotifications}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
        onDismiss={dismissNotification}
      />
    </div>
  )
}
