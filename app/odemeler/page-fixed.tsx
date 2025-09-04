"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
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
  PieChart,
  BarChart3,
  Filter,
  Grid3X3,
  List,
  Search,
} from "lucide-react"
import { formatTRY } from "@/lib/utils"
import { 
  watchPayments, 
  upsertPayment, 
  removePayment, 
  addTransaction as addTransactionDb,
  isFirestoreReady 
} from "@/lib/db"
import type { Payment } from "@/lib/types"

type PaymentStatus = 'pending' | 'paid'
type PaymentColor = 'yellow' | 'blue' | 'green'

interface LocalPayment extends Payment {
  icon: any
  color: PaymentColor
}

// Mock data for development
const mockPayments: LocalPayment[] = [
  {
    id: '1',
    name: 'Elektrik Faturası',
    category: 'Utilities',
    amount: 450,
    dueDate: '2025-09-15',
    status: 'pending',
    isRecurring: true,
    icon: Zap,
    color: 'yellow',
    paymentType: 'fixed',
    updatedAt: new Date(),
    description: 'Elektrik faturası'
  },
  {
    id: '2', 
    name: 'Kira',
    category: 'Housing',
    amount: 8500,
    dueDate: '2025-09-01',
    status: 'paid',
    isRecurring: true,
    icon: Building,
    color: 'blue',
    paymentType: 'fixed',
    updatedAt: new Date(),
    description: 'Aylık kira ödemesi'
  }
]

