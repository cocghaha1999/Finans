"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Bell, 
  BellOff, 
  Calendar,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Target,
  Home,
  Receipt,
  Banknote,
  Settings2,
  Volume2,
  VolumeX,
  Clock,
  CheckCircle2
} from "lucide-react"
import { useNotifications, type NotificationSettings, defaultNotificationSettings } from "@/lib/notifications"
import { cn } from "@/lib/utils"

const pageConfig = {
  home: {
    name: "Ana Sayfa",
    description: "Genel bakış ve özet bilgiler",
    icon: Home,
    color: "text-blue-600"
  },
  budgets: {
    name: "Bütçeler",
    description: "Bütçe takibi ve limitler",
    icon: Target,
    color: "text-green-600"
  },
  kartlarim: {
    name: "Kartlarım",
    description: "Kart bakiyeleri ve hareketler",
    icon: CreditCard,
    color: "text-purple-600"
  },
  odemeler: {
    name: "Ödemeler",
    description: "Fatura ve ödeme hatırlatıcıları",
    icon: Receipt,
    color: "text-red-600"
  },
  yatirimlar: {
    name: "Yatırımlar",
    description: "Yatırım portföyü ve piyasa",
    icon: TrendingUp,
    color: "text-orange-600"
  },
  notifications: {
    name: "Bildirimler",
    description: "Bildirim merkezi ve ayarları",
    icon: Bell,
    color: "text-gray-600"
  }
}

const notificationTypeConfig = {
  bill_due: {
    name: "Fatura Vadesi",
    description: "Vade tarihi yaklaşan faturalar",
    icon: Receipt,
    category: "Ödemeler"
  },
  budget_exceeded: {
    name: "Bütçe Aşımı",
    description: "Belirlenen bütçe limitlerini aşma",
    icon: AlertTriangle,
    category: "Bütçe"
  },
  payment_reminder: {
    name: "Ödeme Hatırlatıcısı",
    description: "Bekleyen ödeme işlemleri",
    icon: Clock,
    category: "Ödemeler"
  },
  low_balance: {
    name: "Düşük Bakiye",
    description: "Hesap bakiyesi düşük seviye uyarısı",
    icon: CreditCard,
    category: "Kartlar"
  },
  monthly_report: {
    name: "Aylık Rapor",
    description: "Aylık finansal özet raporları",
    icon: TrendingUp,
    category: "Raporlar"
  },
  goal_reached: {
    name: "Hedef Tamamlandı",
    description: "Belirlenen hedeflere ulaşma",
    icon: Target,
    category: "Hedefler"
  },
  transaction_alert: {
    name: "İşlem Uyarısı",
    description: "Yeni işlem bildirimleri",
    icon: Banknote,
    category: "İşlemler"
  },
  calendar_daily: {
    name: "Günlük Takvim",
    description: "Günlük etkinlik hatırlatıcıları",
    icon: Calendar,
    category: "Takvim"
  },
  calendar_event: {
    name: "Takvim Etkinliği",
    description: "Özel etkinlik bildirimleri",
    icon: Calendar,
    category: "Takvim"
  },
  calendar_summary: {
    name: "Takvim Özeti",
    description: "Haftalık ve aylık takvim özetleri",
    icon: Calendar,
    category: "Takvim"
  }
}

interface NotificationSettingsAdvancedProps {
  className?: string
}

