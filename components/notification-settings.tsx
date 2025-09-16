"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { Bell, Mail, MessageSquare, Calendar, TrendingUp, AlertTriangle, Save } from "lucide-react"
import { useNotifications } from '@/lib/notifications'

export function NotificationSettings() {
  const { toast } = useToast()
  const { getNotificationSettings } = useNotifications()
  const [settings, setSettings] = useState(getNotificationSettings())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setSettings(getNotificationSettings())
  }, [getNotificationSettings])

  const updateSetting = (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('notification-settings', JSON.stringify(newSettings))
  }

  const updatePageSetting = (page: string, value: boolean) => {
    const newSettings = {
      ...settings,
      pageNotifications: {
        ...settings.pageNotifications,
        [page]: value
      }
    }
    setSettings(newSettings)
    localStorage.setItem('notification-settings', JSON.stringify(newSettings))
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      // Ayarları localStorage'a kaydet
      localStorage.setItem('notification-settings', JSON.stringify(settings))
      
      toast({
        title: "Bildirim ayarları kaydedildi",
        description: "Tercihleriniz başarıyla güncellendi.",
      })
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const notificationTypes = [
    {
      key: 'billReminders',
      icon: <Calendar className="h-4 w-4" />,
      title: 'Fatura Hatırlatıcıları',
      description: 'Vadesi yaklaşan faturalar için bildirim'
    },
    {
      key: 'budgetAlerts',
      icon: <AlertTriangle className="h-4 w-4" />,
      title: 'Bütçe Uyarıları',
      description: 'Bütçe aştığında bildirim'
    },
    {
      key: 'paymentReminders',
      icon: <Bell className="h-4 w-4" />,
      title: 'Ödeme Hatırlatıcıları',
      description: 'Yapılacak ödemeler için hatırlatma'
    },
    {
      key: 'lowBalanceAlerts',
      icon: <TrendingUp className="h-4 w-4" />,
      title: 'Düşük Bakiye Uyarıları',
      description: 'Hesap bakiyesi düştüğünde bildirim'
    },
    {
      key: 'monthlyReports',
      icon: <MessageSquare className="h-4 w-4" />,
      title: 'Aylık Raporlar',
      description: 'Aylık finansal özet raporları'
    },
    {
      key: 'goalNotifications',
      icon: <TrendingUp className="h-4 w-4" />,
      title: 'Hedef Bildirimleri',
      description: 'Finansal hedefler hakkında güncellemeler'
    },
    {
      key: 'transactionAlerts',
      icon: <Bell className="h-4 w-4" />,
      title: 'İşlem Uyarıları',
      description: 'Yeni işlemler için anlık bildirim'
    },
    {
      key: 'calendarNotifications',
      icon: <Calendar className="h-4 w-4" />,
      title: 'Takvim Bildirimleri',
      description: 'Takvim etkinlikleri için hatırlatma'
    }
  ]

  const pageNotifications = [
    { key: 'home', title: 'Ana Sayfa', description: 'Ana sayfa bildirimleri' },
    { key: 'budgets', title: 'Bütçeler', description: 'Bütçe sayfası bildirimleri' },
    { key: 'kartlarim', title: 'Kartlarım', description: 'Kart işlemleri bildirimleri' },
    { key: 'odemeler', title: 'Ödemeler', description: 'Ödeme bildirimleri' },
    { key: 'yatirimlar', title: 'Yatırımlar', description: 'Yatırım bildirimleri' },
    { key: 'notifications', title: 'Bildirimler', description: 'Bildirim merkezi bildirimleri' }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Bildirim Tercihleri
          </CardTitle>
          <CardDescription>
            Hangi bildirimleri almak istediğinizi seçin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ana Bildirim Ayarları */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Tüm Bildirimler
                </Label>
                <p className="text-sm text-muted-foreground">
                  Bildirim sistemini tamamen aç/kapat
                </p>
              </div>
              <Switch
                checked={settings.enabled}
                onCheckedChange={(checked) => updateSetting('enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Tarayıcı Bildirimleri
                </Label>
                <p className="text-sm text-muted-foreground">
                  Tarayıcı push bildirimlerini etkinleştir
                </p>
              </div>
              <Switch
                checked={settings.browserNotifications}
                onCheckedChange={(checked) => updateSetting('browserNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-posta Bildirimleri
                </Label>
                <p className="text-sm text-muted-foreground">
                  Önemli olaylar için e-posta gönder
                </p>
              </div>
              <Switch
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
              />
            </div>
          </div>

          <Separator />

          {/* Bildirim Türleri */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bildirim Türleri</h3>
            <div className="grid gap-4">
              {notificationTypes.map((notif) => (
                <div key={notif.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      {notif.icon}
                      {notif.title}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {notif.description}
                    </p>
                  </div>
                  <Switch
                    checked={settings[notif.key as keyof typeof settings] as boolean}
                    onCheckedChange={(checked) => updateSetting(notif.key, checked)}
                    disabled={!settings.enabled}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Sayfa Bazında Bildirimler */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sayfa Bazında Bildirimler</h3>
            <div className="grid gap-4">
              {pageNotifications.map((page) => (
                <div key={page.key} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{page.title}</Label>
                    <p className="text-sm text-muted-foreground">
                      {page.description}
                    </p>
                  </div>
                  <Switch
                    checked={settings.pageNotifications[page.key as keyof typeof settings.pageNotifications]}
                    onCheckedChange={(checked) => updatePageSetting(page.key, checked)}
                    disabled={!settings.enabled}
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Gelişmiş Ayarlar */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Gelişmiş Ayarlar</h3>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Günlük Takvim Hatırlatıcısı</Label>
                  <p className="text-sm text-muted-foreground">
                    Her gün günlük etkinlikler hakkında bilgilendir
                  </p>
                </div>
                <Switch
                  checked={settings.calendarDailyReminder}
                  onCheckedChange={(checked) => updateSetting('calendarDailyReminder', checked)}
                  disabled={!settings.enabled || !settings.calendarNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Etkinlik Hatırlatıcıları</Label>
                  <p className="text-sm text-muted-foreground">
                    Takvim etkinlikleri için önceden hatırlatma
                  </p>
                </div>
                <Switch
                  checked={settings.calendarEventReminder}
                  onCheckedChange={(checked) => updateSetting('calendarEventReminder', checked)}
                  disabled={!settings.enabled || !settings.calendarNotifications}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <div className="animate-spin h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Ayarları Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}