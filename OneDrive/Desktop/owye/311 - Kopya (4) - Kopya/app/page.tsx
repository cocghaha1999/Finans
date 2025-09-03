"use client"

import "@/styles/enhancements.css"
import React, { useEffect, useMemo, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AddTransactionDialog, type TransactionType } from "@/components/add-transaction-dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatTRY, formatTRYCompact, formatDateTR } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useNotifications } from "@/lib/notifications"
import { useSync } from "@/lib/sync-manager"
import { isFirestoreReady, addTransaction as addTxnDb, upsertTransaction as upsertTxnDb, removeTransaction as removeTxnDb, addNotification, listSubscriptions, upsertSubscription, watchTransactions, addCardEntry, listRecurringIncomes, upsertRecurringIncome, getUserSettings, watchUserSettings } from "@/lib/db"
import type { Transaction } from "@/lib/types"
import { auth } from "@/lib/firebase"
import { AuthGuard } from "@/components/auth-guard"
import { NotesFloat } from "@/components/notes-float"
import { SubscriptionsDialog } from "@/components/subscriptions-dialog"
import { SwipeableTransactionItem } from "@/components/swipeable-transaction-item"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { FloatingActionButton } from "@/components/floating-action-button"
// import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, ScalePress } from "@/components/animations"
import { AnimatedCard, AnimatedCounter, LoadingSpinner } from "@/components/enhanced-animations"
import { useCalendar, type HighlightedDate } from "@/hooks/use-calendar-simple"
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
  LucidePieChart,
  Wallet,
  CreditCard,
  BarChart3,
  Target,
  Calendar,
  CalendarDays,
  Clock,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  RefreshCw,
  Eye,
  EyeOff,
  Star,
  AlertTriangle,
  CheckCircle,
  MoreHorizontal,
  TrendingUp as TrendingUpIcon,
  PieChart,
  Zap,
  Calculator,
  Receipt,
  MapPin,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar as CalendarIcon,
  Trash2,
} from "lucide-react"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
} from "recharts"

