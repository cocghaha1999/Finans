"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore"
import { Bell, AlertTriangle, Shield, Activity, Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle, Info, Zap, Eye, Ban, UserX } from "lucide-react"

interface AdminNotification {
  id: string
  type: 'security' | 'user' | 'system' | 'admin'
  title: string
  message: string
  timestamp: any
  priority: 'low' | 'medium' | 'high' | 'critical'
  read: boolean
  actionType?: string
  userId?: string
  adminId?: string
  data?: any
}

interface NotificationCenterProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  unreadCount: number
  onMarkAllRead?: () => void
}

export function AdminNotificationCenter({ open, onOpenChange, unreadCount, onMarkAllRead }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [securityLogs, setSecurityLogs] = useState<any[]>([])
  const [adminLogs, setAdminLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const fetchNotifications = async () => {
    if (!db) return
    
    setLoading(true)
    try {
      // Simulated notifications based on admin logs and security events
      const adminLogsQuery = query(
        collection(db, 'admin_logs'),
        orderBy('timestamp', 'desc'),
        limit(20)
      )
      const adminLogsSnapshot = await getDocs(adminLogsQuery)
      const recentAdminLogs = adminLogsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Security logs
      const securityLogsQuery = query(
        collection(db, 'security_logs'),
        orderBy('timestamp', 'desc'),
        limit(15)
      )
      const securityLogsSnapshot = await getDocs(securityLogsQuery)
      const recentSecurityLogs = securityLogsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))

      // Convert logs to notifications
      const adminNotifications: AdminNotification[] = recentAdminLogs.map((log: any) => ({
        id: `admin_${log.id}`,
        type: 'admin',
        title: getAdminActionTitle(log.action || 'unknown'),
        message: getAdminActionMessage(log),
        timestamp: log.timestamp || Timestamp.now(),
        priority: getActionPriority(log.action || 'unknown'),
        read: false,
        actionType: log.action,
        adminId: log.adminId,
        data: log.details
      }))

      const securityNotifications: AdminNotification[] = recentSecurityLogs.map((log: any) => ({
        id: `security_${log.id}`,
        type: 'security',
        title: getSecurityEventTitle(log.event || 'unknown'),
        message: getSecurityEventMessage(log),
        timestamp: log.timestamp || Timestamp.now(),
        priority: getSecurityPriority(log.level || 'medium'),
        read: false,
        actionType: log.event,
        userId: log.userId,
        data: log.details
      }))

      // System notifications (simulated)
      const systemNotifications: AdminNotification[] = [
        {
          id: 'system_1',
          type: 'system',
          title: 'Sistem Performansı',
          message: 'Sunucu performansı normal seviyede',
          timestamp: Timestamp.now(),
          priority: 'low',
          read: false
        },
        {
          id: 'system_2',
          type: 'system',
          title: 'Veritabanı Senkronizasyonu',
          message: 'Firebase Firestore senkronizasyonu tamamlandı',
          timestamp: Timestamp.fromDate(new Date(Date.now() - 1000 * 60 * 30)),
          priority: 'medium',
          read: false
        }
      ]

      const allNotifications = [...adminNotifications, ...securityNotifications, ...systemNotifications]
        .sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime())

      setNotifications(allNotifications)
      setSecurityLogs(recentSecurityLogs)
      setAdminLogs(recentAdminLogs)
      
    } catch (error) {
      console.error('Bildirimler yüklenirken hata:', error)
    } finally {
      setLoading(false)
    }
  }

  const getAdminActionTitle = (action: string): string => {
    const titles: Record<string, string> = {
      'user_banned': '🚫 Kullanıcı Banlandı',
      'user_timed_out': '⏰ Kullanıcı Timeout',
      'user_unbanned': '✅ Ban Kaldırıldı',
      'role_changed': '👤 Rol Değişikliği',
      'manual_refresh': '🔄 Manuel Yenileme',
      'bulk_notification': '📢 Toplu Bildirim',
      'system_settings': '⚙️ Sistem Ayarları',
      'user_created': '👥 Yeni Kullanıcı',
      'data_export': '📊 Veri Dışa Aktarımı'
    }
    return titles[action] || '📋 Admin İşlemi'
  }

  const getAdminActionMessage = (log: any): string => {
    const { action, details } = log
    
    switch (action) {
      case 'user_banned':
        return `${details?.targetUserEmail || 'Kullanıcı'} kalıcı olarak banlandı. Sebep: ${details?.reason || 'Belirtilmemiş'}`
      case 'user_timed_out':
        return `${details?.targetUserEmail || 'Kullanıcı'} geçici olarak timeout\'a alındı (${details?.duration || 'Belirsiz süre'})`
      case 'user_unbanned':
        return `${details?.targetUserEmail || 'Kullanıcı'} için ban kaldırıldı`
      case 'role_changed':
        return `${details?.targetUserEmail || 'Kullanıcı'} rolü ${details?.newRole || 'belirtilmemiş'} olarak değiştirildi`
      case 'manual_refresh':
        return 'Admin paneli verileri manuel olarak yenilendi'
      case 'bulk_notification':
        return `${details?.userCount || 0} kullanıcıya toplu bildirim gönderildi`
      default:
        return 'Admin işlemi gerçekleştirildi'
    }
  }

  const getSecurityEventTitle = (event: string): string => {
    const titles: Record<string, string> = {
      'failed_login': '🔐 Başarısız Giriş',
      'suspicious_activity': '⚠️ Şüpheli Aktivite',
      'unauthorized_access': '🚨 Yetkisiz Erişim',
      'data_breach_attempt': '🛡️ Veri İhlali Girişimi',
      'multiple_login_attempts': '🔄 Çoklu Giriş Denemesi',
      'admin_login': '👨‍💼 Admin Girişi',
      'password_reset': '🔑 Şifre Sıfırlama',
      'account_locked': '🔒 Hesap Kilitlendi'
    }
    return titles[event] || '🔒 Güvenlik Olayı'
  }

  const getSecurityEventMessage = (log: any): string => {
    const { event, details } = log
    
    switch (event) {
      case 'failed_login':
        return `${details?.email || 'Bilinmeyen kullanıcı'} için başarısız giriş denemesi. IP: ${details?.ip || 'Bilinmiyor'}`
      case 'suspicious_activity':
        return `${details?.userId || 'Kullanıcı'} şüpheli aktivite sergiledi: ${details?.description || 'Detay yok'}`
      case 'unauthorized_access':
        return `Yetkisiz erişim girişimi tespit edildi. Kaynak: ${details?.source || 'Bilinmiyor'}`
      case 'admin_login':
        return `Admin kullanıcısı sisteme giriş yaptı. IP: ${details?.ip || 'Bilinmiyor'}`
      default:
        return 'Güvenlik olayı tespit edildi'
    }
  }

  const getActionPriority = (action: string): 'low' | 'medium' | 'high' | 'critical' => {
    const priorities: Record<string, 'low' | 'medium' | 'high' | 'critical'> = {
      'user_banned': 'high',
      'user_timed_out': 'medium',
      'user_unbanned': 'medium',
      'role_changed': 'high',
      'manual_refresh': 'low',
      'bulk_notification': 'medium',
      'system_settings': 'high',
      'user_created': 'low',
      'data_export': 'medium'
    }
    return priorities[action] || 'low'
  }

  const getSecurityPriority = (level: string): 'low' | 'medium' | 'high' | 'critical' => {
    switch (level) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'medium': return 'medium'
      case 'low': return 'low'
      default: return 'medium'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'security': return <Shield className="h-4 w-4" />
      case 'admin': return <Users className="h-4 w-4" />
      case 'system': return <Activity className="h-4 w-4" />
      case 'user': return <Bell className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Bilinmiyor'
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      
      if (diff < 60000) return 'Az önce'
      if (diff < 3600000) return `${Math.floor(diff / 60000)} dakika önce`
      if (diff < 86400000) return `${Math.floor(diff / 3600000)} saat önce`
      
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Geçersiz tarih'
    }
  }

  const filterNotifications = (type: string) => {
    if (type === 'all') return notifications
    return notifications.filter(n => n.type === type)
  }

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  const filteredNotifications = filterNotifications(activeTab)
  const unreadNotifications = filteredNotifications.filter(n => !n.read)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 dark:text-gray-100">
            <Bell className="h-5 w-5" />
            Bildirim Merkezi
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount} okunmamış
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="dark:text-gray-300">
            Admin işlemleri, güvenlik olayları ve sistem bildirimleri
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Header Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNotifications}
                disabled={loading}
                className="dark:border-slate-600 dark:text-gray-300"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                ) : (
                  <TrendingUp className="h-4 w-4" />
                )}
                Yenile
              </Button>
              {unreadNotifications.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onMarkAllRead}
                  className="dark:border-slate-600 dark:text-gray-300"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Tümünü Okundu İşaretle
                </Button>
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Toplam {filteredNotifications.length} bildirim
            </div>
          </div>

          {/* Notification Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 dark:bg-slate-700">
              <TabsTrigger value="all" className="dark:text-gray-300">
                Tümü ({notifications.length})
              </TabsTrigger>
              <TabsTrigger value="security" className="dark:text-gray-300">
                Güvenlik ({notifications.filter(n => n.type === 'security').length})
              </TabsTrigger>
              <TabsTrigger value="admin" className="dark:text-gray-300">
                Admin ({notifications.filter(n => n.type === 'admin').length})
              </TabsTrigger>
              <TabsTrigger value="system" className="dark:text-gray-300">
                Sistem ({notifications.filter(n => n.type === 'system').length})
              </TabsTrigger>
              <TabsTrigger value="user" className="dark:text-gray-300">
                Kullanıcı ({notifications.filter(n => n.type === 'user').length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              <div className="h-[500px] w-full overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredNotifications.length > 0 ? (
                  <div className="space-y-3 pr-4">
                    {filteredNotifications.map((notification) => (
                      <Card key={notification.id} className={`transition-all hover:shadow-md ${
                        !notification.read ? 'border-l-4 border-l-blue-500 dark:border-l-blue-400' : ''
                      } dark:bg-slate-700 dark:border-slate-600`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-full ${getPriorityColor(notification.priority)}`}>
                              {getTypeIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold dark:text-gray-100">
                                  {notification.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <Badge className={getPriorityColor(notification.priority)}>
                                    {notification.priority === 'critical' ? 'Kritik' :
                                     notification.priority === 'high' ? 'Yüksek' :
                                     notification.priority === 'medium' ? 'Orta' : 'Düşük'}
                                  </Badge>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(notification.timestamp)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                                {notification.message}
                              </p>
                              {notification.data && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-600 p-2 rounded">
                                  {notification.actionType && (
                                    <span className="font-mono">İşlem: {notification.actionType}</span>
                                  )}
                                  {notification.userId && (
                                    <span className="ml-2 font-mono">Kullanıcı ID: {notification.userId}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Bell className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                      {activeTab === 'all' ? 'Henüz bildirim bulunmuyor' : `${activeTab} kategorisinde bildirim yok`}
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Yeni admin işlemleri ve güvenlik olayları burada görünecek
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}