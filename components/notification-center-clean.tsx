"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { 
  Bell, 
  BellOff, 
  Trash2, 
  Check, 
  CheckCheck, 
  Settings, 
  AlertCircle,
  Calendar,
  Wallet,
  Target,
  TrendingDown,
  TrendingUp,
  CreditCard,
  X
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  useNotifications, 
  type NotificationItem, 
  type NotificationSettings,
  defaultNotificationSettings,
  NotificationManager
} from '@/lib/notifications'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

export function NotificationCenter() {
  const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    requestPermission,
    checkPermission
  } = useNotifications()

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState<NotificationSettings>(defaultNotificationSettings)
  const [hasPermission, setHasPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    loadNotifications()
    loadSettings()
    checkNotificationPermission()

    // Her 30 saniyede bir bildirimleri kontrol et
    const interval = setInterval(() => {
      NotificationManager.getInstance().checkScheduledNotifications()
      loadNotifications()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const loadNotifications = () => {
    const allNotifications = getNotifications()
    setNotifications(allNotifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ))
    setUnreadCount(getUnreadCount())
  }

  const loadSettings = () => {
    const stored = localStorage.getItem('notification-settings')
    if (stored) {
      try {
        setSettings(JSON.parse(stored))
      } catch (e) {
        setSettings(defaultNotificationSettings)
      }
    }
  }

  const saveSettings = (newSettings: NotificationSettings) => {
    setSettings(newSettings)
    localStorage.setItem('notification-settings', JSON.stringify(newSettings))
  }

  const checkNotificationPermission = async () => {
    const permission = await checkPermission()
    setHasPermission(permission)
  }

  const handleRequestPermission = async () => {
    const granted = await requestPermission()
    if (granted) {
      setHasPermission('granted')
    }
  }

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId)
    loadNotifications()
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
    loadNotifications()
  }

  const handleDelete = (notificationId: string) => {
    deleteNotification(notificationId)
    loadNotifications()
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'bill_due':
      case 'payment_reminder':
        return <Calendar className="h-4 w-4" />
      case 'budget_exceeded':
        return <Target className="h-4 w-4" />
      case 'low_balance':
        return <CreditCard className="h-4 w-4" />
      case 'monthly_report':
        return <TrendingUp className="h-4 w-4" />
      case 'transaction_alert':
        return <Wallet className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Bildirimler</CardTitle>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    <CheckCheck className="h-4 w-4 mr-1" />
                    Tümünü Okundu İşaretle
                  </Button>
                )}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Bildirim Ayarları</DialogTitle>
                      <DialogDescription>
                        Hangi bildirimleri almak istediğinizi belirleyin.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Permission */}
                      {hasPermission !== 'granted' && (
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm font-medium">Bildirim İzni Gerekli</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">
                            Bildirimleri almak için tarayıcı izni vermeniz gerekiyor.
                          </p>
                          <Button 
                            size="sm" 
                            onClick={handleRequestPermission}
                            className="w-full"
                          >
                            İzin Ver
                          </Button>
                        </div>
                      )}

                      {/* General Settings */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="billReminders">Fatura Hatırlatıcıları</Label>
                            <p className="text-xs text-muted-foreground">Fatura vadesi yaklaştığında bildirim al</p>
                          </div>
                          <Switch
                            id="billReminders"
                            checked={settings.billReminders}
                            onCheckedChange={(checked) => 
                              saveSettings({ ...settings, billReminders: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="budgetAlerts">Bütçe Uyarıları</Label>
                            <p className="text-xs text-muted-foreground">Bütçe aşımında bildirim al</p>
                          </div>
                          <Switch
                            id="budgetAlerts"
                            checked={settings.budgetAlerts}
                            onCheckedChange={(checked) => 
                              saveSettings({ ...settings, budgetAlerts: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="lowBalanceAlerts">Düşük Bakiye Uyarıları</Label>
                            <p className="text-xs text-muted-foreground">Bakiye düştüğünde bildirim al</p>
                          </div>
                          <Switch
                            id="lowBalanceAlerts"
                            checked={settings.lowBalanceAlerts}
                            onCheckedChange={(checked) => 
                              saveSettings({ ...settings, lowBalanceAlerts: checked })
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="monthlyReports">Aylık Raporlar</Label>
                            <p className="text-xs text-muted-foreground">Ay sonu raporu bildirimini al</p>
                          </div>
                          <Switch
                            id="monthlyReports"
                            checked={settings.monthlyReports}
                            onCheckedChange={(checked) => 
                              saveSettings({ ...settings, monthlyReports: checked })
                            }
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Threshold Settings */}
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="lowBalanceThreshold">Düşük Bakiye Eşiği (₺)</Label>
                          <Input
                            id="lowBalanceThreshold"
                            type="number"
                            min="0"
                            value={settings.lowBalanceThreshold}
                            onChange={(e) => 
                              saveSettings({ ...settings, lowBalanceThreshold: parseFloat(e.target.value) || 100 })
                            }
                          />
                        </div>

                        <div>
                          <Label htmlFor="billReminderDays">Fatura Hatırlatma Süresi (gün)</Label>
                          <Input
                            id="billReminderDays"
                            type="number"
                            min="1"
                            max="30"
                            value={settings.billReminderDays}
                            onChange={(e) => 
                              saveSettings({ ...settings, billReminderDays: parseInt(e.target.value) || 3 })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground/50 mb-2" />
                  <p className="text-muted-foreground">Henüz bildirim yok</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Yeni bildirimler burada görünecek
                  </p>
                </div>
              ) : (
                <div className="space-y-2 p-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`relative p-3 rounded-lg border transition-colors ${
                        notification.read
                          ? 'bg-muted/30 border-border'
                          : 'bg-card border-primary/20'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`flex-shrink-0 p-2 rounded-full ${getPriorityColor(notification.priority)} text-white`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium leading-tight">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDistanceToNow(new Date(notification.createdAt), { 
                                  addSuffix: true, 
                                  locale: tr 
                                })}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-1 ml-2">
                              {!notification.read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="h-6 w-6 p-0"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(notification.id)}
                                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {!notification.read && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
