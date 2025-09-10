import { safeJsonParse } from "./utils"
import { useMemo } from "react"

export type NotificationType = 
  | 'bill_due'          // Fatura vade tarihi
  | 'budget_exceeded'   // Bütçe aşımı
  | 'payment_reminder'  // Ödeme hatırlatıcısı
  | 'low_balance'       // Düşük bakiye
  | 'monthly_report'    // Aylık rapor
  | 'goal_reached'      // Hedef tamamlandı
  | 'transaction_alert' // İşlem uyarısı
  | 'calendar_daily'    // Günlük takvim hatırlatıcısı
  | 'calendar_event'    // Takvim etkinlik bildirimi
  | 'calendar_summary'  // Takvim özet bildirimi

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
  calendarNotifications: boolean
  calendarDailyReminder: boolean
  calendarEventReminder: boolean
  reminderDaysBefore: number
  lowBalanceThreshold: number
  browserNotifications: boolean
  emailNotifications: boolean
  // Sayfa bazında bildirim ayarları
  pageNotifications: {
    home: boolean
    budgets: boolean
    kartlarim: boolean
    odemeler: boolean
    yatirimlar: boolean
    notifications: boolean
  }
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
  calendarNotifications: true,
  calendarDailyReminder: true,
  calendarEventReminder: true,
  reminderDaysBefore: 3,
  lowBalanceThreshold: 100,
  browserNotifications: true,
  emailNotifications: false,
  pageNotifications: {
    home: true,
    budgets: true,
    kartlarim: true,
    odemeler: true,
    yatirimlar: true,
    notifications: true
  }
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
    title: data.isToday ? "💰 Ödeme Tarihi Geldi!" : "💰 Ödeme Hatırlatıcısı",
    message: data.isToday 
      ? `${data.paymentName} ödemesi bugün vadesi geliyor! Tutar: ₺${data.amount?.toLocaleString('tr-TR')}`
      : data.isReminder
      ? `${data.paymentName} ödemesi yarın vadesi geliyor. Tutar: ₺${data.amount?.toLocaleString('tr-TR')}`
      : `${data.paymentName} ödemesi için ₺${data.amount?.toLocaleString('tr-TR')} ödemeniz gerekiyor.`
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
  }),
  calendar_daily: (data) => ({
    title: "📅 Günlük Takvim Hatırlatıcısı",
    message: `Bugün ${data.eventCount || 0} etkinliğiniz var. ${data.hasImportantEvents ? 'Önemli ödemelerinizi kontrol edin!' : ''}`
  }),
  calendar_event: (data) => ({
    title: `📅 ${data.eventType === 'payment' ? '💰' : data.eventType === 'income' ? '💚' : '📝'} Takvim Etkinliği`,
    message: `${data.title || 'Etkinlik'} - ${data.amount ? `Tutar: ${data.amount}` : ''} ${data.description || ''}`
  }),
  calendar_summary: (data) => ({
    title: "📊 Takvim Özeti",
    message: `${data.period || 'Bu hafta'} ${data.totalEvents || 0} etkinlik, ${data.totalAmount ? `toplam: ${data.totalAmount}` : ''}`
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
      case 'calendar_daily':
      case 'calendar_event':
      case 'calendar_summary':
        // Takvimi aç
        window.postMessage({ type: 'OPEN_CALENDAR' }, '*')
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
      const notifications = safeJsonParse(stored, []).map((n: any) => ({
        ...n,
        createdAt: new Date(n.createdAt),
        scheduledFor: n.scheduledFor ? new Date(n.scheduledFor) : undefined
      }))
      
      // Sort by createdAt date (newest first)
      return notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
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

  // Takvim bildirimleri için özel metodlar
  createCalendarDailyReminder(date: Date, events: any[]): NotificationItem {
    const eventCount = events.length
    const hasImportantEvents = events.some(e => e.type === 'payment' || e.type === 'bill_due')
    
    return this.createNotification('calendar_daily', {
      date: date.toISOString(),
      eventCount,
      hasImportantEvents,
      events
    }, hasImportantEvents ? 'high' : 'medium')
  }

  createCalendarEventNotification(event: any, reminderTime?: Date): NotificationItem {
    return this.createNotification('calendar_event', {
      title: event.description || event.title,
      eventType: event.type,
      amount: event.amount,
      description: event.description,
      date: event.date,
      category: event.category
    }, event.type === 'payment' ? 'high' : 'medium', reminderTime)
  }

  createCalendarSummary(period: string, events: any[], totalAmount?: string): NotificationItem {
    return this.createNotification('calendar_summary', {
      period,
      totalEvents: events.length,
      totalAmount,
      events
    }, 'low')
  }

  // Günlük takvim kontrolü ve bildirim oluşturma
  checkDailyCalendarEvents(calendarEvents: any[]): void {
    const settings = this.getNotificationSettings()
    if (!settings.calendarNotifications || !settings.calendarDailyReminder) {
      return
    }

    const today = new Date()
    const todayEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === today.toDateString()
    })

    if (todayEvents.length > 0) {
      this.createCalendarDailyReminder(today, todayEvents)
    }
  }

  // Önceki günlerin etkinlikleri için bildirim oluşturma
  checkPastCalendarEvents(calendarEvents: any[]): void {
    const settings = this.getNotificationSettings()
    if (!settings.calendarNotifications) {
      return
    }

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const pastEvents = calendarEvents.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === yesterday.toDateString() && 
             (event.type === 'payment' || event.type === 'bill_due')
    })

    pastEvents.forEach(event => {
      if (!this.hasNotificationForEvent(event)) {
        this.createCalendarEventNotification(event)
      }
    })
  }

  // Etkinlik için bildirim var mı kontrol et
  private hasNotificationForEvent(event: any): boolean {
    const notifications = this.getStoredNotifications()
    return notifications.some(n => 
      n.type === 'calendar_event' && 
      n.data?.date === event.date &&
      n.data?.title === event.title
    )
  }

  // Sayfa bazında bildirim ayarlarını kontrol et
  isPageNotificationEnabled(page: string): boolean {
    const settings = this.getNotificationSettings()
    return settings.pageNotifications[page as keyof typeof settings.pageNotifications] ?? true
  }

  // Bildirim ayarlarını getir
  getNotificationSettings(): NotificationSettings {
    const stored = localStorage.getItem('notification-settings')
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch {
        return defaultNotificationSettings
      }
    }
    return defaultNotificationSettings
  }

  // Sayfa bildirim ayarını güncelle
  updatePageNotificationSetting(page: string, enabled: boolean): void {
    const settings = this.getNotificationSettings()
    if (settings.pageNotifications) {
      settings.pageNotifications[page as keyof typeof settings.pageNotifications] = enabled
      localStorage.setItem('notification-settings', JSON.stringify(settings))
    }
  }

  // Ödeme bildirimi planlama
  schedulePaymentNotification(payment: any): void {
    if (!payment.dueDate) return
    
    const dueDate = new Date(payment.dueDate)
    const now = new Date()
    
    // Ödeme tarihi geçmiş ise bildirim oluşturma
    if (dueDate < now) return
    
    // Ödeme saati bildirimi (vade tarihinde saat 12:00'da)
    const notificationTime = new Date(dueDate)
    notificationTime.setHours(12, 0, 0, 0)
    
    if (notificationTime > now) {
      const timeUntilNotification = notificationTime.getTime() - now.getTime()
      
      // 24 saat içindeyse zamanlayıcı kur
      if (timeUntilNotification <= 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          this.createNotification('payment_reminder', {
            paymentName: payment.name,
            amount: payment.amount,
            dueDate: payment.dueDate,
            isToday: true
          }, 'high')
          
          // Browser bildirimi de gönder
          if (Notification.permission === 'granted') {
            new Notification(`💰 Ödeme Hatırlatıcısı`, {
              body: `${payment.name} ödemesi bugün vadesi geliyor! Tutar: ₺${payment.amount?.toLocaleString('tr-TR')}`,
              icon: '/icons/icon-192x192.png'
            })
          }
        }, timeUntilNotification)
      }
    }
    
    // 1 gün öncesi hatırlatma
    const oneDayBefore = new Date(dueDate)
    oneDayBefore.setDate(oneDayBefore.getDate() - 1)
    oneDayBefore.setHours(12, 0, 0, 0)
    
    if (oneDayBefore > now) {
      const timeUntilReminder = oneDayBefore.getTime() - now.getTime()
      
      if (timeUntilReminder <= 24 * 60 * 60 * 1000) {
        setTimeout(() => {
          this.createNotification('payment_reminder', {
            paymentName: payment.name,
            amount: payment.amount,
            dueDate: payment.dueDate,
            isReminder: true
          }, 'medium')
        }, timeUntilReminder)
      }
    }
  }

  // Tüm bekleyen ödemeler için bildirim planla
  scheduleAllPaymentNotifications(payments: any[]): void {
    const pendingPayments = payments.filter(p => p.status === 'pending' && p.dueDate)
    pendingPayments.forEach(payment => {
      this.schedulePaymentNotification(payment)
    })
  }

  // Test için: Hemen bildirim oluştur (development amaçlı)
  createTestPaymentNotification(payment: any): void {
    this.createNotification('payment_reminder', {
      paymentName: payment.name,
      amount: payment.amount,
      dueDate: payment.dueDate,
      isToday: true
    }, 'high')
    
    // Browser bildirimi de gönder
    if (Notification.permission === 'granted') {
      new Notification(`💰 Test Ödeme Hatırlatıcısı`, {
        body: `${payment.name} ödemesi test bildirimi! Tutar: ₺${payment.amount?.toLocaleString('tr-TR')}`,
        icon: '/icons/icon-192x192.png'
      })
    }
  }
}

