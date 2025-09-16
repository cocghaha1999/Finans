"use client"

import { TURKISH_BANKS } from "@/lib/banks";
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  CreditCard,
  Plus,
  Settings,
  Bell,
  User,
  Wallet,
  Home,
  Receipt,
  Target,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Banknote,
  Landmark,
  PiggyBank,
  Trash2,
  BarChart3,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertTriangle,
  Star,
  Shield,
  Zap,
  CreditCard as CardIcon,
  Calculator,
  PieChart,
  Activity,
  TrendingUp as TrendingUpIcon,
} from "lucide-react"
import { AuthGuard } from "@/components/auth-guard"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { auth } from "@/lib/firebase"
import { isFirestoreReady, listCards, upsertCard, removeCard, watchCards, listCardEntries, addCardEntry, upsertCardEntry, removeCardEntry, computeMinimumPayment, computeMinimumPaymentForBank, listTransactions, watchTransactions, addTransaction, addNotification } from "@/lib/db"
import type { CardEntry, BankCard, InstallmentPlan, Transaction } from "@/lib/types"
import { formatTRY, cn, safeJsonParse } from "@/lib/utils"
import { BalanceChip } from "@/components/balance-chip"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SubscriptionsDialog } from "@/components/subscriptions-dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCalendar, type HighlightedDate } from "@/hooks/use-calendar-simple"

