export type NotificationType = 
  | 'bill_due'          // Fatura vade tarihi
  | 'budget_exceeded'   // Bütçe aşımı
  | 'payment_reminder'  // Ödeme hatırlatıcısı
  | 'low_balance'       // Düşük bakiye
  | 'monthly_report'    // Aylık rapor
  | 'goal_reached'      // Hedef tamamlandı
  | 'transaction_alert' // İşlem uyarısı

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  message: string
  data?: any
  read: boolean
  createdAt: Date
  scheduledFor?: Date
  priority: 'low' | 'medium' | 'high'
  actions?: NotificationAction[]
}

export interface NotificationAction {
  id: string
  label: string
  action: string
  data?: any
}

export interface NotificationSettings {
  enabled: boolean
  billReminders: boolean
  budgetAlerts: boolean
  paymentReminders: boolean
  lowBalanceAlerts: boolean
  monthlyReports: boolean
  goalNotifications: boolean
  transactionAlerts: boolean
  reminderDaysBefore: number
  lowBalanceThreshold: number
  browserNotifications: boolean
  emailNotifications: boolean
}

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  billReminders: true,
  budgetAlerts: true,
  paymentReminders: true,
  lowBalanceAlerts: true,
  monthlyReports: true,
  goalNotifications: true,
  transactionAlerts: true,
  reminderDaysBefore: 3,
  lowBalanceThreshold: 100,
  browserNotifications: true,
  emailNotifications: false,
}

// Bildirim şablonları
export const notificationTemplates: Record<NotificationType, (data: any) => { title: string; message: string }> = {
  bill_due: (data) => ({
    title: "💳 Fatura Vadesi Yaklaşıyor",
    message: `${data.billName} faturanızın vadesi ${data.daysLeft} gün sonra (${data.dueDate}). Tutar: ${data.amount}`
  }),
  budget_exceeded: (data) => ({
    title: "⚠️ Bütçe Aşımı",
    message: `${data.category} kategorisinde bütçenizi %${data.percentage} aştınız. Harcama: ${data.spent}/${data.budget}`
  }),
  payment_reminder: (data) => ({
    title: "💰 Ödeme Hatırlatıcısı",
    message: `${data.paymentName} ödemesi için ${data.amount} ödemeniz gerekiyor.`
  }),
  low_balance: (data) => ({
    title: "💳 Düşük Bakiye Uyarısı",
    message: `${data.accountName} hesabınızda sadece ${data.balance} kaldı.`
  }),
  monthly_report: (data) => ({
    title: "📊 Aylık Finansal Rapor",
    message: `${data.month} ayı raporunuz hazır! Toplam harcama: ${data.totalExpense}, Gelir: ${data.totalIncome}`
  }),
  goal_reached: (data) => ({
    title: "🎯 Hedef Tamamlandı!",
    message: `"${data.goalName}" hedefinizi başarıyla tamamladınız! 🎉`
  }),
  transaction_alert: (data) => ({
    title: "💸 İşlem Bildirimi",
    message: `${data.amount} tutarında ${data.type === 'income' ? 'gelir' : 'gider'} eklendi: ${data.description}`
  })
}