// Kullanım için export edilecek hook
export const useNotifications = () => {
  const manager = useMemo(() => NotificationManager.getInstance(), [])
  
  return useMemo(() => ({
    createNotification: manager.createNotification.bind(manager),
    getNotifications: manager.getStoredNotifications.bind(manager),
    markAsRead: manager.markAsRead.bind(manager),
    markAllAsRead: manager.markAllAsRead.bind(manager),
    deleteNotification: manager.deleteNotification.bind(manager),
    getUnreadCount: manager.getUnreadCount.bind(manager),
    requestPermission: manager.requestPermission.bind(manager),
    checkPermission: manager.checkPermission.bind(manager),
    // Takvim bildirimleri
    createCalendarDailyReminder: manager.createCalendarDailyReminder.bind(manager),
    createCalendarEventNotification: manager.createCalendarEventNotification.bind(manager),
    createCalendarSummary: manager.createCalendarSummary.bind(manager),
    checkDailyCalendarEvents: manager.checkDailyCalendarEvents.bind(manager),
    checkPastCalendarEvents: manager.checkPastCalendarEvents.bind(manager),
    // Sayfa ayarları
    isPageNotificationEnabled: manager.isPageNotificationEnabled.bind(manager),
    updatePageNotificationSetting: manager.updatePageNotificationSetting.bind(manager),
    getNotificationSettings: manager.getNotificationSettings.bind(manager),
    // Ödeme bildirimleri
    schedulePaymentNotification: manager.schedulePaymentNotification.bind(manager),
    scheduleAllPaymentNotifications: manager.scheduleAllPaymentNotifications.bind(manager),
    createTestPaymentNotification: manager.createTestPaymentNotification.bind(manager),
  }), [manager])
}
