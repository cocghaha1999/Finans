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
  // FileText,
  Eye,
  EyeOff,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Banknote,
  Landmark,
  PiggyBank,
  Trash2,
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
import { formatTRY, cn } from "@/lib/utils"
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
  const { openCalendar } = useCalendar()
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
        if (localCards) setCards(JSON.parse(localCards))
      } catch {}
      setIsLoading(false)
    }
  }, [])

  const totalDebt = useMemo(() => cards.reduce((acc, card) => acc + (card.currentDebt || 0), 0), [cards])
  const totalLimit = useMemo(() => cards.reduce((acc, card) => acc + (card.creditLimit || 0), 0), [cards])
  const totalAvailable = totalLimit - totalDebt

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
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      </div>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        {/* Header */}
        {/* Kaldırıldı */}

        <main className="container mx-auto px-4 py-8">
          {/* Sayfa Başlığı ve Eylemler */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Kartlarım</h1>
              <p className="text-muted-foreground text-sm">Kredi kartlarınızı yönetin ve takip edin.</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Takvim butonu kaldırıldı: sadece ana navigasyonda */}
              <Button variant="outline" onClick={() => setIsInstallmentSheetOpen(true)}>
                Taksitlerim
              </Button>
              <Button variant="outline" onClick={() => setIsSubscriptionsOpen(true)}>
                Abonelikler
              </Button>
              <Button onClick={() => { setEditingCard({} as BankCard); setIsDialogOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Kart Ekle
              </Button>
            </div>
          </div>

          {/* Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Toplam Kart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cards.length}</div>
              </CardContent>
            </Card>
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Toplam Borç</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTRY(totalDebt)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Kullanılabilir Limit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTRY(totalAvailable)}</div>
              </CardContent>
            </Card>
            <Card className="bg-card text-card-foreground">
              <CardHeader>
                <CardTitle className="text-sm font-medium">Toplam Limit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatTRY(totalLimit)}</div>
              </CardContent>
            </Card>
          </div>

          {/* Taksitlerim Collapsible kaldırıldı; sağ panel (Sheet) ile gösterilecek. */}

          {/* Kartlar Listesi */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.length === 0 ? (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-16">
                <CreditCard className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">Henüz Kredi Kartı Eklenmemiş</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  İlk kredi kartınızı ekleyerek harcamalarınızı ve limitlerinizi takip etmeye başlayın.
                </p>
                <div className="mt-6">
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    İlk Kartı Ekle
                  </Button>
                </div>
              </div>
            ) : (
              cards.map((card) => (
                <Card key={card.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
                  <div className={cn("p-5 text-white relative flex flex-col justify-between h-48", "bg-gray-700")}> 
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
                    <div className="relative z-10 flex justify-between items-start">
                      <div>
                        <p className="font-bold text-lg">{card.nickname || card.bankName}</p>
                        <p className="text-xs opacity-80">{card.bankName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <img src={card.bankLogo || "/placeholder.svg?height=32&width=32"} alt={card.bankName} className="h-8 w-8 bg-white/80 rounded-md p-1" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingCard(card)}>
                              <Settings className="mr-2 h-4 w-4" />
                              <span>Ayarlar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {}}>
                              {true ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
                              <span>{true ? "Bilgileri Gizle" : "Bilgileri Göster"}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="relative z-10">
                      <div className="text-center mb-2">
                        <p className="text-xs opacity-80">Güncel Borç</p>
                        <p className={cn("font-bold text-2xl tracking-wider", true ? "blur-0" : "blur-sm")}>
                          {true ? formatTRY(card.currentDebt || 0) : "₺ ****,**"}
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
                  <CardContent className="p-4 flex-grow flex flex-col justify-between bg-card">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-muted-foreground">Limit Kullanımı</span>
                        <span className="text-xs font-bold">{0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5 mb-4">
                        <div
                          className={cn("h-2.5 rounded-full", 0 > 80 ? "bg-red-500" : 0 > 60 ? "bg-yellow-500" : "bg-green-500")}
                          style={{ width: `${0}%` }}
                        ></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        <div className="flex items-center gap-2">
                          <PiggyBank className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Kalan Limit</p>
                            <p className="font-semibold">{formatTRY((card.creditLimit || 0) - (card.currentDebt || 0))}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Landmark className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Toplam Limit</p>
                            <p className="font-semibold">{formatTRY(card.creditLimit || 0)}</p>
                          </div>
                        </div>
                      </div>
                      {card.paymentDueDate && (
                        <div className="flex items-center gap-2 text-xs bg-muted p-2 rounded-md">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>Son Ödeme Tarihi: <span className="font-semibold">{card.paymentDueDate}</span></span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => handleOpenDetails(card)}>
                        <Receipt className="h-4 w-4 mr-2" />
                        Harcamalar
                      </Button>
                      <Button size="sm" onClick={() => handleOpenPayDialog(card)}>
                        <Banknote className="h-4 w-4 mr-2" />
                        Borç Öde
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Taksitlerim Sheet */}
          <Sheet open={isInstallmentSheetOpen} onOpenChange={setIsInstallmentSheetOpen}>
            <SheetContent side="right" className="w-[90vw] sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>Taksitlerim</SheetTitle>
                <SheetDescription>Aktif taksitli harcamalarınızın özeti.</SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">Toplam aktif taksit: {activePlans.length}</div>
                  <Button size="sm" onClick={() => handleOpenInstallmentDialog(null)}>
                    <Plus className="h-4 w-4 mr-2" /> Taksit Ekle
                  </Button>
                </div>
                <Tabs value={installmentTab} onValueChange={(v) => setInstallmentTab(v as any)}>
                  <TabsList>
                    <TabsTrigger value="aktif">Aktif ({activePlans.length})</TabsTrigger>
                    <TabsTrigger value="buay">Bu Ay ({dueThisMonthPlans.length})</TabsTrigger>
                    <TabsTrigger value="tamamlanan">Tamamlanan ({completedPlans.length})</TabsTrigger>
                  </TabsList>
                </Tabs>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kart</TableHead>
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="text-right">Aylık Tutar</TableHead>
                      <TableHead className="text-center">İlerleme</TableHead>
                      <TableHead className="text-right">Kalan Tutar</TableHead>
                      <TableHead>Sonraki Ödeme</TableHead>
                      <TableHead className="text-right">İşlemler</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      installmentTab === 'aktif' ? activePlans : installmentTab === 'buay' ? dueThisMonthPlans : completedPlans
                    ).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Aktif taksit bulunmuyor.</TableCell>
                      </TableRow>
                    ) : (
                      (installmentTab === 'aktif' ? activePlans : installmentTab === 'buay' ? dueThisMonthPlans : completedPlans).map(({ card, p }) => (
                        <TableRow key={`${card.id}-${p.id}`}>
                          <TableCell>{card.nickname || card.bankName}</TableCell>
                          <TableCell>{p.description}</TableCell>
                          <TableCell className="text-right">{formatTRY(p.monthlyAmount)}</TableCell>
                          <TableCell className="text-center">{(p.posted || 0)}/{(p.posted || 0) + (p.remaining || 0)}</TableCell>
                          <TableCell className="text-right">{formatTRY(Math.max(0, (p.remaining || 0)) * p.monthlyAmount)}</TableCell>
                          <TableCell>{p.nextDate ? new Date(p.nextDate).toLocaleDateString("tr-TR") : (p.remaining || 0) <= 0 ? 'Tamamlandı' : '-'}</TableCell>
                          <TableCell className="text-right"><Button size="sm" variant="outline" onClick={() => handleOpenInstallmentDialog(card)}>Düzenle</Button></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </SheetContent>
          </Sheet>

          {/* Abonelikler Dialog */}
          <SubscriptionsDialog open={isSubscriptionsOpen} onOpenChange={setIsSubscriptionsOpen} />

          {/* Taksit Ekle/Düzenle Dialog */}
          <Dialog open={isInstallmentDialogOpen} onOpenChange={setIsInstallmentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Yeni Taksit Ekle</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Kart</Label>
                  <Select
                    value={selectedInstallmentCardId}
                    onValueChange={(v) => setSelectedInstallmentCardId(v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Taksit yapılacak kartı seçin..." /></SelectTrigger>
                    <SelectContent>
                      {cards.map(card => (
                        <SelectItem key={card.id} value={card.id!}>{card.nickname || card.bankName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Açıklama</Label>
                  <Input placeholder="Örn: Yeni Telefon" value={draftInstallmentDesc} onChange={(e) => setDraftInstallmentDesc(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Toplam Tutar (₺)</Label>
                    <Input type="text" placeholder="15.000,00" value={draftInstallmentTotal} onChange={(e) => setDraftInstallmentTotal(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Taksit Sayısı</Label>
                    <Input type="number" placeholder="12" value={draftInstallmentCount} onChange={(e) => setDraftInstallmentCount(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Satın Alım Tarihi</Label>
                  <Input type="date" value={draftStartDate} onChange={(e) => setDraftStartDate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInstallmentDialogOpen(false)}>İptal</Button>
                <Button onClick={handleSaveInstallment}>Kaydet</Button>
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