export default function PaymentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [payments, setPayments] = useState<LocalPayment[]>(mockPayments)
  const [dbPayments, setDbPayments] = useState<Payment[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<LocalPayment | null>(null)
  const [newPayment, setNewPayment] = useState({
    name: '',
    category: '',
    amount: '',
    dueDate: '',
    isRecurring: false
  })

  // Watch database payments if user is authenticated
  useEffect(() => {
    if (!user?.uid || !isFirestoreReady()) return
    
    const unsubscribe = watchPayments(user.uid, (dbPaymentsList) => {
      setDbPayments(dbPaymentsList)
    })
    
    return unsubscribe || undefined
  }, [user?.uid])

  // Merge mock payments with database payments
  const allPayments = [...payments, ...dbPayments.map(p => ({
    id: p.id || crypto.randomUUID(),
    name: p.name || 'Unnamed',
    category: p.category || 'Other',
    amount: p.amount || 0,
    dueDate: p.dueDate || new Date().toISOString().split('T')[0],
    status: (p.status as PaymentStatus) || 'pending',
    isRecurring: p.isRecurring || false,
    icon: Receipt,
    color: 'blue' as PaymentColor,
    paymentType: p.paymentType || 'custom',
    updatedAt: p.updatedAt || new Date(),
    description: p.description || ''
  } as LocalPayment))]

  const totalAmount = allPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const pendingPayments = allPayments.filter(p => p.status === 'pending')
  const paidPayments = allPayments.filter(p => p.status === 'paid')
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const paidAmount = paidPayments.reduce((sum, payment) => sum + payment.amount, 0)

  // Sort by due date (earliest first for pending, latest first for paid)
  const sortPaymentsByDate = (payments: LocalPayment[]) => {
    return payments.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0
      
      if (a.status === 'pending' && b.status === 'pending') {
        // For pending: earliest first (urgent ones on top)
        return dateA - dateB
      } else if (a.status === 'paid' && b.status === 'paid') {
        // For paid: latest first (recent payments on top)
        return dateB - dateA
      }
      
      // Mixed status: pending first
      return a.status === 'pending' ? -1 : 1
    })
  }

  // Filter and sort functions for each tab
  const getFilteredPayments = (status: 'pending' | 'paid') => {
    const filtered = (allPayments as LocalPayment[]).filter(payment => {
      const matchesStatus = payment.status === status
      const matchesSearch = payment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (payment.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      return matchesStatus && matchesSearch
    })
    return sortPaymentsByDate(filtered)
  }

  const pendingFilteredPayments = getFilteredPayments('pending')
  const paidFilteredPayments = getFilteredPayments('paid')

  const handleAddPayment = async () => {
    if (!newPayment.name || !newPayment.amount) return
    
    const paymentData: LocalPayment = {
      id: Date.now().toString(),
      name: newPayment.name,
      category: newPayment.category || 'Other',
      amount: parseFloat(newPayment.amount),
      dueDate: newPayment.dueDate,
      status: 'pending',
      isRecurring: newPayment.isRecurring,
      icon: Receipt,
      color: 'blue',
      paymentType: 'custom',
      updatedAt: new Date(),
      description: newPayment.name
    }
    
    // Save to database if user is authenticated
    if (user?.uid && isFirestoreReady()) {
      try {
        const dbPayment: Partial<Payment> = {
          name: paymentData.name,
          category: paymentData.category,
          amount: paymentData.amount,
          dueDate: paymentData.dueDate,
          status: paymentData.status,
          isRecurring: paymentData.isRecurring
        }
        await upsertPayment(user.uid, dbPayment)
        toast({
          title: "Ödeme eklendi",
          description: `${paymentData.name} başarıyla kaydedildi.`
        })
      } catch (error) {
        console.error('Error saving payment:', error)
        toast({
          title: "Hata",
          description: "Ödeme kaydedilirken bir hata oluştu.",
          variant: "destructive"
        })
      }
    } else {
      // Add to local state for guest users
      setPayments(prev => [...prev, paymentData])
    }
    
    setNewPayment({
      name: '',
      category: '',
      amount: '',
      dueDate: '',
      isRecurring: false
    })
    setIsAddDialogOpen(false)
  }

  const togglePaymentStatus = async (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId)
    if (!payment) return
    
    const newStatus: PaymentStatus = payment.status === 'paid' ? 'pending' : 'paid'
    
    // Update local state immediately for better UX
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, status: newStatus } : p
    ))
    
    // If marking as paid, add transaction to reduce balance
    if (newStatus === 'paid' && user?.uid && isFirestoreReady()) {
      try {
        // Add expense transaction
        const transaction = {
          id: crypto.randomUUID(),
          type: 'gider' as const,
          amount: payment.amount,
          description: `Ödeme: ${payment.name}`,
          category: 'Ödeme',
          date: new Date().toISOString().split('T')[0]
        }
        
        await addTransactionDb(user.uid, transaction)
        
        // Update payment status in database
        const dbPayment = dbPayments.find(p => p.id === payment.id)
        if (dbPayment) {
          await upsertPayment(user.uid, { 
            ...dbPayment, 
            status: newStatus,
            paidAt: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
          })
        }
        
        toast({
          title: "Ödeme tamamlandı",
          description: `${payment.name} ödendi ve bakiyeden ${formatTRY(payment.amount)} düşüldü.`
        })
      } catch (error) {
        console.error('Error updating payment:', error)
        // Revert local state on error
        setPayments(prev => prev.map(p => 
          p.id === paymentId ? { ...p, status: payment.status } : p
        ))
        toast({
          title: "Hata",
          description: "Ödeme durumu güncellenirken bir hata oluştu.",
          variant: "destructive"
        })
      }
    } else if (user?.uid && isFirestoreReady()) {
      // Just update status without adding transaction (for marking as pending)
      try {
        const dbPayment = dbPayments.find(p => p.id === payment.id)
        if (dbPayment) {
          await upsertPayment(user.uid, { ...dbPayment, status: newStatus })
        }
      } catch (error) {
        console.error('Error updating payment status:', error)
        // Revert local state on error
        setPayments(prev => prev.map(p => 
          p.id === paymentId ? { ...p, status: payment.status } : p
        ))
      }
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId)
    if (!payment) return
    
    if (user?.uid && isFirestoreReady()) {
      const dbPayment = dbPayments.find(p => p.id === paymentId)
      if (dbPayment) {
        try {
          await removePayment(user.uid, paymentId)
          toast({
            title: "Ödeme silindi",
            description: `${payment.name} başarıyla silindi.`
          })
        } catch (error) {
          console.error('Error deleting payment:', error)
          toast({
            title: "Hata",
            description: "Ödeme silinirken bir hata oluştu.",
            variant: "destructive"
          })
        }
      }
    } else {
      // Remove from local state for guest users
      setPayments(prev => prev.filter(p => p.id !== paymentId))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-blue-50/20 to-purple-50/20">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <Receipt className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Ödemeler</h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Tüm ödemelerinizi takip edin, hatırlatıcılar alın ve mali yükümlülüklerinizi kolayca yönetin
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Toplam Ödemeler</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">{formatTRY(totalAmount)}</div>
              <p className="text-xs text-blue-600 mt-1">{allPayments.length} ödeme</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-700">Bekleyen</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">{formatTRY(pendingAmount)}</div>
              <p className="text-xs text-orange-600 mt-1">{pendingPayments.length} ödeme bekliyor</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Ödendi</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">{formatTRY(paidAmount)}</div>
              <p className="text-xs text-green-600 mt-1">{paidPayments.length} ödeme tamamlandı</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-700">Tamamlanma</CardTitle>
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {allPayments.length > 0 ? Math.round((paidPayments.length / allPayments.length) * 100) : 0}%
              </div>
              <Progress 
                value={allPayments.length > 0 ? (paidPayments.length / allPayments.length) * 100 : 0} 
                className="mt-2"
              />
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          {/* Search and View Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Ödeme ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                Liste
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Kart
              </Button>
            </div>
          </div>
        </div>

        {/* Payments Tabs */}
        <Tabs defaultValue="pending" className="w-full">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-6">
            <TabsList className="grid w-full sm:w-auto grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Bekleyen ({pendingFilteredPayments.length})
              </TabsTrigger>
              <TabsTrigger value="paid" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Ödendi ({paidFilteredPayments.length})
              </TabsTrigger>
            </TabsList>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni Ödeme
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Yeni Ödeme Ekle</DialogTitle>
                  <DialogDescription>
                    Takip etmek istediğiniz yeni bir ödeme ekleyin.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Ödeme Adı</Label>
                    <Input
                      id="name"
                      value={newPayment.name}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="örn. Elektrik Faturası"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={newPayment.category} onValueChange={(value) => setNewPayment(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Housing">Konut</SelectItem>
                        <SelectItem value="Utilities">Faturalar</SelectItem>
                        <SelectItem value="Transportation">Ulaşım</SelectItem>
                        <SelectItem value="Insurance">Sigorta</SelectItem>
                        <SelectItem value="Education">Eğitim</SelectItem>
                        <SelectItem value="Healthcare">Sağlık</SelectItem>
                        <SelectItem value="Other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="amount">Tutar (₺)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dueDate">Son Ödeme Tarihi</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newPayment.dueDate}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, dueDate: e.target.value }))}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={newPayment.isRecurring}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, isRecurring: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="isRecurring">Tekrarlı ödeme</Label>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleAddPayment} className="flex-1">
                    Ekle
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    İptal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Pending Payments Tab */}
          <TabsContent value="pending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Bekleyen Ödemeler ({pendingFilteredPayments.length})</span>
                  {searchTerm && (
                    <Badge variant="outline" className="text-xs">
                      <Search className="w-3 h-3 mr-1" />
                      "{searchTerm}" için sonuçlar
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingFilteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {searchTerm 
                        ? `"${searchTerm}" araması için bekleyen ödeme bulunamadı`
                        : 'Bekleyen ödeme bulunmuyor'
                      }
                    </p>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                    {pendingFilteredPayments.map((payment) => {
                      const IconComponent = payment.icon
                      const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date() && payment.status === 'pending'
                      
                      return (
                        <div 
                          key={payment.id}
                          className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer ${
                            viewMode === 'list' ? 'flex items-center justify-between' : ''
                          } ${isOverdue ? 'border-red-200 bg-red-50/50' : ''}`}
                          onClick={() => togglePaymentStatus(payment.id)}
                        >
                          <div className={`flex items-center gap-3 ${viewMode === 'grid' ? 'mb-3' : ''}`}>
                            <div className={`p-2 rounded-lg ${
                              payment.color === 'yellow' ? 'bg-yellow-100' :
                              payment.color === 'blue' ? 'bg-blue-100' :
                              payment.color === 'green' ? 'bg-green-100' :
                              'bg-gray-100'
                            }`}>
                              <IconComponent className={`w-5 h-5 ${
                                payment.color === 'yellow' ? 'text-yellow-600' :
                                payment.color === 'blue' ? 'text-blue-600' :
                                payment.color === 'green' ? 'text-green-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h3 className="font-medium">{payment.name}</h3>
                              <p className="text-sm text-muted-foreground">{payment.category}</p>
                            </div>
                          </div>
                          
                          <div className={`${viewMode === 'grid' ? 'space-y-2' : 'flex items-center gap-4'}`}>
                            <div className="text-right">
                              <div className="font-semibold">{formatTRY(payment.amount)}</div>
                              <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                {isOverdue && '⚠️ '}
                                {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('tr-TR') : 'Tarih yok'}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant="destructive"
                                className={`${
                                  isOverdue
                                    ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                    : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                                } cursor-pointer transition-colors`}
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                {isOverdue ? 'Gecikmiş' : 'Bekliyor'}
                              </Badge>
                              
                              {payment.isRecurring && (
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Tekrarlı
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Paid Payments Tab */}
          <TabsContent value="paid" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Ödenmiş Ödemeler ({paidFilteredPayments.length})</span>
                  {searchTerm && (
                    <Badge variant="outline" className="text-xs">
                      <Search className="w-3 h-3 mr-1" />
                      "{searchTerm}" için sonuçlar
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paidFilteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>
                      {searchTerm 
                        ? `"${searchTerm}" araması için ödenmiş ödeme bulunamadı`
                        : 'Ödenmiş ödeme bulunmuyor'
                      }
                    </p>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
                    {paidFilteredPayments.map((payment) => {
                      const IconComponent = payment.icon
                      
                      return (
                        <div 
                          key={payment.id}
                          className={`p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-green-50/30 border-green-200 ${
                            viewMode === 'list' ? 'flex items-center justify-between' : ''
                          }`}
                          onClick={() => togglePaymentStatus(payment.id)}
                        >
                          <div className={`flex items-center gap-3 ${viewMode === 'grid' ? 'mb-3' : ''}`}>
                            <div className={`p-2 rounded-lg ${
                              payment.color === 'yellow' ? 'bg-yellow-100' :
                              payment.color === 'blue' ? 'bg-blue-100' :
                              payment.color === 'green' ? 'bg-green-100' :
                              'bg-gray-100'
                            }`}>
                              <IconComponent className={`w-5 h-5 ${
                                payment.color === 'yellow' ? 'text-yellow-600' :
                                payment.color === 'blue' ? 'text-blue-600' :
                                payment.color === 'green' ? 'text-green-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <h3 className="font-medium">{payment.name}</h3>
                              <p className="text-sm text-muted-foreground">{payment.category}</p>
                            </div>
                          </div>
                          
                          <div className={`${viewMode === 'grid' ? 'space-y-2' : 'flex items-center gap-4'}`}>
                            <div className="text-right">
                              <div className="font-semibold">{formatTRY(payment.amount)}</div>
                              <div className="text-sm text-muted-foreground">
                                {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('tr-TR') : 'Tarih yok'}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant="secondary"
                                className="bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer transition-colors"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Ödendi
                              </Badge>
                              
                              {payment.isRecurring && (
                                <Badge variant="outline" className="text-xs">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  Tekrarlı
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