export default function CardsPage() {
  const { openCalendar, addCalendarEvent } = useCalendar()
  const [cards, setCards] = useState<BankCard[]>([])
  const [entriesByCard, setEntriesByCard] = useState<Record<string, CardEntry[]>>({})
  const [allTransactions, setAllTransactions] = useState<any[]>([])
  const [isOnline, setIsOnline] = useState(true)
  
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<any>(null)
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState("")
  const [cardToPay, setCardToPay] = useState<BankCard | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedCard, setSelectedCard] = useState<BankCard | null>(null)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editingEntryAmount, setEditingEntryAmount] = useState<string>("")
  const [editingEntryDesc, setEditingEntryDesc] = useState<string>("")
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null)
  // Yeni kart harcaması (entry) alanları
  const [entryAmount, setEntryAmount] = useState<string>("")
  const [entryDescription, setEntryDescription] = useState<string>("")
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().slice(0,10))
  const [isInstallmentSheetOpen, setIsInstallmentSheetOpen] = useState(false)
  const [isInstallmentDialogOpen, setIsInstallmentDialogOpen] = useState(false)
  // Draft fields for creating/editing an installment
  const [selectedInstallmentCardId, setSelectedInstallmentCardId] = useState<string>("")
  const [draftInstallmentDesc, setDraftInstallmentDesc] = useState<string>("")
  const [draftInstallmentTotal, setDraftInstallmentTotal] = useState<string>("")
  const [draftInstallmentCount, setDraftInstallmentCount] = useState<string>("")
  const [draftStartDate, setDraftStartDate] = useState<string>("")
  const [isSubscriptionsOpen, setIsSubscriptionsOpen] = useState(false)
  
  // Enhanced UI states
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showBalances, setShowBalances] = useState(true);
  const [filterBy, setFilterBy] = useState<'all' | 'credit' | 'debit'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'usage' | 'debt' | 'limit'>('name');
  const { toast } = useToast()
  const [installmentTab, setInstallmentTab] = useState<'aktif'|'buay'|'tamamlanan'>('aktif')

  const isThisMonth = (iso?: string | null) => {
    if (!iso) return false
    const d = new Date(iso)
    if (isNaN(d.getTime())) return false
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }

  const allPlansRaw = useMemo(() => cards.flatMap(card => (card.installmentPlans || []).map(p => ({ card, p }))), [cards])
  const activePlans = useMemo(() => allPlansRaw.filter(({ p }) => (p.remaining || 0) > 0), [allPlansRaw])
  const dueThisMonthPlans = useMemo(() => activePlans.filter(({ p }) => isThisMonth(p.nextDate || undefined)), [activePlans])
  const completedPlans = useMemo(() => allPlansRaw.filter(({ p }) => (p.remaining || 0) <= 0), [allPlansRaw])

  // Online/offline state tracking
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
    const u = auth?.currentUser
    if (u && isFirestoreReady()) {
      const unsubCards = watchCards(u.uid, (cards) => {
        setCards(cards)
        setIsLoading(false)
      })
      const unsubTxns = watchTransactions(u.uid, setAllTransactions)
      listCards(u.uid).then(setCards).finally(() => setIsLoading(false))
      listTransactions(u.uid).then(setAllTransactions)
      return () => {
        unsubCards?.()
        unsubTxns?.()
      }
    } else {
      // Local fallback
      try {
        const localCards = localStorage.getItem("cards")
        if (localCards) setCards(safeJsonParse(localCards, []))
      } catch {}
      setIsLoading(false)
    }
  }, [])

  const totalDebt = useMemo(() => cards.reduce((acc, card) => acc + (card.currentDebt || 0), 0), [cards])
  const totalLimit = useMemo(() => cards.reduce((acc, card) => acc + (card.creditLimit || 0), 0), [cards])
  const totalAvailable = totalLimit - totalDebt

  // Enhanced filtering and sorting
  const filteredAndSortedCards = useMemo(() => {
    let filtered = cards;
    
    // Filter by type - using cardType property
    if (filterBy === 'credit') {
      filtered = filtered.filter(card => (card.cardType || '').toLowerCase().includes('kredi'));
    } else if (filterBy === 'debit') {
      filtered = filtered.filter(card => (card.cardType || '').toLowerCase().includes('debit') || (card.cardType || '').toLowerCase().includes('vadesiz'));
    }
    
    // Sort cards
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return (a.nickname || a.bankName || '').localeCompare(b.nickname || b.bankName || '');
        case 'usage':
          const usageA = (a.currentDebt || 0) / (a.creditLimit || 1);
          const usageB = (b.currentDebt || 0) / (b.creditLimit || 1);
          return usageB - usageA;
        case 'debt':
          return (b.currentDebt || 0) - (a.currentDebt || 0);
        case 'limit':
          return (b.creditLimit || 0) - (a.creditLimit || 0);
        default:
          return 0;
      }
    });
  }, [cards, filterBy, sortBy]);

  // Card analytics
  const cardAnalytics = useMemo(() => {
    const totalCards = cards.length;
    const creditCards = cards.filter(c => (c.cardType || '').toLowerCase().includes('kredi')).length;
    const debitCards = cards.filter(c => (c.cardType || '').toLowerCase().includes('debit') || (c.cardType || '').toLowerCase().includes('vadesiz')).length;
    const highUsageCards = cards.filter(c => (c.currentDebt || 0) / (c.creditLimit || 1) > 0.8).length;
    const overdueCards = cards.filter(c => {
      const dueDateStr = c.paymentDueDate || '';
      if (!dueDateStr) return false;
      const dueDay = parseInt(dueDateStr);
      if (isNaN(dueDay)) return false;
      const today = new Date();
      const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      return dueDate < today && (c.currentDebt || 0) > 0;
    }).length;
    
    return {
      totalCards,
      creditCards,
      debitCards,
      highUsageCards,
      overdueCards,
      averageUsage: totalLimit > 0 ? (totalDebt / totalLimit) * 100 : 0
    };
  }, [cards, totalDebt, totalLimit]);

  const handleSaveCard = async (cardData: BankCard) => {
    const u = auth?.currentUser
    if (!u) {
      toast({ title: "Hata", description: "Giriş yapmalısınız.", variant: "destructive" })
      return
    }
    try {
      await upsertCard(u.uid, cardData)
      toast({ title: "Başarılı", description: "Kart bilgileri kaydedildi." })
      setIsDialogOpen(false)
      setEditingCard(null)
    } catch (error) {
      console.error("Kart kaydedilemedi:", error)
      toast({ title: "Hata", description: "Kart kaydedilemedi.", variant: "destructive" })
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    const u = auth?.currentUser
    if (!u) return
    try {
      await removeCard(u.uid, cardId)
      toast({ title: "Başarılı", description: "Kart silindi." })
    } catch (error) {
      console.error("Kart silinemedi:", error)
      toast({ title: "Hata", description: "Kart silinemedi.", variant: "destructive" })
    }
  }

  const handleOpenPayDialog = (card: BankCard) => {
    setCardToPay(card)
    setPaymentAmount((card.minimumPayment || card.currentDebt || 0).toString())
    setIsPayDialogOpen(true)
  }

  const handleConfirmPayment = async (amount: number) => {
    const u = auth?.currentUser
    if (!u || !cardToPay) return

    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Geçersiz tutar", variant: "destructive" })
      return
    }

    try {
      // 1. Create a transaction for the payment
      const newTransaction: Transaction = {
        id: crypto.randomUUID(),
        date: new Date().toISOString().split("T")[0],
        amount,
        type: "gider",
        category: "Kredi Kartı Ödemesi",
        description: `${cardToPay.nickname || cardToPay.bankName} ödemesi`,
      }
      await addTransaction(u.uid, newTransaction)

      // 2. Update card debt and advance installment plans by one month
      const addMonthsClamped = (isoDate: string, months: number): string => {
        const d = new Date(isoDate)
        if (isNaN(d.getTime())) return isoDate
        const year = d.getFullYear()
        const month = d.getMonth() + months
        const day = d.getDate()
        const target = new Date(year, month + 1, 0) // last day of target month
        const clampedDay = Math.min(day, target.getDate())
        const res = new Date(year, month, clampedDay)
        return res.toISOString().slice(0, 10)
      }

      const plans = Array.isArray(cardToPay.installmentPlans) ? cardToPay.installmentPlans : []
      const advancedPlans = plans.map((p) => {
        if ((p.remaining || 0) <= 0) return p
        const nextPosted = (p.posted || 0) + 1
        const nextRemaining = Math.max(0, (p.remaining || 0) - 1)
        let nextDate: string | null | undefined = p.nextDate || null
        if (nextRemaining <= 0) {
          nextDate = null
        } else if (p.nextDate) {
          nextDate = addMonthsClamped(p.nextDate, 1)
        } else if (p.startDate) {
          // derive nextDate from startDate + nextPosted months
          nextDate = addMonthsClamped(p.startDate, nextPosted)
        }
        return { ...p, posted: nextPosted, remaining: nextRemaining, nextDate }
      })

      const updatedCard: BankCard = {
        ...cardToPay,
        currentDebt: (cardToPay.currentDebt || 0) - amount,
        installmentPlans: advancedPlans,
      }
      await upsertCard(u.uid, updatedCard as Omit<BankCard, "id"> & { id?: string })

      // 3. Add notifications
      const progressed = plans.filter((p) => (p.remaining || 0) > 0).length
      const cardLabel = cardToPay.nickname || cardToPay.bankName
      await addNotification(u.uid, {
        message: `${cardLabel} kartına ${formatTRY(amount)} ödeme yapıldı` + (progressed > 0 ? ` • ${progressed} taksit 1 ay ilerletildi` : ""),
        read: false,
        timestamp: Date.now(),
        type: "payment",
      })

      toast({ title: "Ödeme Başarılı", description: `${formatTRY(amount)} ödendi.` })
      setIsPayDialogOpen(false)
      setCardToPay(null)
      setPaymentAmount("")
    } catch (error) {
      console.error("Ödeme hatası:", error)
      toast({ title: "Ödeme Başarısız", variant: "destructive" })
    }
  }

  const handleOpenDetails = (card: BankCard) => {
    setSelectedCard(card)
    setIsDetailsOpen(true)
  setEntryAmount("")
  setEntryDescription("")
  setEntryDate(new Date().toISOString().slice(0,10))
    // Fetch existing entries for this card so the list is up to date
    ;(async () => {
      const u = auth?.currentUser
      if (!u || !card.id) return
      try {
        const list = await listCardEntries(u.uid, card.id)
        setEntriesByCard(prev => ({ ...prev, [card.id!]: list }))
      } catch {}
    })()
  }
  
  const handleOpenInstallmentDialog = (card: BankCard | null) => {
    setSelectedInstallmentCardId(card?.id || "")
    setDraftInstallmentDesc("")
    setDraftInstallmentTotal("")
    setDraftInstallmentCount("")
    setDraftStartDate("")
    setIsInstallmentDialogOpen(true)
  }

  const handleAddCardSpend = async () => {
    const u = auth?.currentUser
    if (!u || !selectedCard) {
      toast({ title: "Hata", description: "Giriş yapın ve bir kart seçin.", variant: "destructive" })
      return
    }
    const parseAmount = (raw: string): number => {
      const s = String(raw || "").trim().replace(/\./g, "").replace(",", ".")
      return Number(s)
    }
    const amount = parseAmount(entryAmount)
    if (!isFinite(amount) || amount <= 0) {
      toast({ title: "Geçersiz tutar", description: "Pozitif bir tutar girin.", variant: "destructive" })
      return
    }
    const when = entryDate || new Date().toISOString().slice(0,10)
    try {
      const newId = await addCardEntry(u.uid, selectedCard.id!, {
        cardId: selectedCard.id!,
        type: "harcama",
        amount,
        description: entryDescription || "Kart harcaması",
        date: when,
      })
      const updated: BankCard = { ...selectedCard, currentDebt: (selectedCard.currentDebt || 0) + amount }
      await upsertCard(u.uid, updated as any)
      toast({ title: "Harcama eklendi", description: `${updated.nickname || updated.bankName}: ${formatTRY(amount)}` })
      
      // Takvime ekle
      addCalendarEvent({
        date: new Date(when),
        type: 'expense',
        description: `${entryDescription || "Kart harcaması"} • ₺${amount.toLocaleString("tr-TR")}`,
        amount: amount,
        title: entryDescription || "Kart harcaması",
        category: 'Kart Harcaması'
      })
      
      // Ekranda da anlık yansıtmak için state'i güncelle
      setSelectedCard(updated)
      setCards(prev => prev.map(c => c.id === updated.id ? updated : c))
      // Entries listesini de güncelle
      setEntriesByCard(prev => ({
        ...prev,
        [selectedCard.id!]: [
          { id: String(newId), cardId: selectedCard.id!, type: "harcama", amount, description: entryDescription || "Kart harcaması", date: when, createdAt: new Date().toISOString() },
          ...(prev[selectedCard.id!] || []),
        ],
      }))
      setEntryAmount("")
      setEntryDescription("")
    } catch (e) {
      console.error(e)
      toast({ title: "Hata", description: "Harcama eklenemedi.", variant: "destructive" })
    }
  }

  const handleSaveInstallment = async () => {
    const u = auth?.currentUser
    if (!u) {
      toast({ title: "Hata", description: "Giriş yapmalısınız.", variant: "destructive" })
      return
    }
    const card = cards.find(c => c.id === selectedInstallmentCardId)
    if (!card) {
      toast({ title: "Hata", description: "Lütfen bir kart seçin.", variant: "destructive" })
      return
    }
    const total = Number(String(draftInstallmentTotal).trim().replace(/\./g, "").replace(",", "."))
    const installments = Number(draftInstallmentCount)
    const startDate = draftStartDate
    if (!isFinite(total) || total <= 0 || !isFinite(installments) || installments <= 0 || !startDate) {
      toast({ title: "Eksik/Geçersiz", description: "Tüm alanları doğru doldurun.", variant: "destructive" })
      return
    }
    const monthlyAmount = Math.round((total / installments) * 100) / 100
    const newPlan = {
      id: crypto.randomUUID(),
      description: draftInstallmentDesc || "Taksitli Harcama",
      total,
      monthlyAmount,
      remaining: installments,
      posted: 0,
      startDate,
      nextDate: startDate,
    } as InstallmentPlan
    const prevPlans = Array.isArray(card.installmentPlans) ? card.installmentPlans : []
    const updatedCard: BankCard = { ...card, installmentPlans: [...prevPlans, newPlan] }
    try {
      await upsertCard(u.uid, updatedCard as any)
      toast({ title: "Taksit Eklendi", description: `${card.nickname || card.bankName} için ${installments} ay • ${formatTRY(monthlyAmount)}` })
      setIsInstallmentDialogOpen(false)
    } catch (e) {
      console.error(e)
      toast({ title: "Hata", description: "Taksit eklenemedi.", variant: "destructive" })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <Skeleton className="h-40 sm:h-52 w-full" />
          <Skeleton className="h-40 sm:h-52 w-full" />
          <Skeleton className="h-40 sm:h-52 w-full" />
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Header */}
        {/* Kaldırıldı */}

        <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
          {/* Enhanced Header with Analytics */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2 sm:gap-3">
                  <CardIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  Kartlarım
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm mt-1">Kredi kartlarınızı akıllıca yönetin ve takip edin.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setIsInstallmentSheetOpen(true)} className="text-xs px-2 py-1">
                  <Clock className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Taksitlerim</span>
                  <span className="sm:hidden">Taksit</span>
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsSubscriptionsOpen(true)} className="text-xs px-2 py-1">
                  <RefreshCw className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Abonelikler</span>
                  <span className="sm:hidden">Abone</span>
                </Button>
                <Button onClick={() => { setEditingCard({} as BankCard); setIsDialogOpen(true); }} size="sm" className="text-xs px-2 py-1">
                  <Plus className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Yeni Kart</span>
                  <span className="sm:hidden">Ekle</span>
                </Button>
              </div>
            </div>

            {/* Quick Analytics Dashboard */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <Card className="p-2 sm:p-4">
                <div className="flex items-center gap-1 sm:gap-2">
                  <CreditCard className="h-3 w-3 sm:h-5 sm:w-5 text-blue-500" />
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Toplam</p>
                    <p className="text-sm sm:text-lg font-bold">{cardAnalytics.totalCards}</p>
                  </div>
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUpIcon className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Kullanım</p>
                    <p className="text-lg font-bold">{cardAnalytics.averageUsage.toFixed(0)}%</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Yüksek</p>
                    <p className="text-lg font-bold">{cardAnalytics.highUsageCards}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vadeli</p>
                    <p className="text-lg font-bold">{cardAnalytics.overdueCards}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Kredi</p>
                    <p className="text-lg font-bold">{cardAnalytics.creditCards}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-indigo-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vadesiz</p>
                    <p className="text-lg font-bold">{cardAnalytics.debitCards}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <select 
                    value={filterBy} 
                    onChange={(e) => setFilterBy(e.target.value as any)}
                    className="text-sm border rounded px-2 py-1 bg-background"
                  >
                    <option value="all">Tüm Kartlar</option>
                    <option value="credit">Kredi Kartları</option>
                    <option value="debit">Vadesiz Kartlar</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-sm border rounded px-2 py-1 bg-background"
                  >
                    <option value="name">İsme Göre</option>
                    <option value="usage">Kullanıma Göre</option>
                    <option value="debt">Borca Göre</option>
                    <option value="limit">Limite Göre</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Zap className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <Activity className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBalances(!showBalances)}
                >
                  {showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced Cards Display */}
          <div className={cn(
            "gap-3 sm:gap-6",
            viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" 
              : "flex flex-col space-y-3 sm:space-y-4"
          )}>
            {filteredAndSortedCards.length === 0 ? (
              <div className="col-span-full text-center py-12 sm:py-16">
                <CreditCard className="mx-auto h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                <h3 className="mt-4 text-base sm:text-lg font-medium">
                  {filterBy === 'all' ? 'Henüz Kredi Kartı Eklenmemiş' : 'Bu kategoride kart bulunamadı'}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground px-4">
                  {filterBy === 'all' 
                    ? 'İlk kredi kartınızı ekleyerek harcamalarınızı ve limitlerinizi takip etmeye başlayın.'
                    : 'Farklı filtre seçeneklerini deneyin veya yeni kart ekleyin.'
                  }
                </p>
                <div className="mt-6">
                  <Button onClick={() => setIsDialogOpen(true)} size="sm">
                    <Plus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    {filterBy === 'all' ? 'İlk Kartı Ekle' : 'Yeni Kart Ekle'}
                  </Button>
                </div>
              </div>
            ) : (
              filteredAndSortedCards.map((card) => {
                const usagePercentage = (card.currentDebt || 0) / (card.creditLimit || 1) * 100;
                const isHighUsage = usagePercentage > 80;
                const isOverdue = (() => {
                  const dueDateStr = card.paymentDueDate || '';
                  if (!dueDateStr) return false;
                  const dueDay = parseInt(dueDateStr);
                  if (isNaN(dueDay)) return false;
                  const today = new Date();
                  const dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
                  return dueDate < today && (card.currentDebt || 0) > 0;
                })();

                return (
                  <Card 
                    key={card.id} 
                    className={cn(
                      "overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300",
                      viewMode === 'grid' ? "flex flex-col" : "flex flex-row",
                      isOverdue && "border-red-200 ring-2 ring-red-100",
                      isHighUsage && !isOverdue && "border-yellow-200 ring-2 ring-yellow-100"
                    )}
                  >
                    {/* Enhanced Card Header */}
                    <div className={cn(
                      "text-white relative flex flex-col justify-between",
                      viewMode === 'grid' ? "p-5 h-48" : "p-4 w-64",
                      card.cardColor || "bg-gradient-to-br from-gray-700 to-gray-900"
                    )}>
                      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
                      
                      {/* Status Indicators */}
                      <div className="absolute top-2 left-2 z-20 flex gap-1">
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Vadeli
                          </Badge>
                        )}
                        {isHighUsage && !isOverdue && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-yellow-500 text-white">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Yüksek
                          </Badge>
                        )}
                        {(card.cardType || '').toLowerCase().includes('premium') && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-purple-500 text-white">
                            <Star className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                      </div>

                      <div className="relative z-10 flex justify-between items-start">
                        <div>
                          <p className="font-bold text-lg">{card.nickname || card.bankName}</p>
                          <p className="text-xs opacity-80">{card.bankName}</p>
                          {card.cardType && (
                            <p className="text-xs opacity-70 mt-1">{card.cardType}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <img 
                            src={card.bankLogo || "/placeholder.svg?height=32&width=32"} 
                            alt={card.bankName} 
                            className="h-8 w-8 bg-white/80 rounded-md p-1" 
                          />
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setEditingCard(card)}>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Düzenle</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenDetails(card)}>
                                <Receipt className="mr-2 h-4 w-4" />
                                <span>Harcamalar</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenPayDialog(card)}>
                                <Banknote className="mr-2 h-4 w-4" />
                                <span>Ödeme Yap</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {}}>
                                <Calculator className="mr-2 h-4 w-4" />
                                <span>Taksit Hesapla</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="relative z-10">
                        <div className="text-center mb-2">
                          <p className="text-xs opacity-80">Güncel Borç</p>
                          <p className={cn(
                            "font-bold text-2xl tracking-wider transition-all",
                            showBalances ? "blur-0" : "blur-sm"
                          )}>
                            {showBalances ? formatTRY(card.currentDebt || 0) : "₺ ****,**"}
                          </p>
                        </div>
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-xs opacity-80">Kart Sahibi</p>
                            <p className="font-medium text-sm">{card.cardHolderName || "Bilinmiyor"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs opacity-80">Son Kullanma</p>
                            <p className="font-medium text-sm">{card.expiryDate || "**/**"}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Card Content */}
                    <CardContent className={cn(
                      "p-4 flex-grow flex flex-col justify-between bg-card",
                      viewMode === 'list' && "flex-1"
                    )}>
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs text-muted-foreground">Limit Kullanımı</span>
                          <span className={cn(
                            "text-xs font-medium",
                            isHighUsage ? "text-red-600" : usagePercentage > 60 ? "text-yellow-600" : "text-green-600"
                          )}>
                            {usagePercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 mb-4">
                          <div
                            className={cn(
                              "h-2.5 rounded-full transition-all duration-500",
                              isHighUsage ? "bg-red-500" : usagePercentage > 60 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                          ></div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <PiggyBank className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Kalan Limit</p>
                              <p className={cn(
                                "font-semibold",
                                showBalances ? "blur-0" : "blur-sm"
                              )}>
                                {showBalances ? formatTRY((card.creditLimit || 0) - (card.currentDebt || 0)) : "₺ ****"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Toplam Limit</p>
                              <p className={cn(
                                "font-semibold",
                                showBalances ? "blur-0" : "blur-sm"
                              )}>
                                {showBalances ? formatTRY(card.creditLimit || 0) : "₺ ****"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {card.paymentDueDate && (
                          <div className={cn(
                            "flex items-center gap-2 text-xs p-2 rounded-md mb-3",
                            isOverdue ? "bg-red-50 text-red-700 border border-red-200" : "bg-muted"
                          )}>
                            <Calendar className="h-4 w-4" />
                            <span>
                              Son Ödeme Tarihi: 
                              <span className="font-semibold ml-1">{card.paymentDueDate}</span>
                            </span>
                            {isOverdue && <AlertCircle className="h-4 w-4 text-red-500 ml-auto" />}
                          </div>
                        )}

                        {card.minimumPayment && card.minimumPayment > 0 && (
                          <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-700 p-2 rounded-md mb-3">
                            <DollarSign className="h-4 w-4" />
                            <span>Minimum Ödeme: <span className="font-semibold">{formatTRY(card.minimumPayment)}</span></span>
                          </div>
                        )}
                      </div>

                      <div className={cn(
                        "gap-2 mt-4",
                        viewMode === 'grid' ? "grid grid-cols-2" : "flex"
                      )}>
                        <Button size="sm" variant="outline" onClick={() => handleOpenDetails(card)}>
                          <Receipt className="h-4 w-4 mr-2" />
                          Harcamalar
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={() => handleOpenPayDialog(card)}
                          className={cn(isOverdue && "bg-red-600 hover:bg-red-700")}
                        >
                          <Banknote className="h-4 w-4 mr-2" />
                          {isOverdue ? 'Vadeli Ödeme' : 'Borç Öde'}
                        </Button>
                        {viewMode === 'list' && (
                          <Button size="sm" variant="outline" onClick={() => {}}>
                            <Calculator className="h-4 w-4 mr-2" />
                            Taksit
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Taksitlerim Sheet - Enhanced */}
          <Sheet open={isInstallmentSheetOpen} onOpenChange={setIsInstallmentSheetOpen}>
            <SheetContent side="right" className="w-[95vw] sm:max-w-4xl">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Taksitlerim
                </SheetTitle>
                <SheetDescription>Taksitli harcamalarınızı yönetin ve takip edin.</SheetDescription>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <Activity className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Aktif Taksitler</p>
                          <p className="text-2xl font-bold">{activePlans.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                          <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Bu Ay Ödenecek</p>
                          <p className="text-2xl font-bold">{dueThisMonthPlans.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Aylık Toplam</p>
                          <p className="text-2xl font-bold">
                            {formatTRY(activePlans.reduce((sum, { p }) => sum + p.monthlyAmount, 0))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                  <Tabs value={installmentTab} onValueChange={(v) => setInstallmentTab(v as any)} className="w-full sm:w-auto">
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                      <TabsTrigger value="aktif" className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Aktif ({activePlans.length})
                      </TabsTrigger>
                      <TabsTrigger value="buay" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Bu Ay ({dueThisMonthPlans.length})
                      </TabsTrigger>
                      <TabsTrigger value="tamamlanan" className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Tamamlanan ({completedPlans.length})
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  
                  <Button onClick={() => handleOpenInstallmentDialog(null)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" /> 
                    Yeni Taksit Ekle
                  </Button>
                </div>

                {/* Installments List */}
                <div className="space-y-4">
                  {(installmentTab === 'aktif' ? activePlans : installmentTab === 'buay' ? dueThisMonthPlans : completedPlans).length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="font-semibold mb-2">
                          {installmentTab === 'aktif' ? 'Aktif taksit bulunmuyor' :
                           installmentTab === 'buay' ? 'Bu ay ödenecek taksit yok' :
                           'Tamamlanan taksit bulunmuyor'}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {installmentTab === 'aktif' ? 'Yeni bir taksitli alışveriş ekleyebilirsiniz.' :
                           installmentTab === 'buay' ? 'Bu ay için ödeme yapılacak taksit bulunmamaktadır.' :
                           'Henüz tamamlanmış taksitiniz bulunmuyor.'}
                        </p>
                        {installmentTab === 'aktif' && (
                          <Button onClick={() => handleOpenInstallmentDialog(null)}>
                            <Plus className="h-4 w-4 mr-2" /> 
                            İlk Taksidinizi Ekleyin
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    (installmentTab === 'aktif' ? activePlans : installmentTab === 'buay' ? dueThisMonthPlans : completedPlans).map(({ card, p }) => {
                      const progress = ((p.posted || 0) / ((p.posted || 0) + (p.remaining || 0))) * 100
                      const isCompleted = (p.remaining || 0) <= 0
                      const isDueThisMonth = isThisMonth(p.nextDate || undefined)
                      
                      return (
                        <Card key={`${card.id}-${p.id}`} className={cn(
                          "transition-all hover:shadow-md",
                          isDueThisMonth && installmentTab === 'aktif' && "border-orange-200 bg-orange-50/50",
                          isCompleted && "border-green-200 bg-green-50/50"
                        )}>
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold text-lg">{p.description}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        {card.nickname || card.bankName}
                                      </Badge>
                                      {isDueThisMonth && !isCompleted && (
                                        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                                          Bu Ay Ödenecek
                                        </Badge>
                                      )}
                                      {isCompleted && (
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                          <CheckCircle className="h-3 w-3 mr-1" />
                                          Tamamlandı
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="text-right">
                                    <p className="text-2xl font-bold">{formatTRY(p.monthlyAmount)}</p>
                                    <p className="text-sm text-muted-foreground">Aylık Tutar</p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">İlerleme</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Progress value={progress} className="flex-1" />
                                      <span className="text-sm font-medium">
                                        {(p.posted || 0)}/{(p.posted || 0) + (p.remaining || 0)}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm text-muted-foreground">Kalan Tutar</p>
                                    <p className="text-lg font-semibold mt-1">
                                      {formatTRY(Math.max(0, (p.remaining || 0)) * p.monthlyAmount)}
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <p className="text-sm text-muted-foreground">Sonraki Ödeme</p>
                                    <p className="text-lg font-semibold mt-1">
                                      {p.nextDate ? 
                                        new Date(p.nextDate).toLocaleDateString("tr-TR", { 
                                          day: 'numeric', 
                                          month: 'short', 
                                          year: 'numeric' 
                                        }) : 
                                        isCompleted ? 'Tamamlandı' : '-'
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex lg:flex-col gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleOpenInstallmentDialog(card)}
                                  className="flex-1 lg:flex-none"
                                >
                                  <Settings className="h-4 w-4 mr-2" />
                                  Düzenle
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="flex-1 lg:flex-none border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Sil
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Abonelikler Dialog */}
          <SubscriptionsDialog open={isSubscriptionsOpen} onOpenChange={setIsSubscriptionsOpen} />

          {/* Taksit Ekle/Düzenle Dialog - Enhanced */}
          <Dialog open={isInstallmentDialogOpen} onOpenChange={setIsInstallmentDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Yeni Taksit Ekle
                </DialogTitle>
                <DialogDescription>
                  Taksitli alışverişinizi sisteme ekleyin. Aylık ödemeler otomatik olarak takip edilecek.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-6 py-4">
                {/* Card Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kart Seçimi</Label>
                  <Select
                    value={selectedInstallmentCardId}
                    onValueChange={(v) => setSelectedInstallmentCardId(v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Taksit yapılacak kartı seçin..." />
                    </SelectTrigger>
                    <SelectContent>
                      {cards.map(card => {
                        const bank = TURKISH_BANKS.find(b => b.name === card.bankName)
                        return (
                          <SelectItem key={card.id} value={card.id!}>
                            <div className="flex items-center gap-3">
                              {bank && (
                                <img 
                                  src={bank.logo} 
                                  alt={card.bankName} 
                                  className="h-4 w-4 object-contain rounded-sm" 
                                />
                              )}
                              <span>{card.nickname || card.bankName}</span>
                              <Badge variant="outline" className="text-xs">
                                Limit: {formatTRY(card.creditLimit || 0)}
                              </Badge>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  {!selectedInstallmentCardId && (
                    <p className="text-xs text-muted-foreground">Önce bir kart seçmeniz gerekiyor.</p>
                  )}
                </div>

                {/* Installment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Alışveriş Açıklaması</Label>
                    <Input 
                      placeholder="Örn: iPhone 15 Pro Max" 
                      value={draftInstallmentDesc} 
                      onChange={(e) => setDraftInstallmentDesc(e.target.value)} 
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Satın Alım Tarihi</Label>
                    <Input 
                      type="date" 
                      value={draftStartDate} 
                      onChange={(e) => setDraftStartDate(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Amount and Installment Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Toplam Tutar (₺)</Label>
                    <Input 
                      type="text" 
                      placeholder="15.000,00" 
                      value={draftInstallmentTotal} 
                      onChange={(e) => setDraftInstallmentTotal(e.target.value)}
                      className="w-full text-lg font-semibold"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Taksit Sayısı</Label>
                    <Select value={draftInstallmentCount} onValueChange={setDraftInstallmentCount}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 18, 24, 36].map(count => (
                          <SelectItem key={count} value={count.toString()}>
                            {count} Taksit
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Calculation Preview */}
                {draftInstallmentTotal && draftInstallmentCount && (
                  <Card className="bg-gradient-to-r from-primary/5 to-chart-3/5 border-primary/20">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Toplam Tutar</p>
                          <p className="text-xl font-bold">
                            {formatTRY(Number(draftInstallmentTotal.replace(/\./g, "").replace(",", ".")) || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Aylık Ödeme</p>
                          <p className="text-xl font-bold text-primary">
                            {formatTRY((Number(draftInstallmentTotal.replace(/\./g, "").replace(",", ".")) || 0) / (Number(draftInstallmentCount) || 1))}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Taksit Sayısı</p>
                          <p className="text-xl font-bold">
                            {draftInstallmentCount} Ay
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Interest Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-amber-800">Taksit Faizi Hatırlatması</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Bu hesaplama faiz oranlarını içermez. Gerçek taksit tutarı bankanızın faiz oranlarına göre değişebilir.
                        Kesin tutarlar için bankanızla iletişime geçiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setIsInstallmentDialogOpen(false)}>
                  İptal
                </Button>
                <Button 
                  onClick={handleSaveInstallment}
                  disabled={!selectedInstallmentCardId || !draftInstallmentDesc || !draftInstallmentTotal || !draftInstallmentCount}
                  className="min-w-[100px]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Taksit Ekle
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCard?.id ? "Kartı Düzenle" : "Yeni Kart Ekle"}</DialogTitle>
              <DialogDescription>
                {editingCard?.id ? "Kart bilgilerinizi güncelleyin." : "Yeni bir kredi kartı ekleyin."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="nickname">Kart Takma Adı</Label>
                <Input id="nickname" placeholder="Örn: Maaş Kartım" value={editingCard?.nickname || ""} onChange={e => setEditingCard({ ...editingCard, nickname: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Banka</Label>
                <Select
                  value={editingCard?.bankName || ""}
                  onValueChange={(v) => setEditingCard({ ...editingCard, bankName: v })}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      {editingCard?.bankName && (
                        <img 
                          src={TURKISH_BANKS.find(b => b.name === editingCard.bankName)?.logo} 
                          alt={editingCard.bankName} 
                          className="h-4 w-4 object-contain rounded-sm" 
                        />
                      )}
                      <SelectValue placeholder="Banka seçin..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TURKISH_BANKS.map((b) => (
                      <SelectItem key={b.name} value={b.name}>
                        <div className="flex items-center gap-2">
                          <img src={b.logo} alt={b.name} className="h-4 w-4 object-contain rounded-sm" />
                          <span>{b.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
               <div className="space-y-2">
                <Label>Kredi Limiti (₺)</Label>
                <Input type="number" placeholder="5000" value={editingCard?.creditLimit || ""} onChange={e => setEditingCard({ ...editingCard, creditLimit: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Son Ödeme Günü</Label>
                <Input placeholder="Ayın 26'sı veya 26" value={editingCard?.paymentDueDate || ""} onChange={e => setEditingCard({ ...editingCard, paymentDueDate: e.target.value })} />
              </div>
               <div className="space-y-2">
                <Label>Ekstre Günü</Label>
                <Input placeholder="Ayın 15'i veya 15" value={editingCard?.statementDate || ""} onChange={e => setEditingCard({ ...editingCard, statementDate: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              {editingCard?.id && (
                <Button variant="destructive" onClick={() => handleDeleteCard(editingCard.id!)}>Sil</Button>
              )}
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>İptal</Button>
              <Button onClick={() => handleSaveCard(editingCard!)}>Kaydet</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Card Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCard?.nickname || selectedCard?.bankName} • Kart Hareketleri</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end p-4 border rounded-lg">
                <div className="md:col-span-3">
                  <Label>Yeni Hareket Ekle</Label>
                </div>
                <div className="space-y-2">
                  <Label>Tutar (₺)</Label>
                  <Input placeholder="150,75" inputMode="decimal" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Açıklama</Label>
                  <Input placeholder="Market Alışverişi" value={entryDescription} onChange={(e) => setEntryDescription(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tarih</Label>
                  <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                   <Label>Tür</Label>
                  <Select value={"harcama"} onValueChange={() => {}}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="harcama">Harcama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex items-end">
                  <Button className="w-full" onClick={handleAddCardSpend}>Ekle</Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Geçmiş Hareketler</p>
                <div className="border rounded-md divide-y">
                  {(!selectedCard || !(entriesByCard[selectedCard.id!] || []).length) ? (
                    <div className="text-sm text-muted-foreground p-4 text-center">Henüz kayıt yok.</div>
                  ) : (entriesByCard[selectedCard.id!] || [])
                      .slice()
                      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
                      .map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3 text-sm">
                      <div className="flex items-center gap-3">
                        <Badge variant={e.type === "harcama" ? "secondary" : "default"} className={cn("font-mono", e.type === "harcama" ? "bg-red-500/10 text-red-700" : "bg-green-500/10 text-green-700")}>
                          {e.type === "harcama" ? "-" : "+"}
                        </Badge>
                        <div className="min-w-0">
                          {editingEntryId === e.id ? (
                            <div className="flex flex-col gap-2">
                              <Input
                                value={editingEntryDesc}
                                onChange={(ev) => setEditingEntryDesc(ev.target.value)}
                                placeholder="Açıklama"
                              />
                              <div className="flex gap-2">
                                <Input
                                  value={editingEntryAmount}
                                  onChange={(ev) => setEditingEntryAmount(ev.target.value)}
                                  placeholder="Tutar"
                                  inputMode="decimal"
                                />
                                <Button size="sm" onClick={async () => {
                                  if (!selectedCard) return
                                  const parseAmount = (raw: string): number => String(raw || "").trim().replace(/\./g, "").replace(",", ".") as any as number
                                  const amt = Number(String(editingEntryAmount || "").trim().replace(/\./g, "").replace(",", "."))
                                  if (!isFinite(amt) || amt <= 0) { toast({ title: "Geçersiz", variant: "destructive" }); return }
                                  const prev = entriesByCard[selectedCard.id!]?.find(x => x.id === e.id)
                                  if (!prev) return
                                  const diff = amt - prev.amount
                                  try {
                                    await upsertCardEntry(auth!.currentUser!.uid, selectedCard.id!, { ...prev, amount: amt, description: editingEntryDesc })
                                    // Debt güncelle
                                    const updatedCard = { ...selectedCard, currentDebt: (selectedCard.currentDebt || 0) + diff }
                                    await upsertCard(auth!.currentUser!.uid, updatedCard as any)
                                    setSelectedCard(updatedCard)
                                    setCards(prevCards => prevCards.map(c => c.id === updatedCard.id ? updatedCard : c))
                                    // Local listeyi güncelle
                                    setEntriesByCard(prevMap => ({
                                      ...prevMap,
                                      [selectedCard.id!]: (prevMap[selectedCard.id!] || []).map(it => it.id === e.id ? { ...it, amount: amt, description: editingEntryDesc } : it)
                                    }))
                                    setEditingEntryId(null)
                                  } catch (err) {
                                    console.error(err)
                                    toast({ title: "Hata", description: "Güncellenemedi", variant: "destructive" })
                                  }
                                }}>Kaydet</Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingEntryId(null)}>Vazgeç</Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="font-medium truncate">{e.description || "-"}</p>
                              <p className="text-xs text-muted-foreground">{e.date}</p>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn("font-semibold", e.type === "harcama" ? "text-red-600" : "text-green-600")}>
                          {e.type === "harcama" ? "-" : "+"}
                          {formatTRY(e.amount)}
                        </span>
                        {editingEntryId !== e.id ? (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => { setEditingEntryId(e.id); setEditingEntryDesc(e.description || ""); setEditingEntryAmount(String(e.amount).replace(".", ",")); }}>
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setConfirmDeleteEntryId(e.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {selectedCard && confirmDeleteEntryId && (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/30">
                  <span className="text-sm">Bu hareket silinsin mi?</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmDeleteEntryId(null)}>İptal</Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      const u = auth?.currentUser
                      if (!u) return
                      const prev = (entriesByCard[selectedCard.id!] || []).find(x => x.id === confirmDeleteEntryId)
                      try {
                        await removeCardEntry(u.uid, selectedCard.id!, confirmDeleteEntryId)
                        // Borcu düşür
                        const updatedCard = { ...selectedCard, currentDebt: (selectedCard.currentDebt || 0) - (prev?.amount || 0) }
                        await upsertCard(u.uid, updatedCard as any)
                        setSelectedCard(updatedCard)
                        setCards(prevCards => prevCards.map(c => c.id === updatedCard.id ? updatedCard : c))
                        // Listeyi güncelle
                        setEntriesByCard(prevMap => ({
                          ...prevMap,
                          [selectedCard.id!]: (prevMap[selectedCard.id!] || []).filter(it => it.id !== confirmDeleteEntryId)
                        }))
                        setConfirmDeleteEntryId(null)
                        toast({ title: "Hareket silindi" })
                      } catch (err) {
                        console.error(err)
                        toast({ title: "Hata", description: "Silinemedi", variant: "destructive" })
                      }
                    }}>Sil</Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>Kapat</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Quick Pay Dialog */}
  {cardToPay && (
          <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{cardToPay.nickname || cardToPay.bankName} • Hızlı Borç Öde</DialogTitle>
                <DialogDescription>
                  Güncel borcunuz: {formatTRY(cardToPay.currentDebt || 0)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-auto"
                  onClick={() => handleConfirmPayment(computeMinimumPaymentForBank(cardToPay.bankName, cardToPay.creditLimit || 0, cardToPay.currentDebt || 0))}
                >
                  <div className="flex flex-col items-center p-2">
                    <span className="text-sm text-muted-foreground">Asgari Tutarı Öde</span>
                    <span className="text-xl font-bold">{formatTRY(computeMinimumPaymentForBank(cardToPay.bankName, cardToPay.creditLimit || 0, cardToPay.currentDebt || 0))}</span>
                  </div>
                </Button>
                <Button
                  size="lg"
                  className="h-auto"
                  onClick={() => handleConfirmPayment(cardToPay.currentDebt || 0)}
                >
                  <div className="flex flex-col items-center p-2">
                    <span className="text-sm text-white/80">Tüm Borcu Öde</span>
                    <span className="text-xl font-bold">{formatTRY(cardToPay.currentDebt || 0)}</span>
                  </div>
                </Button>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsPayDialogOpen(false)}>İptal</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        </main>
      </div>
    </AuthGuard>
  )
}
