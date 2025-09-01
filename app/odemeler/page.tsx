"use client"

import { useState, useEffect, type ComponentType } from "react"
import { useAuth } from "@/components/auth-guard"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Plus,
  Home,
  Receipt,
  Building,
  Car,
  Zap,
  Phone,
  Wifi,
  ShoppingCart,
  Repeat,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
} from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
// Lucide icons are React components; use a generic component type to avoid TS namespace issues
type IconType = ComponentType<{ className?: string }>
import { Payment } from "@/lib/types"
import { useCalendar, type HighlightedDate } from "@/hooks/use-calendar-simple"
import { upsertPayment, removePayment, watchPayments, addTransaction as addTxnDb } from "@/lib/db"

// Minimal transaction shape used by addTransaction; structurally compatible
type Txn = {
  id: string
  type: "gelir" | "gider"
  amount: number
  description: string
  category: string
  date: string
}

const fixedPaymentCategories: {
  id: string
  name: string
  icon: IconType
  color: string
}[] = [
  { id: "kira", name: "Kira", icon: Home, color: "bg-blue-500" },
  { id: "aidat", name: "Aidat", icon: Building, color: "bg-green-500" },
  { id: "elektrik", name: "Elektrik", icon: Zap, color: "bg-yellow-500" },
  { id: "su", name: "Su", icon: DollarSign, color: "bg-cyan-500" },
  { id: "dogalgaz", name: "Doğalgaz", icon: DollarSign, color: "bg-orange-500" },
  { id: "internet", name: "İnternet", icon: Wifi, color: "bg-purple-500" },
  { id: "telefon", name: "Telefon", icon: Phone, color: "bg-pink-500" },
  { id: "arac", name: "Araç Kredisi", icon: Car, color: "bg-red-500" },
]

const getCategoryIcon = (categoryId?: string): IconType => {
  return fixedPaymentCategories.find((c) => c.id === categoryId)?.icon || Receipt
}

const getCategoryColor = (categoryId?: string): string => {
  return fixedPaymentCategories.find((c) => c.id === categoryId)?.color || "bg-gray-500"
}

