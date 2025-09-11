"use client"

import "@/styles/enhancements.css"
import React, { useEffect, useMemo, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { AddTransactionDialog, type TransactionType } from "@/components/add-transaction-dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatTRY, formatTRYCompact, formatDateTR, safeJsonParse, safeLocalStorage } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { useNotifications } from "@/lib/notifications"
import { useSync } from "@/lib/sync-manager"
import { AuthGuard, useAuth } from "@/components/auth-guard"
import { isFirestoreReady, addTransaction as addTxnDb, upsertTransaction as upsertTxnDb, removeTransaction as removeTxnDb, addNotification, listSubscriptions, upsertSubscription, watchTransactions, addCardEntry, listRecurringIncomes, upsertRecurringIncome, removeRecurringIncome, getUserSettings, watchUserSettings } from "@/lib/db"
import type { Transaction } from "@/lib/types"
import { auth } from "@/lib/firebase"
import { NotesFloat } from "@/components/notes-float"
import { SubscriptionsDialog } from "@/components/subscriptions-dialog"
import { SwipeableTransactionItem } from "@/components/swipeable-transaction-item"
import { PullToRefresh } from "@/components/pull-to-refresh"
import { FloatingActionButton } from "@/components/floating-action-button"
// import { SyncStatusIndicator } from "@/components/sync-status-indicator"
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, ScalePress } from "@/components/animations"
import { ApkDownload } from "@/components/apk-download"
import { MobileDownloadModal } from "@/components/mobile-download-modal"
import { PWAInstallBanner } from "@/components/pwa-install-banner"
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
  ArrowUpLeft,
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
  Edit,
  Download,
  Smartphone,
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
  const { toast } = useToast()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [lastAddedDate, setLastAddedDate] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [recurringIncomes, setRecurringIncomes] = useState<any[]>([])
  const [activeChart, setActiveChart] = useState<"area" | "line" | "bar">("area")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogType, setDialogType] = useState<TransactionType>("gelir")
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [editingRecurringIncome, setEditingRecurringIncome] = useState<any | null>(null)
  const [recurringIncomeDialogOpen, setRecurringIncomeDialogOpen] = useState(false)
  const [recurringIncomeForm, setRecurringIncomeForm] = useState({
    description: "",
    amount: "",
    category: "Maaş",
    active: true,
  })
  const [notesOpen, setNotesOpen] = useState(false)
  const [subscriptionsOpen, setSubscriptionsOpen] = useState(false)
  const { openCalendar, addCalendarEvent } = useCalendar()
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [desiredPeriodBalance, setDesiredPeriodBalance] = useState<string>("")
  const [reconcileOnly, setReconcileOnly] = useState(false)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"hepsi" | TransactionType>("hepsi")
  const [categoryFilter, setCategoryFilter] = useState<string>("hepsi")
  const [mounted, setMounted] = useState(false)
  const [resetDay, setResetDay] = useState<number>(1)
  const [isOnline, setIsOnline] = useState(true)
  const [mobileDownloadOpen, setMobileDownloadOpen] = useState(false)
  
  // Enhanced UI states
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false)
  const [transactionViewMode, setTransactionViewMode] = useState<'list' | 'grid'>('list')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'amount-high' | 'amount-low'>('newest')
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'year'>('month')
  const [showPredictions, setShowPredictions] = useState(true)
  
  // carryover özelliği kaldırıldı
  const mainChartRef = useRef<HTMLDivElement>(null)
  const { createNotification } = useNotifications()

  useEffect(() => {
    setMounted(true)
    
    // Debug: Global localStorage cleanup function
    if (typeof window !== 'undefined') {
      (window as any).debugClearLocalStorage = () => {
        console.log('Clearing localStorage for debugging...')
        try {
          const storage = safeLocalStorage()
          const keys = ['transactions', 'notifications', 'settings', 'expenseThresholdAlert']
          keys.forEach(key => {
            console.log(`Removing ${key}:`, storage.getItem(key))
            storage.removeItem(key)
          })
          console.log('localStorage cleared successfully')
          window.location.reload()
        } catch (e) {
          console.error('Error clearing localStorage:', e)
        }
      }
      console.log('Debug function available: window.debugClearLocalStorage()')
    }
  }, [])

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
        // User is signed in - we can access user.uid directly
      } else {
        // Load from local storage if not logged in
        try {
          const storage = safeLocalStorage()
          const localTransactions = storage.getItem("transactions")
          if (localTransactions) {
            setTransactions(safeJsonParse(localTransactions, []))
          }
          const localNotifications = storage.getItem("notifications")
          if (localNotifications) {
            setNotifications(safeJsonParse(localNotifications, []))
          }
        } catch (e) {
          console.error("Failed to load from local storage", e)
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (user?.uid && isFirestoreReady()) {
      const unsubTransactions = watchTransactions(user?.uid, setTransactions)
      return () => { if (unsubTransactions) unsubTransactions() }
    }
  }, [user])

  // Load recurring incomes
  useEffect(() => {
    const loadRecurringIncomes = async () => {
      if (user?.uid && isFirestoreReady()) {
        try {
          const incomes = await listRecurringIncomes(user?.uid)
          setRecurringIncomes(incomes || [])
        } catch (error) {
          console.error("Failed to load recurring incomes:", error)
        }
      }
    }
    loadRecurringIncomes()
  }, [user])

  // Sync monthResetDay from Firestore settings (or localStorage for guests)
  useEffect(() => {
    if (user?.uid && isFirestoreReady()) {
      const unsub = watchUserSettings(user?.uid, (s) => {
        const d = Number((s as any)?.monthResetDay)
        if (Number.isFinite(d) && d >= 1 && d <= 31) setResetDay(d)
      })
      getUserSettings(user?.uid).then((s) => {
        const d = Number((s as any)?.monthResetDay)
        if (Number.isFinite(d) && d >= 1 && d <= 31) setResetDay(d)
      }).catch(() => {})
      return () => { if (unsub) unsub() }
    } else {
      try {
        const storage = safeLocalStorage()
        const raw = storage.getItem("settings")
        if (raw) {
          const s = safeJsonParse<any>(raw, {})
          const d = Number(s?.monthResetDay)
          if (Number.isFinite(d) && d >= 1 && d <= 31) setResetDay(d)
        }
      } catch {}
    }
  }, [user])

  // When logged out, listen for local changes (e.g., Eşitle from Global Balance)
  useEffect(() => {
    const handler = () => {
      if (user?.uid) return
      try {
        const storage = safeLocalStorage()
        const raw = storage.getItem("transactions")
        if (raw) setTransactions(safeJsonParse(raw, []))
      } catch {}
    }
    window.addEventListener("transactions:changed", handler)
    return () => window.removeEventListener("transactions:changed", handler)
  }, [user])

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

  const deleteRecurringIncome = async (incomeId: string) => {
    if (!incomeId) return
    
    try {
      if (user?.uid && isFirestoreReady()) {
        await removeRecurringIncome(user?.uid, incomeId)
        // Firestore'dan veri yeniden yüklenecek
        const incomes = await listRecurringIncomes(user?.uid)
        setRecurringIncomes(incomes || [])
        
        toast({
          title: "Başarılı",
          description: "Tekrarlı gelir silindi.",
        })
      }
    } catch (error) {
      console.error("Failed to delete recurring income:", error)
      toast({
        title: "Hata",
        description: "Tekrarlı gelir silinirken bir hata oluştu.",
        variant: "destructive",
      })
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
    console.log("onAdd called with:", t) // Debug log
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

    // Takvime ekle
    addCalendarEvent({
      date: new Date(t.date),
      type: t.type === 'gelir' ? 'income' : 'expense',
      description: `${t.description} • ₺${Math.abs(t.amount).toLocaleString("tr-TR")}`,
      amount: Math.abs(t.amount),
      title: t.description,
      category: t.category
    })

    if (user?.uid && isOnline) {
      try {
        const id = await addTxnDb(user?.uid, newTransaction)
        if (id) {
          // If marked as monthly recurring income, create/ensure a plan
          if ((t as any).__recurMonthly && t.type === "gelir") {
            console.log("Creating recurring income:", t) // Debug log
            const nextDate = (() => {
              const d = new Date(t.date)
              const n = new Date(d)
              n.setMonth(n.getMonth() + 1)
              return n.toISOString().slice(0, 10)
            })()
            await upsertRecurringIncome(user?.uid, {
              description: t.description,
              amount: t.amount,
              category: t.category,
              nextDate,
              active: true,
            } as any)
            // Refresh recurring incomes
            const incomes = await listRecurringIncomes(user?.uid)
            setRecurringIncomes(incomes || [])
            console.log("Recurring income created, updated list") // Debug log
          }
          // The watcher will update the state
          const title = t.type === "gelir" ? "Yeni Gelir" : "Yeni Gider"
          const desc = `${t.description} • ${formatTRY(Math.abs(t.amount))}`
          await addNotification(user?.uid, { message: `${title}: ${desc}`, type: "info", read: false, timestamp: Date.now() })
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
    } else if (!user?.uid) {
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

    if (user?.uid && t.id && isOnline) {
      try {
        await upsertTxnDb(user?.uid, t)
        // The watcher will update the state
        const title = t.type === "gelir" ? "Gelir Güncellendi" : "Gider Güncellendi"
        const desc = `${t.description} • ${formatTRY(Math.abs(t.amount))}`
        await addNotification(user?.uid, { message: `${title}: ${desc}`, type: "info", read: false, timestamp: Date.now() })
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

    if (user?.uid && isOnline) {
      try {
        await removeTxnDb(user?.uid, id)
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
      if (user?.uid && isOnline) {
        await addNotification(user?.uid, { message: `${title}: ${desc}`, type: "info", read: false, timestamp: Date.now() })
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
      const storage = safeLocalStorage()
      // Clear specific keys to avoid clearing auth data
      const keysToRemove = ['transactions', 'notifications', 'settings', 'expenseThresholdAlert']
      keysToRemove.forEach(key => {
        console.log(`Removing ${key}:`, storage.getItem(key))
        storage.removeItem(key)
      })
      
      // Reset state
      setTransactions([])
      setNotifications([])
      
      // Dispatch events to update other components
      try {
        window.dispatchEvent(new Event("transactions:changed"))
      } catch (e) {
        console.warn('Failed to dispatch event:', e)
      }
      
      toast({
        title: "Temizlendi",
        description: "Tüm yerel veriler temizlendi.",
      })
    } catch (e) {
      console.error("LocalStorage temizlenirken hata:", e)
      toast({
        title: "Hata",
        description: "Veriler temizlenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  const {
    totalBalance,
    previousBalance,
    periodBalance,
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

  // Kümülatif bakiye hesaplama - Tüm işlemleri dahil et (önceki aylardan devredenler de)
  const totalBalance = transactions.reduce((acc, t) => acc + (t.type === "gelir" ? t.amount : -t.amount), 0)
  
  // Sadece bu dönem işlemleri
  const periodBalance = periodTransactions.reduce((acc, t) => acc + (t.type === "gelir" ? t.amount : -t.amount), 0)
  
  // Önceki dönemden kalan bakiye
  const previousBalance = totalBalance - periodBalance

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
      previousBalance,
      periodBalance,
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
      const s = safeJsonParse(raw, {} as any)
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
  try { last = safeJsonParse(localStorage.getItem("expenseThresholdAlert") || "null", null as any) } catch {}
  const sameDay = !!last && last.periodKey === periodKey && last.dayKey === dayKey
  const alreadyAlertedToday = sameDay ? (realertOnThresholdChange ? last!.threshold === threshold : true) : false
        if (!alreadyAlertedToday) {
        const title = "Aylık gider eşiği aşıldı"
          const cmp = triggerOnEqual ? "≥" : ">"
          const desc = `Bu ay: ${formatTRY(monthlyExpenses)} (${cmp} ${formatTRY(threshold)})`
        if (user?.uid) {
          addNotification(user?.uid, { message: `${title}: ${desc}`, type: "alert", read: false, timestamp: Date.now() })
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
  }, [monthlyExpenses, user?.uid, toast])

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
      if (!user?.uid || !isFirestoreReady()) return
      try {
        const subs = await listSubscriptions(user?.uid)
        if (!Array.isArray(subs) || subs.length === 0) return
        const today = new Date()
        for (const sub of subs) {
          if (sub.nextBillingDate) {
            const due = new Date(sub.nextBillingDate)
            const d0 = new Date(due.getFullYear(), due.getMonth(), due.getDate())
            const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            if (d0 <= t0) {
              // Sadece bilgilendirme/hatırlatıcı: gider ekleme
              await addNotification(user?.uid, { message: `Abonelik günü: ${sub.name} • ${formatTRY(Number(sub.price)||0)}`, type: "reminder", read: false, timestamp: Date.now() })
              const next = new Date(t0)
              next.setMonth(next.getMonth() + 1)
              await upsertSubscription(user?.uid, { ...sub, nextBillingDate: next.toISOString() })
            }
          }
          if (sub.cancellationReminderDate) {
            const remind = new Date(sub.cancellationReminderDate)
            const r0 = new Date(remind.getFullYear(), remind.getMonth(), remind.getDate())
            const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate())
            if (r0 <= t0) {
              await addNotification(user?.uid, {
                message: `Abonelik İptal Hatırlatıcı: ${sub.name} aboneliğini iptal etmek istiyor musunuz?`,
                type: "reminder",
                read: false,
                timestamp: Date.now(),
              })
              await upsertSubscription(user?.uid, { ...sub, cancellationReminderDate: undefined })
            }
          }
        }
      } catch {}
    }
    run()
    const onFocus = () => run()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [user])

  // Runner: recurring incomes (daily)
  useEffect(() => {
    const run = async () => {
      if (!user?.uid || !isFirestoreReady()) return
      try {
        const list = await listRecurringIncomes(user?.uid)
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
            await upsertRecurringIncome(user?.uid, { ...r, nextDate: next.toISOString().slice(0,10) } as any)
          }
        }
      } catch {}
    }
    run()
    const onFocus = () => run()
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [user])

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
        {/* PWA Install Banner */}
        <PWAInstallBanner />
        
        <FadeIn>
          <main className="container mx-auto px-4 py-8 space-y-8">
            <FadeIn>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Finansal Dashboard</h1>
                  <p className="text-sm text-muted-foreground mt-1">Aylık gelir, gider ve tasarruf analizi</p>
                </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
                {/* APK Download button - Available for all screen sizes */}
                <div>
                  <Button 
                    onClick={() => setMobileDownloadOpen(true)}
                    variant="outline" 
                    size="sm"
                    className="w-full sm:w-auto border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Mobil Uygulama İndir</span>
                    <span className="sm:hidden">Uygulama İndir</span>
                  </Button>
                </div>
                
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
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-6">
              <StaggerItem>
                <ScalePress>
                  <FadeIn>
                    <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                        <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Toplam Bakiye</CardTitle>
                        <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                      </CardHeader>
                      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                          <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">{formatTRY(totalBalance)}</div>
                          <Popover open={reconcileOpen} onOpenChange={setReconcileOpen}>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="outline" className="text-xs">Eşitle</Button>
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
                          <span>Kümülatif bakiye</span>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                </ScalePress>
              </StaggerItem>
              
              <StaggerItem>
                <ScalePress>
                  <FadeIn>
                    <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Önceki Dönem</CardTitle>
                        <ArrowUpLeft className="h-4 w-4 text-blue-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">{formatTRY(previousBalance)}</div>
                        <p className="text-sm text-muted-foreground mt-1">Devir bakiye</p>
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

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
            <SlideUp delay={0.1}>
              <Card className="border-border/50 min-w-0 hover:shadow-xl transition-all duration-300 h-fit">
                <CardHeader className="px-3 sm:px-6 pt-3 sm:pt-6 pb-3 sm:pb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                        <span className="text-sm sm:text-base">Gelişmiş Finansal Analiz</span>
                      </CardTitle>
                      <CardDescription className="text-xs sm:text-sm">Detaylı gelir, gider ve trend analizi</CardDescription>
                    </div>
                    <div className="flex items-center flex-wrap gap-1 sm:gap-2">
                      <ScalePress>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowAdvancedAnalytics(!showAdvancedAnalytics)}
                          className="text-xs px-2 py-1"
                        >
                          {showAdvancedAnalytics ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        </Button>
                      </ScalePress>
                      <ScalePress><Button variant={activeChart === "area" ? "default" : "outline"} size="sm" onClick={() => setActiveChart("area")} className="text-xs px-2 py-1">Alan</Button></ScalePress>
                      <ScalePress><Button variant={activeChart === "line" ? "default" : "outline"} size="sm" onClick={() => setActiveChart("line")} className="text-xs px-2 py-1">Çizgi</Button></ScalePress>
                      <ScalePress><Button variant={activeChart === "bar" ? "default" : "outline"} size="sm" onClick={() => setActiveChart("bar")} className="text-xs px-2 py-1">Çubuk</Button></ScalePress>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="min-w-0 px-3 sm:px-6 pb-3 sm:pb-6">
                  {/* Main Chart */}
                  <div ref={mainChartRef} className="h-48 sm:h-64 w-full min-w-0 mb-4">
                    {mounted ? renderMainChart() : <div className="flex items-center justify-center h-full"><BarChart3 className="h-12 w-12 sm:h-16 sm:w-16 text-muted-foreground animate-pulse" /></div>}
                  </div>

                  {/* Enhanced Analytics Panel */}
                  {showAdvancedAnalytics && (
                    <FadeIn>
                      <div className="border-t pt-4 space-y-4">
                        {/* Quick Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-2 sm:p-3 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUpIcon className="h-3 w-3 text-green-600" />
                              <span className="text-xs text-green-700 font-medium">Tasarruf Oranı</span>
                            </div>
                            <p className="text-sm sm:text-base font-bold text-green-800">{enhancedAnalytics.savingsRate.toFixed(1)}%</p>
                          </div>

                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Activity className="h-3 w-3 text-blue-600" />
                              <span className="text-xs text-blue-700 font-medium">Toplam İşlem</span>
                            </div>
                            <p className="text-sm sm:text-base font-bold text-blue-800">{enhancedAnalytics.totalTransactions}</p>
                          </div>

                          <div className="bg-gradient-to-br from-orange-50 to-red-50 p-2 sm:p-3 rounded-lg border border-orange-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Calculator className="h-3 w-3 text-orange-600" />
                              <span className="text-xs text-orange-700 font-medium">Günlük Ort.</span>
                            </div>
                            <p className="text-sm sm:text-base font-bold text-orange-800">{formatTRYCompact(enhancedAnalytics.avgDailyExpense)}</p>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-2 sm:p-3 rounded-lg border border-purple-200">
                            <div className="flex items-center gap-2 mb-1">
                              <Star className="h-3 w-3 text-purple-600" />
                              <span className="text-xs text-purple-700 font-medium">En Büyük</span>
                            </div>
                            <p className="text-sm sm:text-base font-bold text-purple-800">{formatTRYCompact(enhancedAnalytics.biggestExpense)}</p>
                          </div>
                        </div>

                        {/* Weekly Spending Pattern */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                            <CalendarIcon className="h-3 w-3 text-primary" />
                            Haftalık Harcama
                          </h4>
                          <div className="grid grid-cols-7 gap-1">
                            {enhancedAnalytics.weeklySpending.map((day, index) => {
                              const maxAmount = Math.max(...enhancedAnalytics.weeklySpending.map(d => d.amount))
                              const percentage = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0
                              return (
                                <div key={index} className="text-center">
                                  <div className="h-8 sm:h-10 flex items-end justify-center mb-1">
                                    <div 
                                      className="w-2 sm:w-3 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all duration-500"
                                      style={{ height: `${Math.max(4, percentage)}%` }}
                                    ></div>
                                  </div>
                                  <div className="text-[10px] sm:text-xs text-muted-foreground">{day.day.slice(0, 2)}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Top Categories */}
                        <div>
                          <h4 className="font-medium mb-2 flex items-center gap-2 text-sm">
                            <PieChart className="h-3 w-3 text-primary" />
                            Top Kategoriler
                          </h4>
                          <div className="space-y-2">
                            {enhancedAnalytics.topCategories.slice(0, 3).map((category, index) => (
                              <div key={category.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }}></div>
                                  <span className="text-xs sm:text-sm font-medium">{category.name}</span>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold">{formatTRYCompact(category.value)}</div>
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
              <Card className="border-border/50 min-w-0 hover:shadow-xl transition-all duration-300 h-fit">
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
              <Card className="border-border/50 hover:shadow-xl transition-all duration-300 h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-5 w-5 text-green-500" />
                      <span>Aylık Tekrarlı Gelirler</span>
                      <Badge variant="outline" className="ml-2">
                        {recurringIncomes.length} gelir
                      </Badge>
                    </div>
                    <ScalePress>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDialogType("gelir")
                          setDialogOpen(true)
                        }}
                        className="text-green-500 hover:text-green-400 hover:bg-green-500/10 border-green-500/30"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Ekle
                      </Button>
                    </ScalePress>
                  </CardTitle>
                  <CardDescription>Otomatik olarak eklenen sabit gelirleriniz</CardDescription>
                </CardHeader>
                <CardContent>
                  {recurringIncomes.length > 0 ? (
                    <div className="space-y-3">
                      {recurringIncomes.map((income, index) => (
                        <div key={income.id || index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/60 hover:bg-muted/70 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <DollarSign className="h-5 w-5 text-foreground" />
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{income.description || 'İsimsiz Gelir'}</div>
                              <div className="text-sm text-muted-foreground">{income.category || 'Genel'}</div>
                              <div className="text-xs text-muted-foreground">
                                Sonraki: {income.nextDate ? formatDateTR(income.nextDate) : 'Belirsiz'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="text-lg font-bold text-green-500">
                                +{formatTRY(income.amount || 0)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {income.active !== false ? (
                                  <Badge variant="outline" className="text-green-500 border-green-500/30">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Aktif
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground">
                                    Pasif
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-1">
                              <ScalePress>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setEditingRecurringIncome(income)
                                    setRecurringIncomeDialogOpen(true)
                                  }}
                                  className="h-8 w-8 p-0 hover:bg-muted"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </ScalePress>
                              <ScalePress>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteRecurringIncome(income.id)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </ScalePress>
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border/60">
                        <div className="flex items-center space-x-2 text-foreground">
                          <Activity className="h-4 w-4" />
                          <span className="text-sm font-medium">Aylık Toplam Gelir Beklentisi</span>
                        </div>
                        <div className="text-xl font-bold text-green-500 mt-1">
                          +{formatTRY(recurringIncomes.filter(r => r.active !== false).reduce((sum, income) => sum + (income.amount || 0), 0))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                        <RefreshCw className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">Henüz tekrarlı gelir yok</h3>
                      <p className="text-muted-foreground mb-4">
                        Maaş, kira geliri gibi düzenli gelirlerinizi ekleyerek otomatik takip edin.
                      </p>
                      <Button 
                        onClick={() => {
                          setDialogType("gelir")
                          setDialogOpen(true)
                        }}
                        className="inline-flex items-center space-x-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span>İlk Geliri Ekle</span>
                      </Button>
                    </div>
                  )}
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
                  <div className="flex gap-1 sm:gap-2">
                    <ScalePress>
                      <Button 
                        variant={transactionViewMode === 'grid' ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setTransactionViewMode('grid')}
                        className="h-7 sm:h-8 px-2"
                      >
                        <PieChart className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </ScalePress>
                    <ScalePress>
                      <Button 
                        variant={transactionViewMode === 'list' ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setTransactionViewMode('list')}
                        className="h-7 sm:h-8 px-2"
                      >
                        <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </ScalePress>
                    <ScalePress>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1 sm:gap-2 h-7 sm:h-8 px-2">
                            <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline text-xs">Sırala</span>
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
                        className="flex items-center gap-1 sm:gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 h-7 sm:h-8 px-2"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline text-xs">Temizle</span>
                      </Button>
                    </ScalePress>
                    <ScalePress>
                      <Button 
                        variant={reconcileOnly ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setReconcileOnly((v) => !v)}
                        className="h-7 sm:h-8 px-2 text-xs"
                      >
                        <span className="hidden sm:inline">Sadece Eşitleme</span>
                        <span className="sm:hidden">Eşit</span>
                      </Button>
                    </ScalePress>
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
                <div className="flex flex-wrap gap-1 sm:gap-2 p-2 sm:p-3 bg-muted/30 rounded-lg">
                  <FadeIn delay={0.1}>
                    <Input 
                      placeholder="İşlem ara..." 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)} 
                      className="h-8 sm:h-9 w-32 sm:w-48 md:w-64 text-xs sm:text-sm" 
                    />
                  </FadeIn>
                  <FadeIn delay={0.2}>
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                      <SelectTrigger className="h-8 sm:h-9 w-20 sm:w-28 text-xs sm:text-sm">
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
                      <SelectTrigger className="h-8 sm:h-9 w-24 sm:w-36 text-xs sm:text-sm">
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
                      <SelectTrigger className="h-8 sm:h-9 w-20 sm:w-28 text-xs sm:text-sm">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                      <span className="text-xs text-muted-foreground font-medium">Toplam Gelir</span>
                    </div>
                    <p className="text-sm sm:text-lg font-bold text-green-500">
                      {formatTRYCompact(filteredTransactions.filter(t => t.type === 'gelir').reduce((sum, t) => sum + t.amount, 0))}
                    </p>
                  </div>

                  <div className="bg-muted/30 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                      <span className="text-xs text-muted-foreground font-medium">Toplam Gider</span>
                    </div>
                    <p className="text-sm sm:text-lg font-bold text-red-500">
                      {formatTRYCompact(filteredTransactions.filter(t => t.type === 'gider').reduce((sum, t) => sum + t.amount, 0))}
                    </p>
                  </div>

                  <div className="bg-muted/30 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                      <span className="text-xs text-muted-foreground font-medium">Son 7 Gün</span>
                    </div>
                    <p className="text-sm sm:text-lg font-bold text-blue-500">
                      {enhancedAnalytics.last7Days.reduce((sum, d) => sum + d.expense, 0).toLocaleString('tr-TR')}₺
                    </p>
                  </div>

                  <div className="bg-muted/30 p-3 rounded-lg border border-border/60 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Calculator className="h-4 w-4 text-purple-500" />
                      <span className="text-xs text-muted-foreground font-medium">Ortalama</span>
                    </div>
                    <p className="text-lg font-bold text-purple-500">
                      {filteredTransactions.length > 0 ? formatTRYCompact(filteredTransactions.reduce((sum, t) => sum + t.amount, 0) / filteredTransactions.length) : '0₺'}
                    </p>
                  </div>
                </div>

                <PullToRefresh 
                  onRefresh={async () => {
                    if (isOnline && user?.uid) {
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
                    <div className={transactionViewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3" : "space-y-2"}>
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
        
        {/* Recurring Income Dialog */}
        <Dialog open={recurringIncomeDialogOpen} onOpenChange={(open) => {
          setRecurringIncomeDialogOpen(open)
          if (!open) {
            setEditingRecurringIncome(null)
            setRecurringIncomeForm({
              description: "",
              amount: "",
              category: "Maaş",
              active: true,
            })
          } else if (editingRecurringIncome) {
            setRecurringIncomeForm({
              description: editingRecurringIncome.description || "",
              amount: String(editingRecurringIncome.amount || ""),
              category: editingRecurringIncome.category || "Maaş",
              active: editingRecurringIncome.active !== false,
            })
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingRecurringIncome ? "Tekrarlı Geliri Düzenle" : "Yeni Tekrarlı Gelir"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Açıklama</Label>
                <Input
                  id="description"
                  placeholder="Maaş, kira geliri vb."
                  value={recurringIncomeForm.description}
                  onChange={(e) => setRecurringIncomeForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="amount">Tutar (₺)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={recurringIncomeForm.amount}
                  onChange={(e) => setRecurringIncomeForm(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="category">Kategori</Label>
                <Select value={recurringIncomeForm.category} onValueChange={(value) => setRecurringIncomeForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maaş">Maaş</SelectItem>
                    <SelectItem value="Serbest">Serbest Çalışma</SelectItem>
                    <SelectItem value="Kira">Kira Geliri</SelectItem>
                    <SelectItem value="Yatırım">Yatırım Geliri</SelectItem>
                    <SelectItem value="Diğer">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={recurringIncomeForm.active}
                  onChange={(e) => setRecurringIncomeForm(prev => ({ ...prev, active: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="active">Aktif</Label>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setRecurringIncomeDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={async () => {
                try {
                  if (!recurringIncomeForm.description.trim() || !recurringIncomeForm.amount) {
                    toast({
                      title: "Hata",
                      description: "Lütfen tüm alanları doldurun.",
                      variant: "destructive",
                    })
                    return
                  }
                  
                  const incomeData = {
                    id: editingRecurringIncome?.id,
                    description: recurringIncomeForm.description.trim(),
                    amount: Number(recurringIncomeForm.amount),
                    category: recurringIncomeForm.category,
                    active: recurringIncomeForm.active,
                    nextDate: new Date().toISOString().split('T')[0], // Today's date
                  }
                  
                  if (user?.uid && isFirestoreReady()) {
                    await upsertRecurringIncome(user?.uid, incomeData)
                    const incomes = await listRecurringIncomes(user?.uid)
                    setRecurringIncomes(incomes || [])
                    
                    toast({
                      title: "Başarılı",
                      description: editingRecurringIncome ? "Tekrarlı gelir güncellendi." : "Tekrarlı gelir eklendi.",
                    })
                  }
                  
                  setRecurringIncomeDialogOpen(false)
                  setEditingRecurringIncome(null)
                  setRecurringIncomeForm({
                    description: "",
                    amount: "",
                    category: "Maaş",
                    active: true,
                  })
                } catch (error) {
                  console.error("Failed to save recurring income:", error)
                  toast({
                    title: "Hata",
                    description: "Kaydetme sırasında bir hata oluştu.",
                    variant: "destructive",
                  })
                }
              }}>
                {editingRecurringIncome ? "Güncelle" : "Kaydet"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
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
        
        {/* Enhanced APK Download Component - Hidden by default, shown via header button */}
        <div className="hidden" id="apk-download-section">
          <div className="hidden lg:block">
            <ApkDownload />
          </div>
        </div>

        {/* Mobile APK download floating button - Hidden by default */}
        <div className="hidden" id="mobile-apk-button">
          <div className="fixed bottom-20 right-4 z-40">
            <div className="flex flex-col gap-2 items-end">
              <Button
                onClick={() => setMobileDownloadOpen(true)}
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl border-0 h-14 w-14 rounded-full"
              >
                <Download className="h-6 w-6" />
              </Button>
              
              <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                📱 APK
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Download Modal */}
        <MobileDownloadModal 
          isOpen={mobileDownloadOpen} 
          onClose={() => setMobileDownloadOpen(false)} 
        />

        {/* PWA Install Banner */}
        <PWAInstallBanner />
        
        {/* <SyncStatusIndicator /> */}
      </div>
    </AuthGuard>
  )
}