type MonthlyDatum = { month: string; gelir: number; gider: number; tasarruf: number }
type ExpenseCategoryDatum = { name: string; value: number; percentage: number; color: string }
type AppNotification = { id: string; title: string; description?: string; date: string; read: boolean }
type MonthlyPrediction = { month: string; tahminGelir: number; tahminGider: number; tahminTasarruf: number }
type DailyExpense = { day: string; amount: number; transactionCount: number }

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/98 backdrop-blur-md border-2 border-border rounded-lg p-4 shadow-xl">
        <p className="text-sm font-semibold text-foreground mb-3 border-b border-border pb-2">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium mb-1" style={{ color: entry.color }}>
            {`${entry.name}: ₺${entry.value.toLocaleString("tr-TR")}`}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [lastAddedDate, setLastAddedDate] = useState<string | null>(null)
  const [userId, setUserId] = useState<string>("")
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [activeChart, setActiveChart] = useState<"area" | "line" | "bar">("area")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<TransactionType>("gelir")
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [notesOpen, setNotesOpen] = useState(false)
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(false)
  const { openCalendar } = useCalendar()
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [desiredPeriodBalance, setDesiredPeriodBalance] = useState<string>("")
  const [reconcileOnly, setReconcileOnly] = useState(false)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"hepsi" | TransactionType>("hepsi")
  const [categoryFilter, setCategoryFilter] = useState<string>("hepsi")
  const [mounted, setMounted] = useState(false)
  const [resetDay, setResetDay] = useState<number>(1)
  const [isOnline, setIsOnline] = useState(true)
  
  // Enhanced UI states
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false)
  const [transactionViewMode, setTransactionViewMode] = useState<'list' | 'grid'>('list')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'amount-high' | 'amount-low'>('newest')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month')
  const [showPredictions, setShowPredictions] = useState(true)
  
  // carryover özelliği kaldırıldı
  const mainChartRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { createNotification } = useNotifications()

  useEffect(() => setMounted(true), [])

  // Çevrimiçi durumu takip et
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserId(user.uid)
      } else {
        setUserId("")
        // Load from local storage if not logged in
        try {
          const localTransactions = localStorage.getItem("transactions")
          if (localTransactions) {
            setTransactions(JSON.parse(localTransactions))
          }
          const localNotifications = localStorage.getItem("notifications")
          if (localNotifications) {
            setNotifications(JSON.parse(localNotifications))
          }
        } catch (e) {
          console.error("Failed to load from local storage", e)
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (userId && isFirestoreReady()) {
      const unsubTransactions = watchTransactions(userId, setTransactions)
      return () => { if (unsubTransactions) unsubTransactions() }
    }
  }, [userId])

  // Sync monthResetDay from Firestore settings (or localStorage for guests)
  useEffect(() => {
    if (userId && isFirestoreReady()) {
      const unsub = watchUserSettings(userId, (s) => {
        const d = Number((s as any)?.monthResetDay)
        if (Number.isFinite(d) && d >= 1 && d <= 31) setResetDay(d)
      })
      getUserSettings(userId).then((s) => {
        const d = Number((s as any)?.monthResetDay)
        if (Number.isFinite(d) && d >= 1 && d <= 31) setResetDay(d)
      }).catch(() => {})
      return () => { if (unsub) unsub() }
    } else {
      try {
        const raw = localStorage.getItem("settings")
        if (raw) {
          const s = JSON.parse(raw)
          const d = Number(s?.monthResetDay)
          if (Number.isFinite(d) && d >= 1 && d <= 31) setResetDay(d)
        }
      } catch {}
    }
  }, [userId])

  // When logged out, listen for local changes (e.g., Eşitle from Global Balance)
  useEffect(() => {
    const handler = () => {
      if (userId) return
      try {
        const raw = localStorage.getItem("transactions")
        if (raw) setTransactions(JSON.parse(raw))
      } catch {}
    }
    window.addEventListener("transactions:changed", handler)
    return () => window.removeEventListener("transactions:changed", handler)
  }, [userId])

  const persistLocalTransactions = (txns: Transaction[]) => {
    try {
      localStorage.setItem("transactions", JSON.stringify(txns))
    } catch (e) {
      console.error("Failed to persist transactions", e)
    }
  }

  const persistLocalNotifications = (notifs: AppNotification[]) => {
    try {
      localStorage.setItem("notifications", JSON.stringify(notifs))
    } catch (e) {
      console.error("Failed to persist notifications", e)
    }
  }

  const filteredTransactions = useMemo(() => {
    let list = [...transactions]
    if (typeFilter !== "hepsi") list = list.filter((t) => t.type === typeFilter)
    if (categoryFilter !== "hepsi") list = list.filter((t) => t.category === categoryFilter)
    if (reconcileOnly) list = list.filter((t) => t.category === "Eşitleme")
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
      )
    }
    
    // Sıralama
    return list.sort((a: any, b: any) => {
      switch (sortOrder) {
        case 'newest':
          const aC = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime()
          const bC = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime()
          return bC - aC
        case 'oldest':
          const aOld = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime()
          const bOld = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime()
          return aOld - bOld
        case 'amount-high':
          return b.amount - a.amount
        case 'amount-low':
          return a.amount - b.amount
        default:
          const aDef = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime()
          const bDef = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime()
          return bDef - aDef
      }
    })
  }, [transactions, search, typeFilter, categoryFilter, reconcileOnly, sortOrder])

  const openAddDialog = (type: TransactionType) => {
    setDialogType(type)
    setDialogOpen(true)
  }

  const openCalendarWithTransactions = () => {
    const events: HighlightedDate[] = []
    for (const t of transactions) {
      const d = new Date(t.date)
      if (isNaN(d.getTime())) continue
      events.push({
        date: d,
        type: t.type === "gelir" ? "income" : "expense",
        description: `${t.description} • ${formatTRY(Math.abs(t.amount))}`,
      })
    }
    if (lastAddedDate) {
      const nd = new Date(lastAddedDate)
      if (!isNaN(nd.getTime())) {
        events.push({ date: nd, type: "newlyAdded", description: "Yeni işlem eklendi" })
      }
    }
    openCalendar(events)
  }

  const onAdd = async (t: Transaction) => {
    setLastAddedDate(t.date)
    const newTransaction = { ...t, id: crypto.randomUUID(), createdAt: Date.now() }

    // Yerel olarak kaydet
    const updatedTransactions = [newTransaction, ...transactions]
    setTransactions(updatedTransactions)

    // Bildirim oluştur
    createNotification('transaction_alert', {
      type: t.type,
      amount: formatTRY(Math.abs(t.amount)),
      description: t.description
    }, 'low')

    if (userId && isOnline) {
      try {
        const id = await addTxnDb(userId, newTransaction)
        if (id) {
          // If marked as monthly recurring income, create/ensure a plan
          if ((t as any).__recurMonthly && t.type === "gelir") {
            const nextDate = (() => {
              const d = new Date(t.date)
              const n = new Date(d)
              n.setMonth(n.getMonth() + 1)
              return n.toISOString().slice(0, 10)
            })()
            await upsertRecurringIncome(userId, {
              description: t.description,
              amount: t.amount,
              category: t.category,
              nextDate,
              active: true,
            } as any)
          }
          // The watcher will update the state
          const title = t.type === "gelir" ? "Yeni Gelir" : "Yeni Gider"
          const desc = `${t.description} • ${formatTRY(Math.abs(t.amount))}`
          await addNotification(userId, { message: `${title}: ${desc}`, type: "info", read: false, timestamp: Date.now() })
          toast({ title, description: desc })
          // ensure header updates immediately
          try { window.dispatchEvent(new Event("transactions:refresh-request")) } catch {}
        }
      } catch (error) {
        console.error('Çevrimiçi işlem kaydedilirken hata:', error)
        toast({ 
          title: "Çevrimdışı Kayıt", 
          description: "İşlem yerel olarak kaydedildi, internet bağlantısı olduğunda senkronize edilecek",
          variant: "default"
        })
      }
    } else if (!userId) {
      // Kullanıcı giriş yapmamış, yerel storage kullan
      persistLocalTransactions(updatedTransactions)
      try { window.dispatchEvent(new Event("transactions:changed")) } catch {}
      
      const title = t.type === "gelir" ? "Yeni Gelir" : "Yeni Gider"
      const desc = `${t.description} • ${formatTRY(Math.abs(t.amount))}`
      setNotifications(prev => {
        const updated = [{ id: crypto.randomUUID(), title, description: desc, date: new Date().toISOString(), read: false }, ...prev]
        persistLocalNotifications(updated as AppNotification[])
        return updated as AppNotification[]
      })
      toast({ title, description: desc })
    } else {
      // Çevrimdışı durumda
      const title = t.type === "gelir" ? "Yeni Gelir (Çevrimdışı)" : "Yeni Gider (Çevrimdışı)"
      const desc = `${t.description} • ${formatTRY(Math.abs(t.amount))}`
      toast({ 
        title, 
        description: `${desc} - İnternet bağlantısı olduğunda senkronize edilecek`,
        variant: "default"
      })
    }
  }

  const onUpdate = async (t: Transaction) => {
    // Önce yerel olarak güncelle
    setTransactions(prev => {
      const updated = prev.map((p) => (p.id === t.id ? t : p))
      return updated
    })

    if (userId && t.id && isOnline) {
      try {
        await upsertTxnDb(userId, t)
        // The watcher will update the state
        const title = t.type === "gelir" ? "Gelir Güncellendi" : "Gider Güncellendi"
        const desc = `${t.description} • ${formatTRY(Math.abs(t.amount))}`
        await addNotification(userId, { message: `${title}: ${desc}`, type: "info", read: false, timestamp: Date.now() })
        toast({ title, description: desc })
        try { window.dispatchEvent(new Event("transactions:refresh-request")) } catch {}
      } catch (error) {
        console.error('İşlem güncellenirken hata:', error)
        toast({ 
          title: "Çevrimdışı Güncelleme", 
          description: "İşlem yerel olarak güncellendi, internet bağlantısı olduğunda senkronize edilecek"
        })
      }
    } else {
      setTransactions(prev => {
        const updated = prev.map((p) => (p.id === t.id ? t : p))
        persistLocalTransactions(updated)
  try { window.dispatchEvent(new Event("transactions:changed")) } catch {}
        return updated
      })
  const title = t.type === "gelir" ? "Gelir Güncellendi" : "Gider Güncellendi"
  const desc = `${t.description} • ${formatTRY(Math.abs(t.amount))}`
  setNotifications(prev => {
        const updated = [{ id: crypto.randomUUID(), title, description: desc, date: new Date().toISOString(), read: false }, ...prev]
        persistLocalNotifications(updated as AppNotification[])
        return updated as AppNotification[]
      })
      toast({ title, description: desc })
    }
  }

  const onDelete = async (id: string) => {
    const deleted = transactions.find((x) => x.id === id)
    
    // Önce yerel olarak sil
    setTransactions(prev => {
      const updated = prev.filter((p) => p.id !== id)
      return updated
    })

    if (userId && isOnline) {
      try {
        await removeTxnDb(userId, id)
        // The watcher will update the state
        try { window.dispatchEvent(new Event("transactions:refresh-request")) } catch {}
      } catch (error) {
        console.error('İşlem silinirken hata:', error)
        toast({ 
          title: "Çevrimdışı Silme", 
          description: "İşlem yerel olarak silindi, internet bağlantısı olduğunda senkronize edilecek"
        })
      }
    }
    
    if (deleted) {
      const title = deleted.type === "gelir" ? "Gelir Silindi" : "Gider Silindi"
      const desc = `${deleted.description} • ${formatTRY(Math.abs(deleted.amount))}`
      if (userId && isOnline) {
        await addNotification(userId, { message: `${title}: ${desc}`, type: "info", read: false, timestamp: Date.now() })
      } else {
        setNotifications(prev => {
          const updated = [{ id: crypto.randomUUID(), title, description: desc, date: new Date().toISOString(), read: false }, ...prev]
          persistLocalNotifications(updated as AppNotification[])
          return updated as AppNotification[]
        })
      }
    }
  }

  // LocalStorage temizleme fonksiyonu
  const clearLocalStorageData = () => {
    try {
      localStorage.removeItem("transactions")
      localStorage.removeItem("notifications")
      setTransactions([])
      setNotifications([])
      toast({
        title: "Temizlendi",
        description: "Tüm yerel veriler temizlendi"
      })
    } catch (e) {
      console.error("LocalStorage temizlenirken hata:", e)
    }
  }

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

  // carryover kaldırıldı
  const periodCarryover = 0

    const monthlyIncome = periodTransactions
      .filter((t) => t.type === "gelir" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => acc + t.amount, 0)

    const monthlyExpenses = periodTransactions
      .filter((t) => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => acc + t.amount, 0)

  const totalBalance = periodTransactions.reduce((acc, t) => acc + (t.type === "gelir" ? t.amount : -t.amount), 0)

    const monthlyData: MonthlyDatum[] = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(currentYear, i, 1).toLocaleString("tr-TR", { month: "long" })
      const monthTransactions = transactions.filter((t) => {
        const d = new Date(t.date)
        return d.getFullYear() === currentYear && d.getMonth() === i
      })
  const gelir = monthTransactions.filter((t) => t.type === "gelir" && t.category !== "Eşitleme" && t.category !== "Devreden").reduce((acc, t) => acc + t.amount, 0)
  const gider = monthTransactions.filter((t) => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden").reduce((acc, t) => acc + t.amount, 0)
      return { month, gelir, gider, tasarruf: gelir - gider }
    })

    const byCategory: Record<string, number> = periodTransactions
      .filter((t) => t.type === "gider" && t.category !== "Eşitleme" && t.category !== "Devreden")
      .reduce((acc, t) => {
        if (!acc[t.category]) acc[t.category] = 0
        acc[t.category] += t.amount
        return acc
      }, {} as Record<string, number>)

    const expenseCategories: ExpenseCategoryDatum[] = (Object.entries(byCategory) as [string, number][]) 
      .map(([name, value], i) => ({
        name,
        value: Number(value),
        percentage: monthlyExpenses > 0 ? Math.round((Number(value) / monthlyExpenses) * 100) : 0,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => a.value === b.value ? 0 : a.value < b.value ? 1 : -1)

    // Gelecek 3 ay için tahmini gelir-gider hesaplama
    const lastMonthData = monthlyData[monthlyData.length - 1]
    const avgIncome = monthlyData.reduce((sum, m) => sum + m.gelir, 0) / Math.max(monthlyData.length, 1)
    const avgExpense = monthlyData.reduce((sum, m) => sum + m.gider, 0) / Math.max(monthlyData.length, 1)
    
    const predictions: MonthlyPrediction[] = []
    const now = new Date()
    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const month = futureDate.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })
      const tahminGelir = Math.round(avgIncome * (0.95 + Math.random() * 0.1)) // ±5% varyasyon
      const tahminGider = Math.round(avgExpense * (0.95 + Math.random() * 0.1)) // ±5% varyasyon
      predictions.push({
        month,
        tahminGelir,
        tahminGider,
        tahminTasarruf: tahminGelir - tahminGider
      })
    }

    // Bu ayın günlük harcama dağılımı
    const currentMonthTransactions = periodTransactions.filter(t => 
      t.type === "gider" && 
      t.category !== "Eşitleme" && 
      t.category !== "Devreden"
    )
    
    const dailyExpenses: Record<string, { amount: number; count: number }> = {}
    currentMonthTransactions.forEach(t => {
      const day = new Date(t.date).toLocaleDateString('tr-TR', { weekday: 'long' })
      if (!dailyExpenses[day]) dailyExpenses[day] = { amount: 0, count: 0 }
      dailyExpenses[day].amount += t.amount
      dailyExpenses[day].count += 1
    })

    const dailyExpenseData = [
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

  // Enhanced Analytics - separate useMemo to avoid hooks rule violation
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

    // Top spending categories
    const topCategories = currentExpenseCategories.slice(0, 5)
    
    // Weekly spending pattern
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

    // Recent transaction trends (last 7 days)
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

    // Expense frequency analysis
    const expenseFrequency = currentExpenseCategories.map(cat => ({
      ...cat,
      frequency: periodTransactions.filter(t => t.category === cat.name && t.type === 'gider').length,
      avgAmount: cat.value / Math.max(1, periodTransactions.filter(t => t.category === cat.name && t.type === 'gider').length)
    }))

    // Savings rate
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

  // Track threshold alert once per day via localStorage (persists across reloads)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("settings")
      if (!raw) return
      const s = JSON.parse(raw)
  const threshold = Number(s?.expenseAlertThreshold)
      const notificationsEnabled = s?.notifications !== false
  const triggerOnEqual = Boolean(s?.expenseAlertTriggerOnEqual)
  const realertOnThresholdChange = Boolean(s?.expenseAlertRealertOnThresholdChange)
      if (!notificationsEnabled) return
      if (!isFinite(threshold) || threshold <= 0) return
      // Determine current period and day keys
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth()
      const dayOfMonth = now.getDate()
      let start: Date
      if (dayOfMonth >= resetDay) {
        start = new Date(currentYear, currentMonth, resetDay)
      } else {
        start = new Date(currentYear, currentMonth - 1, resetDay)
      }
      const periodKey = start.toISOString().slice(0, 10)
      const dayKey = now.toISOString().slice(0, 10)

      const exceeded = triggerOnEqual ? monthlyExpenses >= threshold : monthlyExpenses > threshold
      if (exceeded) {
        // Check last alert record to prevent repeats within the same day
  let last: { periodKey: string; dayKey: string; threshold: number } | null = null
  try { last = JSON.parse(localStorage.getItem("expenseThresholdAlert") || "null") } catch {}
  const sameDay = !!last && last.periodKey === periodKey && last.dayKey === dayKey
  const alreadyAlertedToday = sameDay ? (realertOnThresholdChange ? last!.threshold === threshold : true) : false
        if (!alreadyAlertedToday) {
        const title = "Aylık gider eşiği aşıldı"
          const cmp = triggerOnEqual ? "≥" : ">"
          const desc = `Bu ay: ${formatTRY(monthlyExpenses)} (${cmp} ${formatTRY(threshold)})`
        if (userId) {
          addNotification(userId, { message: `${title}: ${desc}`, type: "alert", read: false, timestamp: Date.now() })
        } else {
          setNotifications(prev => {
            const updated = [{ id: crypto.randomUUID(), title, description: desc, date: new Date().toISOString(), read: false }, ...prev]
            persistLocalNotifications(updated as AppNotification[])
            return updated as AppNotification[]
          })
        }
        toast({ title, description: desc })
          try { localStorage.setItem("expenseThresholdAlert", JSON.stringify({ periodKey, dayKey, threshold })) } catch {}
        }
      }
    } catch {}
  }, [monthlyExpenses, userId, toast])

  useEffect(() => {
    const id = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50)
    return () => window.clearTimeout(id)
  }, [activeChart])

  useEffect(() => {
    if (!mounted) return
    const t1 = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 50)
    const t2 = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 250)
    const t3 = window.setTimeout(() => window.dispatchEvent(new Event("resize")), 750)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [mounted])

  useEffect(() => {
    const run = async () => {
      if (!userId || !isFirestoreReady()) return
      try {
        const subs = await listSubscriptions(userId)
        if (!Array.isArray(subs) || subs.length === 0) return
        const today = new Date()
        for (const sub of subs) {
          if (sub.nextBillingDate) {
            const due = new Date(sub.nextBillingDate)
            const d0 = new Date(due.getFullYear(), due.getMonth(), due.getDate())
            const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            if (d0 <= t0) {
              // Sadece bilgilendirme/hatırlatıcı: gider ekleme
              await addNotification(userId, { message: `Abonelik günü: ${sub.name} • ${formatTRY(Number(sub.price)||0)}`, type: "reminder", read: false, timestamp: Date.now() })
              const next = new Date(t0)
              next.setMonth(next.getMonth() + 1)
              await upsertSubscription(userId, { ...sub, nextBillingDate: next.toISOString() })
            }
          }
          if (sub.cancellationReminderDate) {
            const remind = new Date(sub.cancellationReminderDate)
            const r0 = new Date(remind.getFullYear(), remind.getMonth(), remind.getDate())
            const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            if (r0 <= t0) {
              await addNotification(userId, {
                message: `Abonelik İptal Hatırlatıcı: ${sub.name} aboneliğini iptal etmek istiyor musunuz?`,
                type: "reminder",
                read: false,
                timestamp: Date.now(),
              })
              await upsertSubscription(userId, { ...sub, cancellationReminderDate: undefined })
            }
          }
        }
      } catch {}
    }
    run()
    const onFocus = () => run()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [userId])

  // Runner: recurring incomes (daily)
  useEffect(() => {
    const run = async () => {
      if (!userId || !isFirestoreReady()) return
      try {
        const list = await listRecurringIncomes(userId)
        if (!Array.isArray(list) || list.length === 0) return
        const today = new Date()
        const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        for (const r of list) {
          if ((r as any).active === false) continue
          const due = r.nextDate ? new Date(r.nextDate) : null
          if (!due) continue
          const d0 = new Date(due.getFullYear(), due.getMonth(), due.getDate())
          if (d0 <= t0) {
            const txn = { type: "gelir" as const, amount: Number(r.amount) || 0, description: r.description, category: r.category, date: t0.toISOString().slice(0,10) }
            await onAdd(txn as any)
            const next = new Date(t0)
            next.setMonth(next.getMonth() + 1)
            await upsertRecurringIncome(userId, { ...r, nextDate: next.toISOString().slice(0,10) } as any)
          }
        }
      } catch {}
    }
    run()
    const onFocus = () => run()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [userId])

  const yTick = (value: number) => formatTRYCompact(value)

  const renderMainChart = () => {
    const chartProps = { data: monthlyData, margin: { top: 10, right: 30, left: 0, bottom: 0 } }
    const grid = <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
    const xAxis = <XAxis dataKey="month" tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 2 }} />
    const yAxis = <YAxis tick={{ fill: "hsl(var(--foreground))", fontSize: 12, fontWeight: 500 }} axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 2 }} tickFormatter={yTick} />
    const tooltip = <RechartsTooltip content={<CustomTooltip />} />
    const legend = <Legend />

    if (activeChart === "area") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart {...chartProps}>
            <defs>
              <linearGradient id="gelirGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="giderGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="tasarrufGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.8} />
                <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            {grid}{xAxis}{yAxis}{tooltip}{legend}
            <Area type="monotone" dataKey="gelir" stroke="#16a34a" fillOpacity={1} fill="url(#gelirGradient)" strokeWidth={3} name="Gelir" />
            <Area type="monotone" dataKey="gider" stroke="#dc2626" fillOpacity={1} fill="url(#giderGradient)" strokeWidth={3} name="Gider" />
            <Area type="monotone" dataKey="tasarruf" stroke="hsl(var(--chart-3))" fillOpacity={1} fill="url(#tasarrufGradient)" strokeWidth={3} name="Tasarruf" />
          </AreaChart>
        </ResponsiveContainer>
      )
    }
    if (activeChart === "line") {
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...chartProps}>
            {grid}{xAxis}{yAxis}{tooltip}{legend}
            <Line type="monotone" dataKey="gelir" stroke="#16a34a" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Gelir" />
            <Line type="monotone" dataKey="gider" stroke="#dc2626" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Gider" />
            <Line type="monotone" dataKey="tasarruf" stroke="hsl(var(--chart-3))" strokeWidth={4} dot={{ r: 5 }} activeDot={{ r: 7 }} name="Tasarruf" />
          </LineChart>
        </ResponsiveContainer>
      )
    }
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...chartProps}>
          {grid}{xAxis}{yAxis}{tooltip}{legend}
          <Bar dataKey="gelir" fill="#16a34a" name="Gelir" radius={[4, 4, 0, 0]} />
          <Bar dataKey="gider" fill="#dc2626" name="Gider" radius={[4, 4, 0, 0]} />
          <Bar dataKey="tasarruf" fill="hsl(var(--chart-3))" name="Tasarruf" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <FadeIn>
          <main className="container mx-auto px-4 py-8 space-y-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Finansal Dashboard</h1>
                  <p className="text-sm text-muted-foreground mt-1">Aylık gelir, gider ve tasarruf analizi</p>
                </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                {/* Takvim açma butonu sadece ana navigasyonda olacak */}
                <ScalePress>
                  <Button onClick={() => openAddDialog("gelir")} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white">
                    <Plus className="w-5 h-5 mr-2" /> Gelir Ekle
                  </Button>
                </ScalePress>
                <ScalePress>
                  <Button onClick={() => openAddDialog("gider")} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white">
                    <Minus className="w-5 h-5 mr-2" /> Gider Ekle
                  </Button>
                </ScalePress>
              </div>
            </div>
            </FadeIn>

          <StaggerContainer>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StaggerItem>
                <ScalePress>
                  <FadeIn>
                    <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Toplam Bakiye</CardTitle>
                        <Wallet className="h-4 w-4 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl font-bold text-foreground">{formatTRY(totalBalance)}</div>
                          <Popover open={reconcileOpen} onOpenChange={setReconcileOpen}>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline">Eşitle</Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-80 space-y-3">
                              <div className="space-y-2">
                    <Label>Cebimdeki Gerçek Para (₺)</Label>
                    <Input value={desiredPeriodBalance} onChange={(e) => setDesiredPeriodBalance(e.target.value)} inputMode="decimal" type="text" />
                                <p className="text-[11px] text-muted-foreground">Buraya cüzdandaki/paradaki güncel tutarı yaz. Sistem fark kadar otomatik Gelir/Gider (Eşitleme) ekler.</p>
                                <Button size="sm" variant="secondary" onClick={async () => {
                                  const parseAmount = (raw: string): number => {
                                    if (!raw) return NaN
                      const s = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
                                    const n = Number(s)
                                    return n
                                  }
                                  const val = parseAmount(desiredPeriodBalance)
                                  if (!isFinite(val)) return
                                  const delta = val - totalBalance
                                  if (delta !== 0) {
                                    const desc = `${delta > 0 ? 'Bakiye Eşitleme (Gelir)' : 'Bakiye Eşitleme (Gider)'} • Fark: ${formatTRY(Math.abs(delta))}`
                                    const t = { type: delta > 0 ? 'gelir' : 'gider', amount: Math.abs(delta), description: desc, category: 'Eşitleme', date: new Date().toISOString().slice(0,10) }
                                    await onAdd(t as any)
                                  }
                                  setReconcileOpen(false)
                                }}>Eldeki Paraya Eşitle</Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex items-center space-x-1 text-sm text-muted-foreground mt-1">
                          <span>Güncel bakiye</span>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </ScalePress>
              </StaggerItem>
              
              <StaggerItem>
                <ScalePress>
                  <FadeIn>
                    <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Aylık Gelir</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">{formatTRY(monthlyIncome)}</div>
                        <p className="text-sm text-muted-foreground mt-1">Bu ayki toplam gelir</p>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </ScalePress>
              </StaggerItem>
              
              <StaggerItem>
                <ScalePress>
                  <FadeIn>
                    <Card className="bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Aylık Gider</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">{formatTRY(monthlyExpenses)}</div>
                        <p className="text-sm text-muted-foreground mt-1">Bu ayki toplam gider</p>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </ScalePress>
              </StaggerItem>
              
              <StaggerItem>
                <ScalePress>
                  <FadeIn>
                    <Card className="bg-gradient-to-br from-chart-3/20 to-chart-3/5 border-chart-3/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tasarruf</CardTitle>
                        <Target className="h-4 w-4 text-chart-3" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">{formatTRY(monthlyIncome - monthlyExpenses)}</div>
                        <p className="text-sm text-muted-foreground mt-1">Bu ayki tasarruf</p>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </ScalePress>
              </StaggerItem>
            </section>
          </StaggerContainer>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SlideUp delay={0.1}>
              <Card className="lg:col-span-2 border-border/50 min-w-0 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        <span>Gelişmiş Finansal Analiz</span>
                      </CardTitle>
                      <CardDescription>Detaylı gelir, gider ve trend analizi</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ScalePress>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}
                        >
                          {showAdvancedAnalytics ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </ScalePress>
                      <ScalePress><Button variant={activeChart === "area" ? "default" : "outline"} size="sm" onClick={() => setActiveChart("area")}>Alan</Button></ScalePress>
                      <ScalePress><Button variant={activeChart === "line" ? "default" : "outline"} size="sm" onClick={() => setActiveChart("line")}>Çizgi</Button></ScalePress>
                      <ScalePress><Button variant={activeChart === "bar" ? "default" : "outline"} size="sm" onClick={() => setActiveChart("bar")}>Çubuk</Button></ScalePress>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0">
                  {/* Main Chart */}
                  <div ref={mainChartRef} className="h-80 w-full min-w-0 mb-6">
                    {mounted ? renderMainChart() : <div className="flex items-center justify-center h-full"><BarChart3 className="h-16 w-16 text-muted-foreground animate-pulse" /></div>}
                  </div>

                  {/* Enhanced Analytics Panel */}
                  {showAdvancedAnalytics && (
                    <FadeIn>
                      <div className="border-t pt-6 space-y-6">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUpIcon className="h-4 w-4 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">Tasarruf Oranı</span>
                            </div>
                            <p className="text-lg font-bold text-green-800">{enhancedAnalytics.savingsRate.toFixed(1)}%</p>
                          </div>

                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity className="h-4 w-4 text-blue-600" />
                              <span className="text-xs text-blue-700 font-medium">Toplam İşlem</span>
                            </div>
                            <p className="text-lg font-bold text-blue-800">{enhancedAnalytics.totalTransactions}</p>
                          </div>

                          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-4 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Calculator className="h-4 w-4 text-orange-600" />
                              <span className="text-xs text-orange-700 font-medium">Günlük Ort.</span>
                            </div>
                            <p className="text-lg font-bold text-orange-800">{formatTRYCompact(enhancedAnalytics.avgDailyExpense)}</p>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-2">
                              <Star className="h-4 w-4 text-purple-600" />
                              <span className="text-xs text-purple-700 font-medium">En Büyük</span>
                            </div>
                            <p className="text-lg font-bold text-purple-800">{formatTRYCompact(enhancedAnalytics.biggestExpense)}</p>
                          </div>
                        </div>

                        {/* Weekly Spending Pattern */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            Haftalık Harcama Dağılımı
                          </h4>
                          <div className="grid grid-cols-7 gap-2">
                            {enhancedAnalytics.weeklySpending.map((day, index) => {
                              const maxAmount = Math.max(...enhancedAnalytics.weeklySpending.map(d => d.amount))
                              const percentage = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0
                              return (
                                <div key={index} className="text-center">
                                  <div className="h-16 flex items-end justify-center mb-2">
                                    <div 
                                      className="w-6 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500"
                                      style={{ height: `${Math.max(4, percentage)}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-xs font-medium">{day.day.slice(0, 3)}</div>
                                  <div className="text-xs text-muted-foreground">{formatTRYCompact(day.amount)}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Top Categories */}
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <PieChart className="h-4 w-4 text-primary" />
                            En Çok Harcama Yapılan Kategoriler
                          </h4>
                          <div className="space-y-2">
                            {enhancedAnalytics.topCategories.map((category, index) => (
                              <div key={category.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-3">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }}></div>
                                  <span className="font-medium">{category.name}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">{formatTRY(category.value)}</div>
                                  <div className="text-xs text-muted-foreground">{category.percentage}%</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  )}
                </CardContent>
              </Card>
            </SlideUp>
            
            <SlideUp delay={0.2}>
              <Card className="border-border/50 min-w-0 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    <span>Tahmini Gelir-Gider</span>
                  </CardTitle>
                  <CardDescription>Gelecek 3 ay tahmini</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictions.map((prediction, index) => (
                      <div key={prediction.month} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border border-border/30">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <Calendar className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{prediction.month}</div>
                            <div className="text-xs text-muted-foreground">Tahmin</div>
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex items-center space-x-4 text-xs">
                            <span className="text-green-600">Gelir: {formatTRYCompact(prediction.tahminGelir)}</span>
                            <span className="text-red-600">Gider: {formatTRYCompact(prediction.tahminGider)}</span>
                          </div>
                          <div className={`text-sm font-bold ${prediction.tahminTasarruf >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {prediction.tahminTasarruf >= 0 ? '+' : ''}{formatTRYCompact(prediction.tahminTasarruf)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </SlideUp>

            <SlideUp delay={0.3}>
              <Card className="border-border/50 min-w-0 hover:shadow-xl transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarDays className="h-5 w-5 text-blue-500" />
                    <span>Günlük Harcama Dağılımı</span>
                  </CardTitle>
                  <CardDescription>Bu ayki günlere göre harcamalar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dailyExpenseData.map((dayData) => {
                      const maxAmount = Math.max(...dailyExpenseData.map(d => d.amount))
                      const widthPercentage = maxAmount > 0 ? (dayData.amount / maxAmount) * 100 : 0
                      
                      return (
                        <div key={dayData.day} className="relative">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                            <div className="flex items-center space-x-3 min-w-0">
                              <div className="w-2 h-8 rounded-full bg-gradient-to-t from-blue-600 to-blue-400" 
                                   style={{ height: `${Math.max(8, widthPercentage / 4)}px` }}></div>
                              <div>
                                <div className="font-medium text-sm">{dayData.day}</div>
                                <div className="text-xs text-muted-foreground">
                                  {dayData.transactionCount} işlem
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-red-600">
                                {dayData.amount > 0 ? formatTRYCompact(dayData.amount) : '-'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {widthPercentage.toFixed(0)}%
                              </div>
                            </div>
                          </div>
                          {widthPercentage > 0 && (
                            <div 
                              className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                              style={{ width: `${widthPercentage}%` }}
                            ></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </SlideUp>
          </section>

          <SlideUp delay={0.3}>
            <Card className="border-border/50 hover:shadow-xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-primary" />
                    <span>Gelişmiş Son İşlemler</span>
                    <Badge variant="outline" className="ml-2">
                      {filteredTransactions.length} işlem
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <ScalePress>
                      <Button 
                        variant={transactionViewMode === 'grid' ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setTransactionViewMode('grid')}
                      >
                        <PieChart className="h-4 w-4" />
                      </Button>
                    </ScalePress>
                    <ScalePress>
                      <Button 
                        variant={transactionViewMode === 'list' ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setTransactionViewMode('list')}
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                    </ScalePress>
                    <ScalePress>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4" />
                            <span className="hidden sm:inline">Sırala</span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56" align="end">
                          <div className="space-y-2">
                            <h4 className="font-semibold text-sm">Sıralama</h4>
                            <div className="space-y-1">
                              <Button
                                variant={sortOrder === 'newest' ? 'default' : 'ghost'}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setSortOrder('newest')}
                              >
                                <ArrowDown className="h-4 w-4 mr-2" />
                                Yeniden Eskiye
                              </Button>
                              <Button
                                variant={sortOrder === 'oldest' ? 'default' : 'ghost'}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setSortOrder('oldest')}
                              >
                                <ArrowUp className="h-4 w-4 mr-2" />
                                Eskiden Yeniye
                              </Button>
                              <Button
                                variant={sortOrder === 'amount-high' ? 'default' : 'ghost'}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setSortOrder('amount-high')}
                              >
                                <ArrowDown className="h-4 w-4 mr-2" />
                                Tutar (Yüksek→Düşük)
                              </Button>
                              <Button
                                variant={sortOrder === 'amount-low' ? 'default' : 'ghost'}
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => setSortOrder('amount-low')}
                              >
                                <ArrowUp className="h-4 w-4 mr-2" />
                                Tutar (Düşük→Yüksek)
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </ScalePress>
                    <ScalePress>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={clearLocalStorageData}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Temizle</span>
                      </Button>
                    </ScalePress>
                    <ScalePress><Button variant={reconcileOnly ? "default" : "outline"} size="sm" onClick={() => setReconcileOnly((v) => !v)}>Sadece Eşitleme</Button></ScalePress>
                  </div>
                </CardTitle>
                <CardDescription className="flex items-center justify-between">
                  <span>En son yapılan finansal işlemler ve detaylı analiz</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <TrendingUpIcon className="h-3 w-3 text-green-500" />
                      <span>{filteredTransactions.filter(t => t.type === 'gelir').length} gelir</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingDown className="h-3 w-3 text-red-500" />
                      <span>{filteredTransactions.filter(t => t.type === 'gider').length} gider</span>
                    </div>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enhanced Filters */}
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                  <FadeIn delay={0.1}>
                    <Input 
                      placeholder="İşlem ara..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)} 
                      className="h-9 w-48 md:w-64" 
                    />
                  </FadeIn>
                  <FadeIn delay={0.2}>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                      <SelectTrigger className="h-9 w-28">
                        <SelectValue placeholder="Tür" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hepsi">Tüm Türler</SelectItem>
                        <SelectItem value="gelir">💰 Gelir</SelectItem>
                        <SelectItem value="gider">💸 Gider</SelectItem>
                      </SelectContent>
                    </Select>
                  </FadeIn>
                  <FadeIn delay={0.3}>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-9 w-36">
                        <SelectValue placeholder="Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hepsi">Tüm Kategoriler</SelectItem>
                        {Array.from(new Set(transactions.map((t) => t.category))).map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FadeIn>
                  <FadeIn delay={0.4}>
                    <Select value={selectedTimeframe} onValueChange={(v) => setSelectedTimeframe(v as any)}>
                      <SelectTrigger className="h-9 w-28">
                        <SelectValue placeholder="Süre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">Bu Hafta</SelectItem>
                        <SelectItem value="month">Bu Ay</SelectItem>
                        <SelectItem value="year">Bu Yıl</SelectItem>
                      </SelectContent>
                    </Select>
                  </FadeIn>
                </div>

                {/* Quick Stats for Transactions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-green-700 font-medium">Toplam Gelir</span>
                    </div>
                    <p className="text-lg font-bold text-green-800">
                      {formatTRYCompact(filteredTransactions.filter(t => t.type === 'gelir').reduce((sum, t) => sum + t.amount, 0))}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 to-rose-50 p-3 rounded-lg border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-red-700 font-medium">Toplam Gider</span>
                    </div>
                    <p className="text-lg font-bold text-red-800">
                      {formatTRYCompact(filteredTransactions.filter(t => t.type === 'gider').reduce((sum, t) => sum + t.amount, 0))}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-blue-700 font-medium">Son 7 Gün</span>
                    </div>
                    <p className="text-lg font-bold text-blue-800">
                      {enhancedAnalytics.last7Days.reduce((sum, d) => sum + d.expense, 0).toLocaleString('tr-TR')}₺
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-3 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="h-4 w-4 text-purple-600" />
                      <span className="text-xs text-purple-700 font-medium">Ortalama</span>
                    </div>
                    <p className="text-lg font-bold text-purple-800">
                      {filteredTransactions.length > 0 ? formatTRYCompact(filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length) : '0₺'}
                    </p>
                  </div>
                </div>

                <PullToRefresh 
                  onRefresh={async () => {
                    if (isOnline && userId) {
                      window.location.reload()
                    }
                  }}
                  className="max-h-96"
                >
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12">
                      <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">Henüz işlem bulunmuyor.</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Filtreleri değiştirin veya yeni işlem ekleyin.
                      </p>
                    </div>
                  ) : (
                    <div className={transactionViewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-3" : "space-y-2"}>
                      {filteredTransactions.slice(0, 20).map((transaction) => (
                        <SwipeableTransactionItem
                          key={transaction.id}
                          transaction={transaction}
                          onEdit={(t) => {
                            setEditing(t)
                            setDialogType(t.type)
                            setDialogOpen(true)
                          }}
                          onDelete={(t) => onDelete(t.id)}
                        />
                      ))}
                    </div>
                  )}
                  
                  {filteredTransactions.length > 20 && (
                    <div className="text-center mt-4 p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        {filteredTransactions.length - 20} işlem daha var. Daha fazla görmek için filtreleyin.
                      </p>
                    </div>
                  )}
                </PullToRefresh>
              </CardContent>
            </Card>
          </SlideUp>
          </main>
        </FadeIn>

        <AddTransactionDialog open={dialogOpen} onOpenChange={(v) => { if (!v) setEditing(null); setDialogOpen(v); }} onAdd={(t) => { onAdd(t); setEditing(null); }} onUpdate={(t) => { onUpdate(t); setEditing(null); }} editing={editing} defaultType={dialogType} />
        <SubscriptionsDialog open={subscriptionsOpen} onOpenChange={setSubscriptionsOpen} />
        <NotesFloat open={notesOpen} onClose={() => setNotesOpen(false)} />
        <FloatingActionButton 
          onAddIncome={() => {
            setDialogType("gelir")
            setDialogOpen(true)
          }}
          onAddExpense={() => {
            setDialogType("gider")
            setDialogOpen(true)
          }}
        />
        {/* <SyncStatusIndicator /> */}
      </div>
    </AuthGuard>
  )
}