// Browser Push Notification API
export class NotificationManager {
  private static instance: NotificationManager
  
  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager()
    }
    return NotificationManager.instance
  }

  // İzin durumunu kontrol et
  async checkPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission
  }

  // İzin iste
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  // Browser bildirimi gönder
  async sendBrowserNotification(notification: NotificationItem): Promise<void> {
    const permission = await this.checkPermission()
    if (permission !== 'granted') {
      return
    }

    const browserNotification = new Notification(notification.title, {
      body: notification.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: notification.type,
      requireInteraction: notification.priority === 'high',
      data: notification.data,
    })

    browserNotification.onclick = () => {
      window.focus()
      browserNotification.close()
      // Bildirimine tıklandığında yapılacak işlemler
      this.handleNotificationClick(notification)
    }

    // 10 saniye sonra otomatik kapat (high priority hariç)
    if (notification.priority !== 'high') {
      setTimeout(() => {
        browserNotification.close()
      }, 10000)
    }
  }

  private handleNotificationClick(notification: NotificationItem): void {
    // Bildirim tipine göre yönlendirme
    switch (notification.type) {
      case 'bill_due':
      case 'payment_reminder':
        window.location.href = '/odemeler'
        break
      case 'budget_exceeded':
        window.location.href = '/budgets'
        break
      case 'low_balance':
        window.location.href = '/kartlarim'
        break
      case 'monthly_report':
        window.location.href = '/'
        break
      default:
        window.location.href = '/'
    }
  }

  // Zamanlanmış bildirimleri kontrol et
  checkScheduledNotifications(): void {
    const now = new Date()
    const notifications = this.getStoredNotifications()
    
    notifications
      .filter(n => n.scheduledFor && n.scheduledFor <= now && !n.read)
      .forEach(notification => {
        this.sendBrowserNotification(notification)
      })
  }

  // Bildirim oluştur ve kaydet
  createNotification(
    type: NotificationType,
    data: any,
    priority: 'low' | 'medium' | 'high' = 'medium',
    scheduledFor?: Date
  ): NotificationItem {
    const template = notificationTemplates[type](data)
    const notification: NotificationItem = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title: template.title,
      message: template.message,
      data,
      read: false,
      createdAt: new Date(),
      scheduledFor,
      priority,
    }

    this.storeNotification(notification)

    // Hemen gönderilecekse browser notification gönder
    if (!scheduledFor || scheduledFor <= new Date()) {
      this.sendBrowserNotification(notification)
    }

    return notification
  }

  // Bildirimi localStorage'a kaydet
  private storeNotification(notification: NotificationItem): void {
    const notifications = this.getStoredNotifications()
    notifications.push(notification)
    localStorage.setItem('costik-notifications', JSON.stringify(notifications))
  }

  // Kaydedilmiş bildirimleri getir
  getStoredNotifications(): NotificationItem[] {
    const stored = localStorage.getItem('costik-notifications')
    if (!stored) return []
    
    try {
      return JSON.parse(stored).map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        scheduledFor: n.scheduledFor ? new Date(n.scheduledFor) : undefined
      }))
    } catch {
      return []
    }
  }

  // Bildirimi okundu olarak işaretle
  markAsRead(notificationId: string): void {
    const notifications = this.getStoredNotifications()
    const notification = notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.read = true
      localStorage.setItem('costik-notifications', JSON.stringify(notifications))
    }
  }

  // Tüm bildirimleri okundu olarak işaretle
  markAllAsRead(): void {
    const notifications = this.getStoredNotifications()
    notifications.forEach(n => n.read = true)
    localStorage.setItem('costik-notifications', JSON.stringify(notifications))
  }

  // Bildirimi sil
  deleteNotification(notificationId: string): void {
    const notifications = this.getStoredNotifications()
    const filtered = notifications.filter(n => n.id !== notificationId)
    localStorage.setItem('costik-notifications', JSON.stringify(filtered))
  }

  // Eski bildirimleri temizle (30 günden eski)
  cleanupOldNotifications(): void {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const notifications = this.getStoredNotifications()
    const filtered = notifications.filter(n => n.createdAt >= thirtyDaysAgo)
    localStorage.setItem('costik-notifications', JSON.stringify(filtered))
  }

  // Okunmamış bildirim sayısı
  getUnreadCount(): number {
    return this.getStoredNotifications().filter(n => !n.read).length
  }
}

// Kullanım için export edilecek hook
export const useNotifications = () => {
  const manager = NotificationManager.getInstance()
  
  return {
    createNotification: manager.createNotification.bind(manager),
    getNotifications: manager.getStoredNotifications.bind(manager),
    markAsRead: manager.markAsRead.bind(manager),
    markAllAsRead: manager.markAllAsRead.bind(manager),
    deleteNotification: manager.deleteNotification.bind(manager),
    getUnreadCount: manager.getUnreadCount.bind(manager),
    requestPermission: manager.requestPermission.bind(manager),
    checkPermission: manager.checkPermission.bind(manager),
  }
}