export function NotificationSettingsAdvanced({ className }: NotificationSettingsAdvancedProps) {
  const { getNotificationSettings, requestPermission, checkPermission } = useNotifications()
  const [settings, setSettings] = useState<NotificationSettings>(defaultNotificationSettings)
  const [hasPermission, setHasPermission] = useState<NotificationPermission>('default')
  const [activeTab, setActiveTab] = useState("general")

  useEffect(() => {
    loadSettings()
    checkNotificationPermission()
  }, [])

  const loadSettings = () => {
    const stored = getNotificationSettings()
    setSettings(stored)
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

  const updatePageNotification = (page: string, enabled: boolean) => {
    saveSettings({
      ...settings,
      pageNotifications: {
        ...settings.pageNotifications,
        [page]: enabled
      }
    })
  }

  const updateNotificationType = (key: keyof NotificationSettings, enabled: boolean) => {
    saveSettings({
      ...settings,
      [key]: enabled
    })
  }

  const updateNumericSetting = (key: keyof NotificationSettings, value: number) => {
    saveSettings({
      ...settings,
      [key]: value
    })
  }

  const getEnabledCount = () => {
    const pageCount = Object.values(settings.pageNotifications).filter(Boolean).length
    const typeCount = [
      settings.billReminders,
      settings.budgetAlerts,
      settings.paymentReminders,
      settings.lowBalanceAlerts,
      settings.monthlyReports,
      settings.goalNotifications,
      settings.transactionAlerts,
      settings.calendarNotifications,
    ].filter(Boolean).length
    
    return { pageCount, typeCount, total: pageCount + typeCount }
  }

  const { pageCount, typeCount, total } = getEnabledCount()

  return (
    <Card className={cn("w-full max-w-4xl", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Bildirim Ayarları
            </CardTitle>
            <CardDescription>
              Alacağınız bildirimleri özelleştirin ve yönetin
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={settings.enabled ? "default" : "secondary"}>
              {settings.enabled ? "Aktif" : "Pasif"}
            </Badge>
            <Badge variant="outline">
              {total} etkin
            </Badge>
          </div>
        </div>

        {/* Ana Bildirim Anahtarı */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            {settings.enabled ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <h3 className="font-medium">Ana Bildirim Anahtarı</h3>
              <p className="text-sm text-muted-foreground">
                Tüm bildirimleri etkinleştirin veya devre dışı bırakın
              </p>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => updateNotificationType('enabled', enabled)}
          />
        </div>

        {/* Tarayıcı İzni */}
        {hasPermission !== 'granted' && (
          <div className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">Tarayıcı İzni Gerekli</h3>
                <p className="text-sm text-orange-700">
                  Bildirimleri alabilmek için tarayıcı izni verin
                </p>
              </div>
            </div>
            <Button onClick={handleRequestPermission} size="sm">
              İzin Ver
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Genel</TabsTrigger>
            <TabsTrigger value="pages">Sayfalar</TabsTrigger>
            <TabsTrigger value="types">Bildirim Türleri</TabsTrigger>
            <TabsTrigger value="advanced">Gelişmiş</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Genel Ayarlar</h3>
              
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Tarayıcı Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Sistem tepsisinde bildirim göster
                    </p>
                  </div>
                  <Switch
                    checked={settings.browserNotifications}
                    onCheckedChange={(enabled) => updateNotificationType('browserNotifications', enabled)}
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>E-posta Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      E-posta ile bildirim al (yakında)
                    </p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(enabled) => updateNotificationType('emailNotifications', enabled)}
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Takvim Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Takvim etkinlikleri için bildirimler
                    </p>
                  </div>
                  <Switch
                    checked={settings.calendarNotifications}
                    onCheckedChange={(enabled) => updateNotificationType('calendarNotifications', enabled)}
                    disabled={!settings.enabled}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pages" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Sayfa Bazında Bildirimler</h3>
                <Badge variant="outline">{pageCount}/6 aktif</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Hangi sayfalardan bildirim almak istediğinizi seçin
              </p>
              
              <div className="grid gap-3">
                {Object.entries(pageConfig).map(([key, config]) => {
                  const Icon = config.icon
                  const isEnabled = settings.pageNotifications[key as keyof typeof settings.pageNotifications]
                  
                  return (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Icon className={cn("h-5 w-5", config.color)} />
                        <div>
                          <h4 className="font-medium">{config.name}</h4>
                          <p className="text-sm text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(enabled) => updatePageNotification(key, enabled)}
                        disabled={!settings.enabled}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="types" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Bildirim Türleri</h3>
                <Badge variant="outline">{typeCount}/8 aktif</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Hangi tür bildirimleri almak istediğinizi seçin
              </p>
              
              <div className="space-y-6">
                {(() => {
                  const grouped = Object.entries(notificationTypeConfig).reduce((acc, [key, config]) => {
                    const category = config.category
                    if (!acc[category]) {
                      acc[category] = []
                    }
                    acc[category].push([key, config])
                    return acc
                  }, {} as Record<string, Array<[string, any]>>)
                  
                  return Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                        {category}
                      </h4>
                      <div className="grid gap-3">
                        {items.map(([key, config]) => {
                          const Icon = config.icon
                          const settingKey = key === 'bill_due' ? 'billReminders' :
                                           key === 'budget_exceeded' ? 'budgetAlerts' :
                                           key === 'payment_reminder' ? 'paymentReminders' :
                                           key === 'low_balance' ? 'lowBalanceAlerts' :
                                           key === 'monthly_report' ? 'monthlyReports' :
                                           key === 'goal_reached' ? 'goalNotifications' :
                                           key === 'transaction_alert' ? 'transactionAlerts' :
                                           key.startsWith('calendar_') ? 'calendarNotifications' : null
                          
                          if (!settingKey) return null
                          
                          const isEnabled = settings[settingKey as keyof NotificationSettings] as boolean
                          
                          return (
                            <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Icon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <h5 className="font-medium text-sm">{config.name}</h5>
                                  <p className="text-xs text-muted-foreground">{config.description}</p>
                                </div>
                              </div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={(enabled) => updateNotificationType(settingKey as keyof NotificationSettings, enabled)}
                                disabled={!settings.enabled}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Gelişmiş Ayarlar</h3>
              
              <div className="grid gap-6">
                <div className="space-y-3">
                  <Label htmlFor="reminderDays">Hatırlatma Süresi (gün önceden)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="reminderDays"
                      type="number"
                      min="1"
                      max="30"
                      value={settings.reminderDaysBefore}
                      onChange={(e) => updateNumericSetting('reminderDaysBefore', parseInt(e.target.value) || 3)}
                      className="w-20"
                      disabled={!settings.enabled}
                    />
                    <span className="text-sm text-muted-foreground">gün</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vade tarihinden kaç gün önce hatırlatma yapılsın
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="lowBalance">Düşük Bakiye Eşiği (₺)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="lowBalance"
                      type="number"
                      min="0"
                      step="10"
                      value={settings.lowBalanceThreshold}
                      onChange={(e) => updateNumericSetting('lowBalanceThreshold', parseFloat(e.target.value) || 100)}
                      className="w-32"
                      disabled={!settings.enabled}
                    />
                    <span className="text-sm text-muted-foreground">₺</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Bu tutarın altına düştüğünde uyarı ver
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Takvim Özellikleri</h4>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Günlük Hatırlatıcı</Label>
                      <p className="text-sm text-muted-foreground">
                        Her gün o günkü etkinlikler için bildirim
                      </p>
                    </div>
                    <Switch
                      checked={settings.calendarDailyReminder}
                      onCheckedChange={(enabled) => updateNotificationType('calendarDailyReminder', enabled)}
                      disabled={!settings.enabled || !settings.calendarNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Etkinlik Hatırlatıcısı</Label>
                      <p className="text-sm text-muted-foreground">
                        Yeni etkinlik eklendiğinde bildirim
                      </p>
                    </div>
                    <Switch
                      checked={settings.calendarEventReminder}
                      onCheckedChange={(enabled) => updateNotificationType('calendarEventReminder', enabled)}
                      disabled={!settings.enabled || !settings.calendarNotifications}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Test ve Bakım</h4>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Test bildirimi gönder
                        if ('Notification' in window && Notification.permission === 'granted') {
                          new Notification('Test Bildirimi', {
                            body: 'Bildirim sisteminiz çalışıyor! 🎉',
                            icon: '/icons/icon-192x192.png'
                          })
                        }
                      }}
                      disabled={!settings.enabled || hasPermission !== 'granted'}
                    >
                      Test Bildirimi Gönder
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Eski bildirimleri temizle
                        const notifications = JSON.parse(localStorage.getItem('costik-notifications') || '[]')
                        const recent = notifications.filter((n: any) => {
                          const age = Date.now() - new Date(n.createdAt).getTime()
                          return age < 7 * 24 * 60 * 60 * 1000 // Son 7 gün
                        })
                        localStorage.setItem('costik-notifications', JSON.stringify(recent))
                      }}
                    >
                      Eski Bildirimleri Temizle
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
