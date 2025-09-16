"use client"

import { useState, useEffect } from "react"
import { useAuth, AuthGuard } from "@/components/auth-guard"
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
import { useCalendar } from "@/hooks/use-calendar-simple"
import { useNotifications } from "@/lib/notifications"
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
  priority?: 'low' | 'medium' | 'high'
  paymentMethod?: 'cash' | 'card' | 'bank_transfer' | 'auto_debit' | 'other'
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly'
  reminderDays?: number
  isProcessing?: boolean  // Ödeme işlemini engellemek için
}

// Mock data for development (only for guest users - minimal examples)
const mockPayments: LocalPayment[] = [
  // Mock data sadece boş state'i göstermemek için minimal örnek
]

export default function PaymentsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { addCalendarEvent, removeCalendarEvent } = useCalendar()
  const { schedulePaymentNotification, scheduleAllPaymentNotifications } = useNotifications()
  
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
    isRecurring: false,
    recurringFrequency: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    paymentMethod: 'other' as 'cash' | 'card' | 'bank_transfer' | 'auto_debit' | 'other',
    reminderDays: 3
  })

  // Watch database payments if user is authenticated
  useEffect(() => {
    if (!user?.uid || !isFirestoreReady()) return
    
    const unsubscribe = watchPayments(user.uid, (dbPaymentsList) => {
      setDbPayments(dbPaymentsList)
    })
    
    return unsubscribe || undefined
  }, [user?.uid])

  // Merge mock payments with database payments, avoiding duplicates
  const allPayments = user?.uid && isFirestoreReady() 
    ? [
        // For authenticated users: only database payments + local payments that aren't in database yet
        ...dbPayments.map(p => ({
          id: p.id || crypto.randomUUID(),
          name: p.name || 'Unnamed',
          category: p.category || 'Other',
          amount: p.amount || 0,
          dueDate: p.dueDate || undefined,
          status: (p.status as PaymentStatus) || 'pending',
          isRecurring: p.isRecurring || false,
          icon: Receipt,
          color: 'blue' as PaymentColor,
          paymentType: p.paymentType || 'custom',
          updatedAt: p.updatedAt || new Date(),
          description: p.description || '',
          priority: 'medium' as 'medium',
          paymentMethod: 'other' as 'other',
          recurringFrequency: 'monthly' as 'monthly',
          reminderDays: 3
        })),
        // Add local payments that don't exist in database (newly created, not yet synced)
        ...payments.filter(localPayment => 
          !dbPayments.some(dbPayment => dbPayment.id === localPayment.id)
        )
      ]
    : [
        // For guest users: use mock payments + local payments
        ...mockPayments,
        ...payments
      ]

  const totalAmount = allPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const pendingPayments = allPayments.filter(p => p.status === 'pending')
  const paidPayments = allPayments.filter(p => p.status === 'paid')
  const pendingAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0)
  const paidAmount = paidPayments.reduce((sum, payment) => sum + payment.amount, 0)

  // Sayfa yüklendiğinde ve ödemeler değiştiğinde bildirim planlamasını yap
  useEffect(() => {
    if (pendingPayments.length > 0) {
      scheduleAllPaymentNotifications(pendingPayments)
    }
  }, [pendingPayments, scheduleAllPaymentNotifications])

  // Sort by due date (earliest first for pending, latest first for paid)
  const sortPaymentsByDate = (payments: LocalPayment[]) => {
    return payments.sort((a, b) => {
      // First sort by priority (high -> medium -> low)
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      const priorityA = priorityOrder[a.priority || 'medium']
      const priorityB = priorityOrder[b.priority || 'medium']
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA // Higher priority first
      }
      
      // Handle payments without dates - put them at the end for pending, keep in order for paid
      if (!a.dueDate && !b.dueDate) {
        // Both have no date, sort by name
        return a.name.localeCompare(b.name, 'tr-TR')
      }
      
      if (a.status === 'pending') {
        if (!a.dueDate) return 1  // Tarihsiz pending ödemeler sona
        if (!b.dueDate) return -1
      }
      
      // Then sort by date
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : (a.status === 'pending' ? Infinity : Date.now())
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : (b.status === 'pending' ? Infinity : Date.now())
      
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
      dueDate: newPayment.dueDate || undefined, // Tarih belirtilmemişse undefined olarak kaydet
      status: 'pending',
      isRecurring: newPayment.isRecurring,
      icon: Receipt,
      color: 'blue',
      paymentType: 'custom',
      updatedAt: new Date(),
      description: newPayment.description,
      priority: newPayment.priority,
      paymentMethod: newPayment.paymentMethod,
      recurringFrequency: newPayment.recurringFrequency,
      reminderDays: newPayment.reminderDays
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
          isRecurring: paymentData.isRecurring,
          paymentType: 'custom'
        }
        
        const savedPaymentId = await upsertPayment(user.uid, dbPayment)
        
        if (savedPaymentId) {
          // Update the payment data with the database ID
          paymentData.id = savedPaymentId
        }
        
        toast({
          title: "Ödeme eklendi",
          description: `${paymentData.name} başarıyla kaydedildi.`
        })
      } catch (error: any) {
        console.error('Error saving payment:', error)
        console.log('User UID:', user?.uid)
        console.log('Firestore ready:', isFirestoreReady())
        toast({
          title: "Hata",
          description: `Ödeme kaydedilirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
          variant: "destructive"
        })
        // Still add to local state even if database fails
        setPayments(prev => [...prev, paymentData])
        return // Early return to avoid adding twice
      }
    }
    
    // Add to local state (with updated ID from database if saved successfully)
    setPayments(prev => [...prev, paymentData])
    
    // Add to calendar if dueDate is provided
    if (paymentData.dueDate) {
      const calendarEvent = {
        id: paymentData.id, // Add payment ID to calendar event
        date: new Date(paymentData.dueDate),
        type: 'payment' as const,
        description: `${paymentData.name} • ₺${paymentData.amount.toLocaleString("tr-TR")}`,
        amount: paymentData.amount,
        title: paymentData.name,
        category: paymentData.category
      }
      addCalendarEvent(calendarEvent)
      
      // Ödeme bildirimi planla
      schedulePaymentNotification(paymentData)
    }
    
    setNewPayment({
      name: '',
      category: '',
      amount: '',
      dueDate: '',
      isRecurring: false,
      recurringFrequency: 'monthly',
      description: '',
      priority: 'medium',
      paymentMethod: 'other',
      reminderDays: 3
    })
    setIsAddDialogOpen(false)
  }

  const handleEditPayment = async () => {
    if (!editingPayment || !newPayment.name || !newPayment.amount) return
    
    const updatedPayment: LocalPayment = {
      ...editingPayment,
      name: newPayment.name,
      category: newPayment.category || 'Other',
      amount: parseFloat(newPayment.amount),
      dueDate: newPayment.dueDate || undefined, // Tarih belirtilmemişse undefined olarak kaydet
      isRecurring: newPayment.isRecurring,
      updatedAt: new Date(),
      description: newPayment.description,
      priority: newPayment.priority,
      paymentMethod: newPayment.paymentMethod,
      recurringFrequency: newPayment.recurringFrequency,
      reminderDays: newPayment.reminderDays
    }
    
    // Update in database if user is authenticated
    if (user?.uid && isFirestoreReady()) {
      try {
        const dbPayment = dbPayments.find(p => p.id === editingPayment.id)
        if (dbPayment) {
          const updatedDbPayment: Partial<Payment> = {
            ...dbPayment,
            name: updatedPayment.name,
            category: updatedPayment.category,
            amount: updatedPayment.amount,
            dueDate: updatedPayment.dueDate,
            isRecurring: updatedPayment.isRecurring
          }
          await upsertPayment(user.uid, updatedDbPayment)
        }
        toast({
          title: "Ödeme güncellendi",
          description: `${updatedPayment.name} başarıyla güncellendi.`
        })
      } catch (error: any) {
        console.error('Error updating payment:', error)
        console.log('User UID:', user?.uid)
        console.log('Firestore ready:', isFirestoreReady())
        toast({
          title: "Hata",
          description: `Ödeme güncellenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
          variant: "destructive"
        })
        // Still update local state even if database fails
      }
    }
    
    // Update local state
    setPayments(prev => prev.map(p => p.id === editingPayment.id ? updatedPayment : p))
    
    // Update calendar - remove old event and add new one if dueDate exists
    if (editingPayment.dueDate) {
      // Remove old calendar event
      removeCalendarEvent(editingPayment.id)
    }
    
    if (updatedPayment.dueDate) {
      // Add new calendar event
      addCalendarEvent({
        id: updatedPayment.id,
        date: new Date(updatedPayment.dueDate),
        type: 'payment',
        description: `${updatedPayment.name} • ₺${updatedPayment.amount.toLocaleString("tr-TR")}`,
        amount: updatedPayment.amount,
        title: updatedPayment.name,
        category: updatedPayment.category
      })
    }
    
    // Reset form
    setNewPayment({
      name: '',
      category: '',
      amount: '',
      dueDate: '',
      isRecurring: false,
      recurringFrequency: 'monthly',
      description: '',
      priority: 'medium',
      paymentMethod: 'other',
      reminderDays: 3
    })
    setEditingPayment(null)
    setIsAddDialogOpen(false)
  }

  const startEditPayment = (payment: LocalPayment) => {
    setEditingPayment(payment)
    setNewPayment({
      name: payment.name,
      category: payment.category || '',
      amount: payment.amount.toString(),
      dueDate: payment.dueDate || '',
      isRecurring: payment.isRecurring || false,
      recurringFrequency: payment.recurringFrequency || 'monthly',
      description: payment.description || '',
      priority: payment.priority || 'medium',
      paymentMethod: payment.paymentMethod || 'other',
      reminderDays: payment.reminderDays || 3
    })
    setIsAddDialogOpen(true)
  }

  const cancelEdit = () => {
    setEditingPayment(null)
    setNewPayment({
      name: '',
      category: '',
      amount: '',
      dueDate: '',
      isRecurring: false,
      recurringFrequency: 'monthly',
      description: '',
      priority: 'medium',
      paymentMethod: 'other',
      reminderDays: 3
    })
    setIsAddDialogOpen(false)
  }

  const togglePaymentStatus = async (paymentId: string) => {
    console.log('togglePaymentStatus called with ID:', paymentId)
    
    // Check if this is a mock payment (guest mode)
    if (paymentId.startsWith('mock-')) {
      console.log('Mock payment detected - guest mode operation')
      toast({
        title: "Demo Modu",
        description: "Bu bir demo ödeme. Gerçek işlem yapmak için giriş yapın.",
        variant: "default"
      })
      return
    }
    
    // Ödemeyi allPayments'tan bul (hem local hem database ödemelerini içerir)
    const payment = allPayments.find(p => p.id === paymentId)
    console.log('Found payment:', payment)
    
    if (!payment) {
      console.error('Payment not found with ID:', paymentId)
      toast({
        title: "Hata",
        description: "Ödeme bulunamadı.",
        variant: "destructive"
      })
      return
    }
    
    const newStatus: PaymentStatus = payment.status === 'paid' ? 'pending' : 'paid'
    const originalStatus = payment.status
    
    console.log('Payment status change:', originalStatus, '->', newStatus)
    
    // Prevent duplicate operations by checking if already processing
    // allPayments'ta isProcessing olmayabilir, local payments'tan kontrol et
    const localPayment = payments.find(p => p.id === paymentId)
    if (localPayment?.isProcessing) {
      console.log('Payment already processing, skipping...')
      return
    }
    
    // Mark as processing to prevent duplicate clicks (only for local payments)
    if (localPayment) {
      setPayments(prev => prev.map(p => 
        p.id === paymentId ? { ...p, isProcessing: true } : p
      ))
    }
    
    console.log('User authenticated:', !!user?.uid, 'Firestore ready:', isFirestoreReady())
    
    try {
      // If marking as paid, add transaction to reduce balance
      if (newStatus === 'paid' && user?.uid && isFirestoreReady()) {
        // Add expense transaction first
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
        let dbPayment = dbPayments.find(p => p.id === payment.id)
        
        // If payment is not in dbPayments (newly added), create it
        if (!dbPayment) {
          dbPayment = {
            id: payment.id,
            name: payment.name,
            category: payment.category,
            amount: payment.amount,
            dueDate: payment.dueDate,
            status: originalStatus,
            isRecurring: payment.isRecurring || false,
            paymentType: 'custom',
            updatedAt: new Date()
          }
        }
        
        await upsertPayment(user.uid, { 
          ...dbPayment, 
          status: newStatus,
          paidAt: new Date().toISOString().split('T')[0]
        })
        
        console.log('Database payment updated successfully')
        
        // Update local state only if this is a local payment (not from database)
        if (localPayment) {
          setPayments(prev => prev.map(p => 
            p.id === paymentId ? { ...p, status: newStatus, isProcessing: false } : p
          ))
        }
        
        toast({
          title: "Ödeme tamamlandı",
          description: `${payment.name} ödendi ve bakiyeden ${formatTRY(payment.amount)} düşüldü.`
        })
      } else if (user?.uid && isFirestoreReady()) {
        // Just update status without adding transaction (for marking as pending)
        let dbPayment = dbPayments.find(p => p.id === payment.id)
        
        // If payment is not in dbPayments (newly added), create it
        if (!dbPayment) {
          dbPayment = {
            id: payment.id,
            name: payment.name,
            category: payment.category,
            amount: payment.amount,
            dueDate: payment.dueDate,
            status: originalStatus,
            isRecurring: payment.isRecurring || false,
            paymentType: 'custom',
            updatedAt: new Date()
          }
        }
        
        await upsertPayment(user.uid, { 
          ...dbPayment, 
          status: newStatus,
          paidAt: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : undefined
        })
        
        console.log('Database payment status updated successfully')
        
        // Update local state only if this is a local payment (not from database)
        if (localPayment) {
          setPayments(prev => prev.map(p => 
            p.id === paymentId ? { ...p, status: newStatus, isProcessing: false } : p
          ))
        }
        
        toast({
          title: newStatus === 'paid' ? "Ödeme tamamlandı" : "Ödeme durumu güncellendi",
          description: `${payment.name} durumu güncellendi.`
        })
      } else {
        console.log('Guest user - updating local state only')
        // For guest users, just update local state
        setPayments(prev => prev.map(p => 
          p.id === paymentId ? { ...p, status: newStatus, isProcessing: false } : p
        ))
      }
    } catch (error: any) {
      console.error('Error updating payment:', error)
      
      // Revert to original state on error (only for local payments)
      if (localPayment) {
        setPayments(prev => prev.map(p => 
          p.id === paymentId ? { ...p, status: originalStatus, isProcessing: false } : p
        ))
      }
      
      toast({
        title: "Hata",
        description: `Ödeme durumu güncellenirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`,
        variant: "destructive"
      })
    }
  }

  const handleDeletePayment = async (paymentId: string) => {
    const payment = allPayments.find(p => p.id === paymentId)
    if (!payment) return
    
    if (user?.uid && isFirestoreReady()) {
      // Check if payment exists in database
      const dbPayment = dbPayments.find(p => p.id === paymentId)
      if (dbPayment) {
        // Payment exists in database, remove from database
        try {
          await removePayment(user.uid, paymentId)
          // Update dbPayments state
          setDbPayments(prev => prev.filter(p => p.id !== paymentId))
          toast({
            title: "Ödeme silindi",
            description: `${payment.name} başarıyla silindi.`
          })
        } catch (error) {
          console.error('Error deleting payment from database:', error)
          toast({
            title: "Hata",
            description: "Ödeme silinirken bir hata oluştu.",
            variant: "destructive"
          })
          return // Exit early on error
        }
      }
      
      // Also remove from local state (for both DB and local-only payments)
      setPayments(prev => prev.filter(p => p.id !== paymentId))
      
      // Remove from calendar if it has a due date
      if (payment.dueDate) {
        removeCalendarEvent(paymentId)
      }
    } else {
      // Remove from local state for guest users
      setPayments(prev => prev.filter(p => p.id !== paymentId))
      // Remove from calendar if it has a due date
      if (payment.dueDate) {
        removeCalendarEvent(paymentId)
      }
      toast({
        title: "Ödeme silindi",
        description: `${payment.name} başarıyla silindi.`
      })
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-chart-3/5">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-primary via-chart-2 to-chart-3">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative container mx-auto px-4 py-12">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6">
              <Receipt className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
              Ödemeler
            </h1>
            <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Tüm ödemelerinizi takip edin, hatırlatıcılar alın ve mali yükümlülüklerinizi kolayca yönetin
            </p>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-1 sm:px-4 py-2 sm:py-8 space-y-3 sm:space-y-8 max-w-full overflow-hidden">
        {/* Analytics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Toplam Ödemeler</CardTitle>
              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold">{formatTRY(totalAmount)}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{allPayments.length} ödeme</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Bekleyen</CardTitle>
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold">{formatTRY(pendingAmount)}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{pendingPayments.length} ödeme bekliyor</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Ödendi</CardTitle>
              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold">{formatTRY(paidAmount)}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">{paidPayments.length} ödeme tamamlandı</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-chart-3/20 to-chart-3/5 border-chart-3/30 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-xs sm:text-sm font-medium">Tamamlanma</CardTitle>
              <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
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
              <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPayment ? 'Ödeme Düzenle' : 'Yeni Ödeme Ekle'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPayment 
                      ? 'Ödeme bilgilerini düzenleyin.'
                      : 'Takip etmek istediğiniz yeni bir ödeme ekleyin.'
                    }
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
                    <Label htmlFor="dueDate">Son Ödeme Tarihi (İsteğe Bağlı)</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newPayment.dueDate}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, dueDate: e.target.value }))}
                      placeholder="Tarih belirtmezseniz 'Tarihsiz' olarak kaydedilir"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Açıklama (Opsiyonel)</Label>
                    <Input
                      id="description"
                      value={newPayment.description}
                      onChange={(e) => setNewPayment(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ödeme detayları..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="priority">Öncelik</Label>
                    <Select value={newPayment.priority} onValueChange={(value: 'low' | 'medium' | 'high') => setNewPayment(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Öncelik seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">🔴 Yüksek</SelectItem>
                        <SelectItem value="medium">🟡 Orta</SelectItem>
                        <SelectItem value="low">🟢 Düşük</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="paymentMethod">Ödeme Yöntemi</Label>
                    <Select value={newPayment.paymentMethod} onValueChange={(value: any) => setNewPayment(prev => ({ ...prev, paymentMethod: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Ödeme yöntemi seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto_debit">💳 Otomatik Ödeme</SelectItem>
                        <SelectItem value="bank_transfer">🏦 Banka Havalesi</SelectItem>
                        <SelectItem value="card">💳 Kredi/Banka Kartı</SelectItem>
                        <SelectItem value="cash">💵 Nakit</SelectItem>
                        <SelectItem value="other">📋 Diğer</SelectItem>
                      </SelectContent>
                    </Select>
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

                  {newPayment.isRecurring && (
                    <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <div>
                        <Label htmlFor="recurringFrequency">Tekrar Sıklığı</Label>
                        <Select value={newPayment.recurringFrequency} onValueChange={(value: any) => setNewPayment(prev => ({ ...prev, recurringFrequency: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sıklık seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">📅 Aylık</SelectItem>
                            <SelectItem value="quarterly">📅 3 Aylık</SelectItem>
                            <SelectItem value="yearly">📅 Yıllık</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="reminderDays">Hatırlatma (Gün Önceden)</Label>
                        <Select value={newPayment.reminderDays.toString()} onValueChange={(value) => setNewPayment(prev => ({ ...prev, reminderDays: parseInt(value) }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Hatırlatma seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 gün önce</SelectItem>
                            <SelectItem value="3">3 gün önce</SelectItem>
                            <SelectItem value="7">1 hafta önce</SelectItem>
                            <SelectItem value="14">2 hafta önce</SelectItem>
                            <SelectItem value="30">1 ay önce</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={editingPayment ? handleEditPayment : handleAddPayment} 
                    className="flex-1"
                  >
                    {editingPayment ? 'Güncelle' : 'Ekle'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={editingPayment ? cancelEdit : () => setIsAddDialogOpen(false)}
                  >
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
              <CardContent className="p-2 sm:p-6 max-w-full overflow-hidden">
                {pendingFilteredPayments.length === 0 ? (
                  <div className="text-center py-6 sm:py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm sm:text-base">
                      {searchTerm 
                        ? `"${searchTerm}" araması için bekleyen ödeme bulunamadı`
                        : 'Bekleyen ödeme bulunmuyor'
                      }
                    </p>
                  </div>
                ) : (
                  <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-1 sm:gap-3 lg:gap-4 overflow-x-hidden' : 'space-y-1 sm:space-y-3 overflow-x-hidden'}>
                    {pendingFilteredPayments.map((payment) => {
                      const IconComponent = payment.icon
                      // Tarihsiz ödemeler gecikmiş sayılmaz
                      const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date() && payment.status === 'pending'
                      
                      return (
                        <div 
                          key={payment.id}
                          className={`p-2 sm:p-3 md:p-4 border rounded-lg transition-all relative max-w-full overflow-hidden ${
                            viewMode === 'list' ? 'flex items-center justify-between' : ''
                          } ${isOverdue ? 'border-red-500/30 bg-red-500/10' : ''}`}
                        >
                          <div className={`flex items-center gap-2 sm:gap-3 ${viewMode === 'grid' ? 'mb-3' : ''}`}>
                            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${
                              payment.color === 'yellow' ? 'bg-yellow-500/20' :
                              payment.color === 'blue' ? 'bg-primary/20' :
                              payment.color === 'green' ? 'bg-green-500/20' :
                              'bg-muted'
                            }`}>
                              <IconComponent className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                payment.color === 'yellow' ? 'text-yellow-600' :
                                payment.color === 'blue' ? 'text-primary' :
                                payment.color === 'green' ? 'text-green-600' :
                                'text-muted-foreground'
                              }`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium flex items-center gap-2 text-sm sm:text-base truncate">
                                <span className="truncate">{payment.name}</span>
                                {/* Priority indicator */}
                                {payment.priority === 'high' && <span className="text-xs flex-shrink-0">🔴</span>}
                                {payment.priority === 'medium' && <span className="text-xs flex-shrink-0">🟡</span>}
                                {payment.priority === 'low' && <span className="text-xs flex-shrink-0">🟢</span>}
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{payment.category}</p>
                              {payment.description && (
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{payment.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className={`${viewMode === 'grid' ? 'space-y-3' : 'flex items-center gap-2 sm:gap-4'}`}>
                            <div className="text-right">
                              <div className="font-semibold text-sm sm:text-base">{formatTRY(payment.amount)}</div>
                              <div className={`text-xs sm:text-sm ${isOverdue ? 'text-red-700 font-semibold' : 'text-muted-foreground'}`}>
                                {isOverdue && '⚠️ '}
                                {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('tr-TR') : '📅 Tarihsiz'}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                              {/* Payment Method Badge */}
                              {payment.paymentMethod && (
                                <Badge variant="outline" className="text-xs px-1 sm:px-2 hidden sm:inline-flex">
                                  {payment.paymentMethod === 'auto_debit' && '💳 Otomatik'}
                                  {payment.paymentMethod === 'bank_transfer' && '🏦 Havale'}
                                  {payment.paymentMethod === 'card' && '💳 Kart'}
                                  {payment.paymentMethod === 'cash' && '💵 Nakit'}
                                  {payment.paymentMethod === 'other' && '📋 Diğer'}
                                </Badge>
                              )}
                              
                              {/* Mobile simplified badge */}
                              {payment.paymentMethod && (
                                <Badge variant="outline" className="text-xs px-1 sm:hidden">
                                  {payment.paymentMethod === 'auto_debit' && '💳'}
                                  {payment.paymentMethod === 'bank_transfer' && '🏦'}
                                  {payment.paymentMethod === 'card' && '💳'}
                                  {payment.paymentMethod === 'cash' && '💵'}
                                  {payment.paymentMethod === 'other' && '📋'}
                                </Badge>
                              )}
                              
                              <Badge 
                                variant="destructive"
                                className={`text-xs px-1 sm:px-2 ${
                                  isOverdue
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : !payment.dueDate
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-orange-600 text-white hover:bg-orange-700'
                                } cursor-pointer transition-colors`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePaymentStatus(payment.id)
                                }}
                              >
                                <Clock className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">
                                  {isOverdue ? 'Gecikmiş' : !payment.dueDate ? 'Tarihsiz' : 'Bekliyor'}
                                </span>
                                <span className="sm:hidden">
                                  {isOverdue ? 'Geç' : !payment.dueDate ? 'Tarihsiz' : 'Bekli'}
                                </span>
                              </Badge>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 sm:h-7 px-1 sm:px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditPayment(payment)
                                }}
                              >
                                <span className="hidden sm:inline">Düzenle</span>
                                <span className="sm:hidden">✏️</span>
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 sm:h-7 px-1 sm:px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (confirm(`"${payment.name}" ödemesini silmek istediğinizden emin misiniz?`)) {
                                    await handleDeletePayment(payment.id)
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1 hidden sm:inline" />
                                <Trash2 className="w-3 h-3 sm:hidden" />
                                <span className="hidden sm:inline">Sil</span>
                              </Button>

                              <Button
                                variant="default"
                                size="sm"
                                className="h-6 sm:h-7 px-1 sm:px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePaymentStatus(payment.id)
                                }}
                                disabled={payment.isProcessing}
                              >
                                {payment.isProcessing ? (
                                  <>
                                    <div className="w-3 h-3 mr-1 animate-spin border border-white border-t-transparent rounded-full" />
                                    <span className="hidden sm:inline">İşleniyor</span>
                                    <span className="sm:hidden">⏳</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-3 h-3 mr-1 hidden sm:inline" />
                                    <span className="hidden sm:inline">Öde</span>
                                    <span className="sm:hidden">✅</span>
                                  </>
                                )}
                              </Button>
                              
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
                          className={`p-4 border rounded-lg transition-all relative bg-green-500/5 border-green-500/20 ${
                            viewMode === 'list' ? 'flex items-center justify-between' : ''
                          }`}
                        >
                          <div className={`flex items-center gap-3 ${viewMode === 'grid' ? 'mb-3' : ''}`}>
                            <div className={`p-2 rounded-lg ${
                              payment.color === 'yellow' ? 'bg-yellow-500/20' :
                              payment.color === 'blue' ? 'bg-primary/20' :
                              payment.color === 'green' ? 'bg-green-500/20' :
                              'bg-muted'
                            }`}>
                              <IconComponent className={`w-5 h-5 ${
                                payment.color === 'yellow' ? 'text-yellow-600' :
                                payment.color === 'blue' ? 'text-primary' :
                                payment.color === 'green' ? 'text-green-600' :
                                'text-muted-foreground'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-medium flex items-center gap-2">
                                {payment.name}
                                {/* Priority indicator */}
                                {payment.priority === 'high' && <span className="text-xs">🔴</span>}
                                {payment.priority === 'medium' && <span className="text-xs">🟡</span>}
                                {payment.priority === 'low' && <span className="text-xs">🟢</span>}
                              </h3>
                              <p className="text-sm text-muted-foreground">{payment.category}</p>
                              {payment.description && (
                                <p className="text-xs text-muted-foreground mt-1">{payment.description}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className={`${viewMode === 'grid' ? 'space-y-2' : 'flex items-center gap-4'}`}>
                            <div className="text-right">
                              <div className="font-semibold">{formatTRY(payment.amount)}</div>
                              <div className="text-sm text-muted-foreground">
                                {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString('tr-TR') : '📅 Tarihsiz'}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Payment Method Badge */}
                              {payment.paymentMethod && (
                                <Badge variant="outline" className="text-xs">
                                  {payment.paymentMethod === 'auto_debit' && '💳 Otomatik'}
                                  {payment.paymentMethod === 'bank_transfer' && '🏦 Havale'}
                                  {payment.paymentMethod === 'card' && '💳 Kart'}
                                  {payment.paymentMethod === 'cash' && '💵 Nakit'}
                                  {payment.paymentMethod === 'other' && '📋 Diğer'}
                                </Badge>
                              )}
                              
                              <Badge 
                                variant="secondary"
                                className="bg-green-600 text-white hover:bg-green-700 cursor-pointer transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePaymentStatus(payment.id)
                                }}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Ödendi
                              </Badge>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  togglePaymentStatus(payment.id)
                                }}
                                disabled={payment.isProcessing}
                              >
                                {payment.isProcessing ? (
                                  <>
                                    <div className="w-3 h-3 mr-1 animate-spin border border-orange-600 border-t-transparent rounded-full" />
                                    İşleniyor
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    Geri Al
                                  </>
                                )}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  startEditPayment(payment)
                                }}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Düzenle
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  if (confirm(`"${payment.name}" ödemesini silmek istediğinizden emin misiniz?`)) {
                                    await handleDeletePayment(payment.id)
                                  }
                                }}
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                Sil
                              </Button>
                              
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
    </AuthGuard>
  )
}