export default function PaymentsPage() {
  const { user } = useAuth()
  const { openCalendar } = useCalendar()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isOnline, setIsOnline] = useState(true)
  
  const [isAddingFixed, setIsAddingFixed] = useState(false)
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [isEditingFixed, setIsEditingFixed] = useState(false)
  const [editingFixedPaymentId, setEditingFixedPaymentId] = useState<string>("")
  const [editFixedCategory, setEditFixedCategory] = useState<string>("")
  const [editFixedAmount, setEditFixedAmount] = useState<string>("")
  const [editFixedPaymentDay, setEditFixedPaymentDay] = useState<string>("")
  const [editFixedDescription, setEditFixedDescription] = useState<string>("")
  const [isEditingCustom, setIsEditingCustom] = useState(false)
  const [editingPaymentId, setEditingPaymentId] = useState<string>("")
  const [editCustomName, setEditCustomName] = useState("")
  const [editCustomAmount, setEditCustomAmount] = useState("")
  const [editCustomDate, setEditCustomDate] = useState("")
  const [editCustomIsRecurring, setEditCustomIsRecurring] = useState(false)
  const [editCustomDescription, setEditCustomDescription] = useState("")
  const [isFixedHistoryOpen, setIsFixedHistoryOpen] = useState(false)
  const [isCustomHistoryOpen, setIsCustomHistoryOpen] = useState(false)
  const [fixedHistoryMonth, setFixedHistoryMonth] = useState<string>("") // YYYY-MM
  const [customHistoryMonth, setCustomHistoryMonth] = useState<string>("") // YYYY-MM
  const [fixedSearch, setFixedSearch] = useState("")
  const [customSearch, setCustomSearch] = useState("")

  // Form states for adding fixed payment
  const [newFixedCategory, setNewFixedCategory] = useState("")
  const [newFixedAmount, setNewFixedAmount] = useState("")
  const [newFixedPaymentDay, setNewFixedPaymentDay] = useState("")
  const [newFixedDescription, setNewFixedDescription] = useState("")

  // Form states for adding custom payment
  const [newCustomName, setNewCustomName] = useState("")
  const [newCustomAmount, setNewCustomAmount] = useState("")
  const [newCustomDate, setNewCustomDate] = useState("")
  const [newCustomIsRecurring, setNewCustomIsRecurring] = useState(false)
  const [newCustomDescription, setNewCustomDescription] = useState("")

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
    if (!user) return
    const unsubscribe = watchPayments(user.uid, setPayments)
    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [user])

  const handleAddFixedPayment = async () => {
    if (!user || !newFixedCategory || !newFixedAmount || !newFixedPaymentDay) return
    const categoryInfo = fixedPaymentCategories.find((c) => c.id === newFixedCategory)
    if (!categoryInfo) return

    const newPayment: Partial<Payment> = {
      paymentType: "fixed",
      category: newFixedCategory,
      name: categoryInfo.name,
      amount: parseFloat(newFixedAmount),
      paymentDay: parseInt(newFixedPaymentDay, 10),
      status: "pending",
      description: newFixedDescription,
    }
    await upsertPayment(user.uid, newPayment)
    // Reset form and close dialog
    setNewFixedCategory("")
    setNewFixedAmount("")
    setNewFixedPaymentDay("")
    setNewFixedDescription("")
    setIsAddingFixed(false)
  }

  const openEditFixed = (payment: Payment) => {
    if (payment.paymentType !== "fixed") return
    setEditingFixedPaymentId(payment.id)
    setEditFixedCategory(payment.category || "")
    setEditFixedAmount(String(payment.amount ?? ""))
    setEditFixedPaymentDay(payment.paymentDay ? String(payment.paymentDay) : "")
    setEditFixedDescription(payment.description || "")
    setIsEditingFixed(true)
  }

  const handleSaveEditFixed = async () => {
    if (!user || !editingFixedPaymentId || !editFixedCategory || !editFixedAmount || !editFixedPaymentDay) return
    const categoryInfo = fixedPaymentCategories.find((c) => c.id === editFixedCategory)
    const updated: Partial<Payment> = {
      id: editingFixedPaymentId,
      paymentType: "fixed",
      category: editFixedCategory,
      name: categoryInfo?.name || "Sabit Ödeme",
      amount: parseFloat(editFixedAmount),
      paymentDay: parseInt(editFixedPaymentDay, 10),
      description: editFixedDescription,
    }
    await upsertPayment(user.uid, updated)
    // reset
    setIsEditingFixed(false)
    setEditingFixedPaymentId("")
    setEditFixedCategory("")
    setEditFixedAmount("")
    setEditFixedPaymentDay("")
    setEditFixedDescription("")
  }

  const handleAddCustomPayment = async () => {
    if (!user || !newCustomName || !newCustomAmount) return

    const newPayment: Partial<Payment> = {
      paymentType: "custom",
      name: newCustomName,
      amount: parseFloat(newCustomAmount),
      date: newCustomDate || undefined,
      isRecurring: newCustomIsRecurring,
      status: "pending",
      description: newCustomDescription,
    }
    await upsertPayment(user.uid, newPayment)
    // Reset form and close dialog
    setNewCustomName("")
    setNewCustomAmount("")
    setNewCustomDate("")
    setNewCustomIsRecurring(false)
    setNewCustomDescription("")
    setIsAddingCustom(false)
  }

  const openEditCustom = (payment: Payment) => {
    if (payment.paymentType !== "custom") return
    setEditingPaymentId(payment.id)
    setEditCustomName(payment.name || "")
    setEditCustomAmount(String(payment.amount ?? ""))
    setEditCustomDate(payment.date || "")
    setEditCustomIsRecurring(Boolean(payment.isRecurring))
    setEditCustomDescription(payment.description || "")
    setIsEditingCustom(true)
  }

  const handleSaveEditCustom = async () => {
    if (!user || !editingPaymentId || !editCustomName || !editCustomAmount) return
    const updated: Partial<Payment> = {
      id: editingPaymentId,
      paymentType: "custom",
      name: editCustomName,
      amount: parseFloat(editCustomAmount),
      date: editCustomDate || undefined,
      isRecurring: editCustomIsRecurring,
      description: editCustomDescription,
    }
    await upsertPayment(user.uid, updated)
    // reset
    setIsEditingCustom(false)
    setEditingPaymentId("")
    setEditCustomName("")
    setEditCustomAmount("")
    setEditCustomDate("")
    setEditCustomIsRecurring(false)
    setEditCustomDescription("")
  }

  const handleDelete = (id: string) => {
    if (!user) return
    removePayment(user.uid, id)
  }

  const handlePay = async (payment: Payment) => {
    if (!user) return
    if (payment.status === "paid") return
    // 1) Mark payment as paid
    const todayIso = new Date().toISOString().slice(0, 10)
    await upsertPayment(user.uid, { ...payment, status: "paid", paidAt: todayIso })

    // 2) Create a gider transaction so balance decreases
  const today = todayIso
    const categoryName = payment.paymentType === "fixed"
      ? (fixedPaymentCategories.find((c) => c.id === payment.category)?.name ?? "Fatura")
      : "Özel Ödeme"
    const desc = payment.description
      ? `${payment.name} • ${payment.description}`
      : `${payment.name} Ödemesi`

  const txn: Txn = {
      id: crypto.randomUUID(),
      type: "gider",
      amount: payment.amount,
      description: desc,
      category: categoryName,
  date: payment.date || today,
  // @ts-ignore local path can carry this, Firestore will accept extra fields
  createdAt: Date.now(),
    }
  await addTxnDb(user.uid, txn)
  // Force refresh header/dashboard if snapshot lags
  try { window.dispatchEvent(new Event("transactions:refresh-request")) } catch {}
  }

  const fixedPayments = payments.filter((p) => p.paymentType === "fixed")
  const customPayments = payments.filter((p) => p.paymentType === "custom")

  const pendingFixedPayments = fixedPayments.filter((p) => p.status === "pending")
  const paidFixedPayments = fixedPayments.filter((p) => p.status === "paid")

  const pendingCustomPayments = customPayments.filter((p) => p.status === "pending")
  const paidCustomPayments = customPayments.filter((p) => p.status === "paid")

  // Filters for history panels
  const filteredPaidFixed = paidFixedPayments.filter((p) => {
    const matchesSearch = fixedSearch
      ? (p.name?.toLowerCase().includes(fixedSearch.toLowerCase()) || p.description?.toLowerCase().includes(fixedSearch.toLowerCase()))
      : true
    const monthKey = p.paidAt?.slice(0, 7) || ""
    const matchesMonth = fixedHistoryMonth ? monthKey === fixedHistoryMonth : true
    return matchesSearch && matchesMonth
  })

  const filteredPaidCustom = paidCustomPayments.filter((p) => {
    const matchesSearch = customSearch
      ? (p.name?.toLowerCase().includes(customSearch.toLowerCase()) || p.description?.toLowerCase().includes(customSearch.toLowerCase()))
      : true
    const baseDate = p.paidAt || p.date || ""
    const monthKey = baseDate.slice(0, 7)
    const matchesMonth = customHistoryMonth ? monthKey === customHistoryMonth : true
    return matchesSearch && matchesMonth
  })

  const totalFixed = fixedPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalCustom = customPayments.reduce((sum, p) => sum + p.amount, 0)
  const totalPayments = totalFixed + totalCustom

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPending = totalPayments - totalPaid

  const openCalendarWithPayments = () => {
    const today = new Date()
    const events: HighlightedDate[] = []
    for (const p of payments) {
      // For custom payments with exact date
      if (p.paymentType === "custom" && p.date) {
        const d = new Date(p.date)
        if (!isNaN(d.getTime())) {
          events.push({ date: d, type: "payment", description: `${p.name} • ₺${p.amount.toLocaleString("tr-TR")}` })
        }
      }
      // For fixed payments: map to this month's payment day
      if (p.paymentType === "fixed" && typeof p.paymentDay === "number") {
        const d = new Date(today.getFullYear(), today.getMonth(), Math.min(Math.max(1, p.paymentDay), 28))
        events.push({ date: d, type: "payment", description: `${p.name} • ₺${p.amount.toLocaleString("tr-TR")}` })
      }
    }
    openCalendar(events)
  }


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      {/* Header kaldırıldı, artık layout.tsx'de */}

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Sayfa Başlığı */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ödemeler</h1>
            <p className="text-muted-foreground mt-2">
              Sabit ve özel ödemelerinizi yönetin
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Takvim butonu kaldırıldı: sadece ana navigasyonda */}
            <Dialog open={isAddingFixed} onOpenChange={setIsAddingFixed}>
              <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Sabit Ödeme Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Sabit Ödeme Ekle</DialogTitle>
                  <DialogDescription>
                    Aylık tekrarlanan ödemelerinizi ekleyin (kira, aidat, faturalar)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={newFixedCategory} onValueChange={setNewFixedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ödeme kategorisi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {fixedPaymentCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center space-x-2">
                              <category.icon className="h-4 w-4" />
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Tutar (₺)</Label>
                    <Input id="amount" type="number" placeholder="0" value={newFixedAmount} onChange={(e) => setNewFixedAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Ödeme Tarihi</Label>
                    <Select value={newFixedPaymentDay} onValueChange={setNewFixedPaymentDay}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ayın kaçında ödenecek" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}. gün
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="recurring" defaultChecked disabled />
                    <Label htmlFor="recurring" className="text-sm">
                      Her ay tekrarla
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama (İsteğe bağlı)</Label>
                    <Textarea id="description" placeholder="Ödeme hakkında not..." value={newFixedDescription} onChange={(e) => setNewFixedDescription(e.target.value)} />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddingFixed(false)}>
                      İptal
                    </Button>
                    <Button onClick={handleAddFixedPayment}>Kaydet</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAddingCustom} onOpenChange={setIsAddingCustom}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-primary/30 hover:bg-primary/10 bg-transparent">
                  <Plus className="h-4 w-4 mr-2" />
                  Özel Ödeme Ekle
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Özel Ödeme Ekle</DialogTitle>
                  <DialogDescription>Tek seferlik veya özel ödemelerinizi ekleyin</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customName">Ödeme Adı</Label>
                    <Input id="customName" placeholder="Ödeme adını girin" value={newCustomName} onChange={(e) => setNewCustomName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customAmount">Tutar (₺)</Label>
                    <Input id="customAmount" type="number" placeholder="0" value={newCustomAmount} onChange={(e) => setNewCustomAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customDate">Ödeme Tarihi</Label>
                    <Input id="customDate" type="date" value={newCustomDate} onChange={(e) => setNewCustomDate(e.target.value)} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="customRecurring" checked={newCustomIsRecurring} onCheckedChange={setNewCustomIsRecurring} />
                    <Label htmlFor="customRecurring" className="text-sm">
                      Tekrarlı ödeme
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customDescription">Açıklama</Label>
                    <Textarea id="customDescription" placeholder="Ödeme detayları..." value={newCustomDescription} onChange={(e) => setNewCustomDescription(e.target.value)} />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddingCustom(false)}>
                      İptal
                    </Button>
                    <Button onClick={handleAddCustomPayment}>Kaydet</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Sabit Ödemeler */}
        <section>
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Repeat className="h-5 w-5 text-primary" />
                    <span>Sabit Ödemeler</span>
                  </CardTitle>
                  <CardDescription>Aylık tekrarlanan ödemeleriniz</CardDescription>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paidFixedPayments.length === 0}
                    onClick={() => setIsFixedHistoryOpen(true)}
                  >
                    Ödenmişleri Gör ({paidFixedPayments.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {fixedPayments.length === 0 ? (
                <div className="text-center py-12">
                  <Repeat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">Henüz sabit ödeme bulunmuyor</p>
                  <p className="text-muted-foreground text-sm mt-2">Kira, aidat gibi aylık ödemelerinizi ekleyin</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">Bekleyen Ödemeler</h3>
                    {pendingFixedPayments.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingFixedPayments.map((payment) => (
                          <Card key={payment.id} className="border-border/30 hover:border-primary/30 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`p-2 rounded-lg ${getCategoryColor(payment.category)} text-white`}>
                                    {(() => { const Icon = getCategoryIcon(payment.category); return <Icon className="h-5 w-5" /> })()}
                                  </div>
                                  <div>
                                    <h3 className="font-semibold text-foreground">{payment.name}</h3>
                                    <p className="text-xs text-muted-foreground">Her ayın {payment.paymentDay}. günü</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditFixed(payment)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(payment.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Tutar:</span>
                                  <span className="font-bold text-lg text-foreground">
                                    ₺{payment.amount.toLocaleString("tr-TR")}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground">Durum:</span>
                                  <Badge variant={payment.status === "paid" ? "default" : "secondary"} className="text-xs">
                                    {payment.status === "paid" ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Ödendi
                                      </>
                                    ) : (
                                      <>
                                        <Clock className="h-3 w-3 mr-1" />
                                        Bekliyor
                                      </>
                                    )}
                                  </Badge>
                                </div>
                                {payment.description && (
                                  <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                                    {payment.description}
                                  </p>
                                )}
                              </div>
                              <div className="mt-4 space-y-2">
                                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" onClick={() => handlePay(payment)} disabled={payment.status === 'paid'}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  {payment.status === 'paid' ? 'Ödendi' : 'Öde'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Bekleyen sabit ödemeniz bulunmuyor.</p>
                    )}
                  </div>

                  {paidFixedPayments.length > 0 && null}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Özel Ödemeler */}
        <section>
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    <span>Özel Ödemeler</span>
                  </CardTitle>
                  <CardDescription>Tek seferlik ve özel ödemeleriniz</CardDescription>
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={paidCustomPayments.length === 0}
                    onClick={() => setIsCustomHistoryOpen(true)}
                  >
                    Ödenmişleri Gör ({paidCustomPayments.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {customPayments.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg font-medium">Henüz özel ödeme bulunmuyor</p>
                  <p className="text-muted-foreground text-sm mt-2">Özel ödemelerinizi buraya ekleyebilirsiniz</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-4">Bekleyen Özel Ödemeler</h3>
                    {pendingCustomPayments.length > 0 ? (
                      <div className="space-y-4">
                        {pendingCustomPayments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/60 transition-colors"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="p-3 rounded-full bg-primary/20 text-primary border border-primary/30">
                                <DollarSign className="h-5 w-5" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-foreground">{payment.name}</h3>
                                <div className="flex items-center space-x-4 mt-1">
                                  <p className="text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4 inline mr-1" />
                                    {payment.date ? payment.date : "Tarih Belirtilmemiş"}
                                  </p>
                                  {payment.isRecurring && (
                                    <Badge variant="outline" className="text-xs">
                                      <Repeat className="h-3 w-3 mr-1" />
                                      Tekrarlı
                                    </Badge>
                                  )}
                                  <Badge variant={payment.status === "paid" ? "default" : "secondary"} className="text-xs">
                                    {payment.status === "paid" ? (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Ödendi
                                      </>
                                    ) : (
                                      <>
                                        <AlertCircle className="h-3 w-3 mr-1" />
                                        Bekliyor
                                      </>
                                    )}
                                  </Badge>
                                </div>
                                {payment.description && (
                                  <p className="text-xs text-muted-foreground mt-2">{payment.description}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <div className="font-bold text-lg text-foreground">
                                  ₺{payment.amount.toLocaleString("tr-TR")}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" onClick={() => openEditCustom(payment)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-500 hover:text-red-600 bg-transparent"
                                  onClick={() => handleDelete(payment.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {payment.status !== "paid" && (
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handlePay(payment)}>
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Öde
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">Bekleyen özel ödemeniz bulunmuyor.</p>
                    )}
                  </div>

                  {paidCustomPayments.length > 0 && null}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Ödeme Özeti */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-500/20 to-blue-500/5 border-blue-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bu Ay Toplam</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₺{totalPayments.toLocaleString("tr-TR")}</div>
              <p className="text-xs text-muted-foreground">Aylık ödeme toplamı</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ödenen</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₺{totalPaid.toLocaleString("tr-TR")}</div>
              <p className="text-xs text-muted-foreground">Bu ay ödenen tutar</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bekleyen</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">₺{totalPending.toLocaleString("tr-TR")}</div>
              <p className="text-xs text-muted-foreground">Ödenmesi gereken tutar</p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Sabit Ödeme Düzenle */}
      <Dialog open={isEditingFixed} onOpenChange={setIsEditingFixed}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sabit Ödeme Düzenle</DialogTitle>
            <DialogDescription>Kategori, tutar, gün ve açıklamayı güncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editFixedCategory">Kategori</Label>
              <Select value={editFixedCategory} onValueChange={setEditFixedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Ödeme kategorisi seçin" />
                </SelectTrigger>
                <SelectContent>
                  {fixedPaymentCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center space-x-2">
                        <category.icon className="h-4 w-4" />
                        <span>{category.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFixedAmount">Tutar (₺)</Label>
              <Input id="editFixedAmount" type="number" placeholder="0" value={editFixedAmount} onChange={(e) => setEditFixedAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFixedPaymentDay">Ödeme Tarihi</Label>
              <Select value={editFixedPaymentDay} onValueChange={setEditFixedPaymentDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Ayın kaçında ödenecek" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}. gün
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editFixedDescription">Açıklama</Label>
              <Textarea id="editFixedDescription" placeholder="Ödeme hakkında not..." value={editFixedDescription} onChange={(e) => setEditFixedDescription(e.target.value)} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingFixed(false)}>İptal</Button>
              <Button onClick={handleSaveEditFixed}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Özel Ödeme Düzenle */}
      <Dialog open={isEditingCustom} onOpenChange={setIsEditingCustom}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Özel Ödeme Düzenle</DialogTitle>
            <DialogDescription>Ad, tutar, tarih ve açıklamayı güncelleyin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editCustomName">Ödeme Adı</Label>
              <Input id="editCustomName" placeholder="Ödeme adını girin" value={editCustomName} onChange={(e) => setEditCustomName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCustomAmount">Tutar (₺)</Label>
              <Input id="editCustomAmount" type="number" placeholder="0" value={editCustomAmount} onChange={(e) => setEditCustomAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCustomDate">Ödeme Tarihi</Label>
              <Input id="editCustomDate" type="date" value={editCustomDate} onChange={(e) => setEditCustomDate(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="editCustomRecurring" checked={editCustomIsRecurring} onCheckedChange={setEditCustomIsRecurring} />
              <Label htmlFor="editCustomRecurring" className="text-sm">Tekrarlı ödeme</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCustomDescription">Açıklama</Label>
              <Textarea id="editCustomDescription" placeholder="Ödeme detayları..." value={editCustomDescription} onChange={(e) => setEditCustomDescription(e.target.value)} />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditingCustom(false)}>İptal</Button>
              <Button onClick={handleSaveEditCustom}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sabit Ödemeler Geçmiş Paneli */}
      <Sheet open={isFixedHistoryOpen} onOpenChange={(o)=>{ setIsFixedHistoryOpen(o); if(!o){ setFixedSearch(""); setFixedHistoryMonth("") } }}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Ödenmiş Sabit Ödemeler ({paidFixedPayments.length})</SheetTitle>
            <SheetDescription>Bu ay ve önceki aylarda ödediğiniz sabit ödemeler.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Ara (ad/açıklama)" value={fixedSearch} onChange={(e)=>setFixedSearch(e.target.value)} />
            <Input type="month" value={fixedHistoryMonth} onChange={(e)=>setFixedHistoryMonth(e.target.value)} />
          </div>
          <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {paidFixedPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz ödenmiş sabit ödeme yok.</p>
            ) : (
              filteredPaidFixed.map((payment) => (
                <Card key={payment.id} className="border-border/30 bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${getCategoryColor(payment.category)} text-white`}>
                          {(() => { const Icon = getCategoryIcon(payment.category); return <Icon className="h-5 w-5" /> })()}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{payment.name}</h3>
                          <p className="text-xs text-muted-foreground">Her ayın {payment.paymentDay}. günü</p>
                        </div>
                      </div>
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Ödendi
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Tutar:</span>
                      <span className="font-bold text-foreground">
                        ₺{payment.amount.toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Özel Ödemeler Geçmiş Paneli */}
      <Sheet open={isCustomHistoryOpen} onOpenChange={(o)=>{ setIsCustomHistoryOpen(o); if(!o){ setCustomSearch(""); setCustomHistoryMonth("") } }}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Ödenmiş Özel Ödemeler ({paidCustomPayments.length})</SheetTitle>
            <SheetDescription>Ödediğiniz tek seferlik/özel ödemeler.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Ara (ad/açıklama)" value={customSearch} onChange={(e)=>setCustomSearch(e.target.value)} />
            <Input type="month" value={customHistoryMonth} onChange={(e)=>setCustomHistoryMonth(e.target.value)} />
          </div>
          <div className="mt-4 space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {paidCustomPayments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz ödenmiş özel ödeme yok.</p>
            ) : (
              filteredPaidCustom.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border border-border/50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-full bg-green-500/20 text-green-600 border border-green-500/30">
                      <CheckCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{payment.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 inline mr-1" />
                        {payment.date ? payment.date : "Tarih Belirtilmemiş"}
                      </p>
                    </div>
                  </div>
                  <div className="font-bold text-foreground">
                    ₺{payment.amount.toLocaleString("tr-TR")}
                  </div>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
