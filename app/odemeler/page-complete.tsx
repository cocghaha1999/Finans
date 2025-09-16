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
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
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
  Plus,
  Home,
  Receipt,
  Building,
  Car,
  Zap,
  Phone,
  Wifi,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Search,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { FadeIn, SlideUp, StaggerContainer, StaggerItem, ScalePress } from "@/components/animations"

// Type definitions
type IconType = ComponentType<{ className?: string }>
import { Payment } from "@/lib/types"
import { useCalendar, type HighlightedDate } from "@/hooks/use-calendar-simple"
import { upsertPayment, removePayment, watchPayments, addTransaction as addTxnDb } from "@/lib/db"

// Transaction type for adding to main ledger
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
  
  // Dialog states
  const [isAddingFixed, setIsAddingFixed] = useState(false)
  const [isAddingCustom, setIsAddingCustom] = useState(false)
  const [isEditingFixed, setIsEditingFixed] = useState(false)
  const [isEditingCustom, setIsEditingCustom] = useState(false)
  
  // Filter & search states
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [sortBy, setSortBy] = useState<"name" | "amount" | "date">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  // View states
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  
  // Form states for adding fixed payment
  const [fixedCategory, setFixedCategory] = useState<string>("")
  const [fixedAmount, setFixedAmount] = useState<string>("")
  const [fixedPaymentDay, setFixedPaymentDay] = useState<string>("")
  const [fixedDescription, setFixedDescription] = useState<string>("")
  
  // Form states for adding custom payment
  const [customName, setCustomName] = useState("")
  const [customAmount, setCustomAmount] = useState("")
  const [customDate, setCustomDate] = useState("")
  const [customIsRecurring, setCustomIsRecurring] = useState(false)
  const [customDescription, setCustomDescription] = useState("")
  
  // Edit states
  const [editingFixedPaymentId, setEditingFixedPaymentId] = useState<string>("")
  const [editFixedCategory, setEditFixedCategory] = useState<string>("")
  const [editFixedAmount, setEditFixedAmount] = useState<string>("")
  const [editFixedPaymentDay, setEditFixedPaymentDay] = useState<string>("")
  const [editFixedDescription, setEditFixedDescription] = useState<string>("")
  const [editingPaymentId, setEditingPaymentId] = useState<string>("")
  const [editCustomName, setEditCustomName] = useState("")
  const [editCustomAmount, setEditCustomAmount] = useState("")
  const [editCustomDate, setEditCustomDate] = useState("")
  const [editCustomIsRecurring, setEditCustomIsRecurring] = useState(false)
  const [editCustomDescription, setEditCustomDescription] = useState("")

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
    if (!user || !fixedCategory || !fixedAmount || !fixedPaymentDay) return
    const categoryInfo = fixedPaymentCategories.find((c) => c.id === fixedCategory)
    if (!categoryInfo) return

    const newPayment: Partial<Payment> = {
      paymentType: "fixed",
      category: fixedCategory,
      name: categoryInfo.name,
      amount: parseFloat(fixedAmount),
      paymentDay: parseInt(fixedPaymentDay, 10),
      status: "pending",
      description: fixedDescription,
    }
    await upsertPayment(user.uid, newPayment)
    // Reset form and close dialog
    setFixedCategory("")
    setFixedAmount("")
    setFixedPaymentDay("")
    setFixedDescription("")
    setIsAddingFixed(false)
    toast({ title: "Başarılı", description: "Sabit ödeme eklendi." })
  }

  const handleAddCustomPayment = async () => {
    if (!user || !customName || !customAmount) return

    const newPayment: Partial<Payment> = {
      paymentType: "custom",
      name: customName,
      amount: parseFloat(customAmount),
      date: customDate || undefined,
      isRecurring: customIsRecurring,
      status: "pending",
      description: customDescription,
    }
    await upsertPayment(user.uid, newPayment)
    // Reset form and close dialog
    setCustomName("")
    setCustomAmount("")
    setCustomDate("")
    setCustomIsRecurring(false)
    setCustomDescription("")
    setIsAddingCustom(false)
    toast({ title: "Başarılı", description: "Özel ödeme eklendi." })
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
    if (!user || !editingFixedPaymentId || !editFixedCategory || !editFixedAmount) return
    const categoryInfo = fixedPaymentCategories.find((c) => c.id === editFixedCategory)
    if (!categoryInfo) return

    const updated: Partial<Payment> = {
      id: editingFixedPaymentId,
      paymentType: "fixed",
      category: editFixedCategory,
      name: categoryInfo.name,
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
    toast({ title: "Başarılı", description: "Ödeme güncellendi." })
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
    toast({ title: "Başarılı", description: "Ödeme güncellendi." })
  }

  const handleDelete = (id: string) => {
    if (!user) return
    removePayment(user.uid, id)
    toast({ title: "Başarılı", description: "Ödeme silindi." })
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
      amount: -Math.abs(payment.amount),
      description: desc,
      category: categoryName,
      date: today,
    }

    try {
      await addTxnDb(user.uid, txn)
      toast({ title: "Ödeme Tamamlandı", description: `${payment.name} için ₺${payment.amount.toLocaleString("tr-TR")} ödendi.` })
    } catch (error) {
      console.error("Transaction creation failed:", error)
      toast({ title: "Hata", description: "İşlem oluşturulurken hata oluştu.", variant: "destructive" })
    }
  }

  // Calculate totals
  const totalFixed = payments
    .filter((p) => p.paymentType === "fixed")
    .reduce((sum, p) => sum + p.amount, 0)

  const totalCustom = payments
    .filter((p) => p.paymentType === "custom")
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPayments = totalFixed + totalCustom

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPending = totalPayments - totalPaid

  // Enhanced analytics
  const analytics = {
    totalPayments: payments.length,
    pendingPayments: payments.filter(p => p.status === "pending").length,
    paidPayments: payments.filter(p => p.status === "paid").length,
    overduePayments: payments.filter(p => {
      if (p.status === "paid") return false
      const today = new Date()
      if (p.paymentType === "custom" && p.date) {
        return new Date(p.date) < today
      }
      if (p.paymentType === "fixed" && p.paymentDay) {
        const paymentDate = new Date(today.getFullYear(), today.getMonth(), p.paymentDay)
        return paymentDate < today
      }
      return false
    }).length,
    avgPaymentAmount: payments.length > 0 ? totalPayments / payments.length : 0,
    completionRate: payments.length > 0 ? (payments.filter(p => p.status === "paid").length / payments.length) * 100 : 0
  }

  // Filtered and sorted payments
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (payment.description || "").toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = filterCategory === "all" || payment.category === filterCategory
    
    const matchesStatus = filterStatus === "all" || payment.status === filterStatus
    
    return matchesSearch && matchesCategory && matchesStatus
  }).sort((a, b) => {
    const factor = sortOrder === "asc" ? 1 : -1
    
    switch (sortBy) {
      case "name":
        return factor * a.name.localeCompare(b.name)
      case "amount":
        return factor * (a.amount - b.amount)
      case "date":
        if (a.paymentType === "custom" && b.paymentType === "custom") {
          return factor * ((new Date(a.date || "").getTime()) - (new Date(b.date || "").getTime()))
        }
        if (a.paymentType === "fixed" && b.paymentType === "fixed") {
          return factor * ((a.paymentDay || 0) - (b.paymentDay || 0))
        }
        return factor * a.name.localeCompare(b.name)
      default:
        return 0
    }
  })

  return (
    <FadeIn>
      <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-purple-50/20">
        {/* Hero Header Section */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="absolute inset-0 bg-grid-white/10 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
          <div className="relative container mx-auto px-4 py-12">
            <SlideUp>
              <div className="flex flex-col space-y-6 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div className="text-white">
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                    💰 Ödemeler Yönetimi
                  </h1>
                  <p className="text-blue-100 mt-3 text-lg max-w-md">
                    Sabit ve özel ödemelerinizi profesyonel bir şekilde yönetin, takip edin ve analiz edin
                  </p>
                  <div className="flex items-center mt-4 space-x-4 text-sm text-blue-200">
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-4 w-4" />
                      <span>Otomatik Takip</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <BarChart3 className="h-4 w-4" />
                      <span>Detaylı Analiz</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>Zamanında Hatırlatma</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
                  <Dialog open={isAddingFixed} onOpenChange={setIsAddingFixed}>
                    <DialogTrigger asChild>
                      <Button className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
                        <Plus className="h-4 w-4 mr-2" />
                        Sabit Ödeme Ekle
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Sabit Ödeme Ekle</DialogTitle>
                        <DialogDescription>Aylık düzenli ödemelerinizi ekleyin</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="category">Kategori</Label>
                          <Select value={fixedCategory} onValueChange={setFixedCategory}>
                            <SelectTrigger id="category">
                              <SelectValue placeholder="Kategori seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {fixedPaymentCategories.map((cat) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  <div className="flex items-center space-x-2">
                                    <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                                    <span>{cat.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amount">Tutar (₺)</Label>
                          <Input id="amount" type="number" placeholder="0" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentDay">Ödeme Günü</Label>
                          <Select value={fixedPaymentDay} onValueChange={setFixedPaymentDay}>
                            <SelectTrigger id="paymentDay">
                              <SelectValue placeholder="Ay günü seçin" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                <SelectItem key={day} value={String(day)}>
                                  {day}. gün
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Açıklama (İsteğe bağlı)</Label>
                          <Textarea id="description" placeholder="Ödeme hakkında not..." value={fixedDescription} onChange={(e) => setFixedDescription(e.target.value)} />
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
                      <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-200 font-semibold">
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
                          <Input id="customName" placeholder="Ödeme adını girin" value={customName} onChange={(e) => setCustomName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customAmount">Tutar (₺)</Label>
                          <Input id="customAmount" type="number" placeholder="0" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customDate">Ödeme Tarihi</Label>
                          <Input id="customDate" type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch id="customRecurring" checked={customIsRecurring} onCheckedChange={setCustomIsRecurring} />
                          <Label htmlFor="customRecurring" className="text-sm">
                            Tekrarlı ödeme
                          </Label>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customDescription">Açıklama</Label>
                          <Textarea id="customDescription" placeholder="Ödeme detayları..." value={customDescription} onChange={(e) => setCustomDescription(e.target.value)} />
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
            </SlideUp>
          </div>
        </div>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 space-y-8 relative -mt-16">
          {/* Analytics Dashboard */}
          <SlideUp delay={0.1}>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm font-medium">Toplam Ödeme</p>
                      <p className="text-3xl font-bold text-white mt-1">{analytics.totalPayments}</p>
                      <p className="text-blue-200 text-xs mt-1">Kayıtlı ödeme sayısı</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                      <Receipt className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 via-green-600 to-green-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm font-medium">Tamamlanan</p>
                      <p className="text-3xl font-bold text-white mt-1">{analytics.paidPayments}</p>
                      <p className="text-green-200 text-xs mt-1">Başarıyla ödenen</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                      <CheckCircle className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 via-orange-600 to-orange-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-100 text-sm font-medium">Bekleyen</p>
                      <p className="text-3xl font-bold text-white mt-1">{analytics.pendingPayments}</p>
                      <p className="text-orange-200 text-xs mt-1">Ödenmesi gereken</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm font-medium">Geciken</p>
                      <p className="text-3xl font-bold text-white mt-1">{analytics.overduePayments}</p>
                      <p className="text-red-200 text-xs mt-1">Acil dikkat gereken</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                      <AlertCircle className="h-8 w-8 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SlideUp>

          {/* Enhanced Summary Cards */}
          <SlideUp delay={0.2}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Toplam Tutar</p>
                      <p className="text-4xl font-black text-slate-800 mt-2">₺{totalPayments.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                      <DollarSign className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Tamamlanma Oranı</span>
                      <span className="font-bold text-slate-800">{analytics.completionRate.toFixed(0)}%</span>
                    </div>
                    <div className="relative">
                      <Progress value={analytics.completionRate} className="h-3 bg-slate-200" />
                      <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full" style={{width: `${analytics.completionRate}%`}}></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Ödenen Tutar</p>
                      <p className="text-4xl font-black text-slate-800 mt-2">₺{totalPaid.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-4 rounded-2xl shadow-lg">
                      <TrendingUp className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Ortalama Ödeme</span>
                      <span className="font-bold text-slate-800">₺{analytics.avgPaymentAmount.toLocaleString("tr-TR")}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">Bekleyen Tutar</p>
                      <p className="text-4xl font-black text-slate-800 mt-2">₺{totalPending.toLocaleString("tr-TR")}</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-4 rounded-2xl shadow-lg">
                      <TrendingDown className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <div className="mt-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Kalan Yüzde</span>
                      <span className="font-bold text-slate-800">{(100 - analytics.completionRate).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SlideUp>

          {/* Enhanced Filters and Controls */}
          <SlideUp delay={0.3}>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-xl">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-lg">
                      <Search className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-slate-800">Ödeme Listesi</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={viewMode === "grid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                      className={viewMode === "grid" ? "bg-blue-500 hover:bg-blue-600 text-white" : "border-blue-200 hover:bg-blue-50"}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                      className={viewMode === "list" ? "bg-blue-500 hover:bg-blue-600 text-white" : "border-blue-200 hover:bg-blue-50"}
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Ödeme ara... (isim, açıklama)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 border-slate-200 focus:border-blue-400 focus:ring-blue-400 bg-white/50 backdrop-blur-sm"
                    />
                  </div>
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-full md:w-[200px] border-slate-200 bg-white/50 backdrop-blur-sm">
                      <SelectValue placeholder="Kategori Filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🔍 Tüm Kategoriler</SelectItem>
                      {fixedPaymentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full md:w-[180px] border-slate-200 bg-white/50 backdrop-blur-sm">
                      <SelectValue placeholder="Durum Filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📋 Tüm Durumlar</SelectItem>
                      <SelectItem value="pending">⏳ Bekleyen</SelectItem>
                      <SelectItem value="paid">✅ Ödenen</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value: "name" | "amount" | "date") => setSortBy(value)}>
                    <SelectTrigger className="w-full md:w-[160px] border-slate-200 bg-white/50 backdrop-blur-sm">
                      <SelectValue placeholder="Sıralama" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="name">📝 İsim</SelectItem>
                      <SelectItem value="amount">💰 Tutar</SelectItem>
                      <SelectItem value="date">📅 Tarih</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                    className="bg-white/50 backdrop-blur-sm border-slate-200 hover:bg-slate-50 transition-all duration-200"
                  >
                    {sortOrder === "asc" ? "↗️" : "↘️"}
                  </Button>
                </div>

                <div className="relative">
                  <Separator className="bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white px-4 py-1 rounded-full border border-slate-200 shadow-sm">
                      <span className="text-xs font-medium text-slate-500">Ödeme Listesi</span>
                    </div>
                  </div>
                </div>

                {/* Payment List */}
                <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
                  <StaggerContainer>
                    {filteredPayments.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Henüz ödeme bulunmuyor</p>
                      </div>
                    ) : (
                      filteredPayments.map((payment, index) => (
                        <StaggerItem key={payment.id}>
                          <ScalePress>
                            {viewMode === "grid" ? (
                              <Card className={`transition-all duration-200 hover:shadow-lg border-l-4 ${
                                payment.status === "paid" 
                                  ? "border-l-green-500 bg-green-50/50" 
                                  : analytics.overduePayments > 0 && payment.status === "pending"
                                    ? "border-l-red-500 bg-red-50/50"
                                    : "border-l-blue-500 bg-blue-50/50"
                              }`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      {(() => {
                                        const IconComponent = getCategoryIcon(payment.category)
                                        return <IconComponent className="h-5 w-5 text-primary" />
                                      })()}
                                      <div>
                                        <CardTitle className="text-lg">{payment.name}</CardTitle>
                                        <CardDescription className="text-sm">
                                          {payment.paymentType === "fixed" ? `Her ayın ${payment.paymentDay}. günü` : payment.date}
                                        </CardDescription>
                                      </div>
                                    </div>
                                    <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                                      {payment.status === "paid" ? "Ödendi" : "Bekleyen"}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                      <span className="text-2xl font-bold text-primary">
                                        ₺{payment.amount.toLocaleString("tr-TR")}
                                      </span>
                                      <div className="flex space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => payment.paymentType === "fixed" ? openEditFixed(payment) : openEditCustom(payment)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleDelete(payment.id)}
                                          className="hover:bg-red-50 hover:border-red-200"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                        {payment.status === "pending" && (
                                          <Button
                                            size="sm"
                                            onClick={() => handlePay(payment)}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            Öde
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                    {payment.description && (
                                      <p className="text-sm text-muted-foreground border-t pt-2">
                                        {payment.description}
                                      </p>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ) : (
                              <Card className="transition-all duration-200 hover:shadow-md">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                      {(() => {
                                        const IconComponent = getCategoryIcon(payment.category)
                                        return (
                                          <div className={`p-2 rounded-full ${getCategoryColor(payment.category)} text-white`}>
                                            <IconComponent className="h-5 w-5" />
                                          </div>
                                        )
                                      })()}
                                      <div>
                                        <h3 className="font-semibold">{payment.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                          {payment.paymentType === "fixed" ? `Her ayın ${payment.paymentDay}. günü` : payment.date}
                                        </p>
                                        {payment.description && (
                                          <p className="text-xs text-muted-foreground mt-1">{payment.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                      <div className="text-right">
                                        <p className="font-bold text-lg">₺{payment.amount.toLocaleString("tr-TR")}</p>
                                        <Badge variant={payment.status === "paid" ? "default" : "secondary"} className="mt-1">
                                          {payment.status === "paid" ? "Ödendi" : "Bekleyen"}
                                        </Badge>
                                      </div>
                                      <div className="flex space-x-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => payment.paymentType === "fixed" ? openEditFixed(payment) : openEditCustom(payment)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(payment.id)}
                                          className="hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                        {payment.status === "pending" && (
                                          <Button
                                            size="sm"
                                            onClick={() => handlePay(payment)}
                                            className="bg-green-600 hover:bg-green-700"
                                          >
                                            Öde
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </ScalePress>
                        </StaggerItem>
                      ))
                    )}
                  </StaggerContainer>
                </div>
              </CardContent>
            </Card>
          </SlideUp>

          {/* Edit Fixed Payment Dialog */}
          <Dialog open={isEditingFixed} onOpenChange={setIsEditingFixed}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Sabit Ödeme Düzenle</DialogTitle>
                <DialogDescription>Sabit ödeme bilgilerini güncelleyin</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editCategory">Kategori</Label>
                  <Select value={editFixedCategory} onValueChange={setEditFixedCategory}>
                    <SelectTrigger id="editCategory">
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {fixedPaymentCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${cat.color}`}></div>
                            <span>{cat.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAmount">Tutar (₺)</Label>
                  <Input id="editAmount" type="number" value={editFixedAmount} onChange={(e) => setEditFixedAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPaymentDay">Ödeme Günü</Label>
                  <Select value={editFixedPaymentDay} onValueChange={setEditFixedPaymentDay}>
                    <SelectTrigger id="editPaymentDay">
                      <SelectValue placeholder="Ay günü seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}. gün
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDescription">Açıklama</Label>
                  <Textarea id="editDescription" value={editFixedDescription} onChange={(e) => setEditFixedDescription(e.target.value)} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditingFixed(false)}>İptal</Button>
                  <Button onClick={handleSaveEditFixed}>Kaydet</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit Custom Payment Dialog */}
          <Dialog open={isEditingCustom} onOpenChange={setIsEditingCustom}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Özel Ödeme Düzenle</DialogTitle>
                <DialogDescription>Özel ödeme bilgilerini güncelleyin</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editCustomName">Ödeme Adı</Label>
                  <Input id="editCustomName" value={editCustomName} onChange={(e) => setEditCustomName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editCustomAmount">Tutar (₺)</Label>
                  <Input id="editCustomAmount" type="number" value={editCustomAmount} onChange={(e) => setEditCustomAmount(e.target.value)} />
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
                  <Textarea id="editCustomDescription" value={editCustomDescription} onChange={(e) => setEditCustomDescription(e.target.value)} />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditingCustom(false)}>İptal</Button>
                  <Button onClick={handleSaveEditCustom}>Kaydet</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </FadeIn>
  )
}
