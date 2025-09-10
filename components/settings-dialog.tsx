"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { NotificationSettingsAdvanced } from "@/components/notification-settings-advanced"
import { auth } from "@/lib/firebase"
import { getUserSettings, setUserSettings, watchUserSettings } from "@/lib/db"
import { UserSettings } from "@/lib/types"
import { safeJsonParse } from "@/lib/utils"
import Link from "next/link"
import { useCalendar } from "@/hooks/use-calendar-simple"
import { Settings, Volume2, VolumeX, Save, Keyboard, Eye, Coins, Calendar, Bell, Palette, Database } from "lucide-react"

type Settings = UserSettings

const DEFAULTS: Settings = {
  currency: "TRY",
  locale: "tr-TR",
  notifications: true,
  monthResetDay: 1,
  expenseAlertRealertOnThresholdChange: true,
  expenseAlertTriggerOnEqual: false,
  calendarFixedPastMonths: 1,
  calendarFixedFutureMonths: 1,
  calendarIncludeCards: false,
  // Yeni varsayılan değerler
  autoSaveEnabled: true,
  soundEnabled: true,
  compactView: false,
  showWelcomeTips: true,
  defaultTransactionType: "gider",
  quickAmounts: [10, 25, 50, 100, 250, 500],
  dateFormat: "dd/mm/yyyy",
  enableKeyboardShortcuts: true,
  showBalance: true,
  currencySymbol: "₺",
  decimalPlaces: 2,
  enableBackup: true,
  backupFrequency: "weekly",
}

export function SettingsDialog() {
  // Calendar settings temporarily disabled
  // const { setFixedPaymentRange, setIncludeCardMarkers } = useCalendar()
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const u = auth?.currentUser
    if (u) {
      const unsub = watchUserSettings(u.uid, (s) => {
        if (s) {
          const merged = { ...DEFAULTS, ...s }
          setSettings(merged)
          try {
            localStorage.setItem("settings", JSON.stringify(merged))
          } catch {}
        }
      })
      getUserSettings(u.uid).then((s) => {
        if (s) {
          const merged = { ...DEFAULTS, ...s }
          setSettings(merged)
          try {
            localStorage.setItem("settings", JSON.stringify(merged))
          } catch {}
          // apply calendar prefs live
          try {
            const past = Number(merged.calendarFixedPastMonths ?? 1)
            const future = Number(merged.calendarFixedFutureMonths ?? 1)
            const inc = Boolean(merged.calendarIncludeCards ?? false)
            // Calendar settings temporarily disabled
            // setFixedPaymentRange(
            //   Math.max(0, Math.floor(isNaN(past) ? 1 : past)),
            //   Math.max(0, Math.floor(isNaN(future) ? 1 : future))
            // )
            // setIncludeCardMarkers(inc)
          } catch {}
        }
      })
      return () => {
        if (unsub) unsub()
      }
    }
    try {
      const raw = localStorage.getItem("settings")
      if (raw) {
        const merged = { ...DEFAULTS, ...safeJsonParse(raw, {}) }
        setSettings(merged)
        // apply calendar prefs live
        try {
          const past = Number(merged.calendarFixedPastMonths ?? 1)
          const future = Number(merged.calendarFixedFutureMonths ?? 1)
          const inc = Boolean(merged.calendarIncludeCards ?? false)
          // Calendar settings temporarily disabled
          // setFixedPaymentRange(
          //   Math.max(0, Math.floor(isNaN(past) ? 1 : past)),
          //   Math.max(0, Math.floor(isNaN(future) ? 1 : future))
          // )
          // setIncludeCardMarkers(inc)
        } catch {}
      }
    } catch {}
  }, [open])

  const save = async () => {
    setSaving(true)
    try {
      const u = auth?.currentUser
      const clean: Partial<UserSettings> = {}
      for (const k in settings) {
        const key = k as keyof UserSettings
        if (settings[key] !== undefined) {
          ;(clean as any)[key] = settings[key]
        }
      }
      if (u) {
        await setUserSettings(u.uid, clean)
      }
      try {
        localStorage.setItem("settings", JSON.stringify(clean))
      } catch {}
      // apply calendar prefs live
      try {
        const past = Number(settings.calendarFixedPastMonths ?? 1)
        const future = Number(settings.calendarFixedFutureMonths ?? 1)
        const inc = Boolean(settings.calendarIncludeCards ?? false)
        // Calendar settings temporarily disabled
        // setFixedPaymentRange(
        //   Math.max(0, Math.floor(isNaN(past) ? 1 : past)),
        //   Math.max(0, Math.floor(isNaN(future) ? 1 : future))
        // )
        // setIncludeCardMarkers(inc)
      } catch {}
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
      setOpen(false)
    }
  }

  const reset = () => {
    setSettings(DEFAULTS)
  }

  const playTestSound = () => {
    if (settings.soundEnabled) {
      // Web Audio API ile test sesi çal
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.1)
      } catch (e) {
        console.log("Ses çalınamadı:", e)
      }
    }
  }

  const addQuickAmount = () => {
    const amounts = settings.quickAmounts || []
    const newAmount = 1000
    if (!amounts.includes(newAmount)) {
      setSettings({ ...settings, quickAmounts: [...amounts, newAmount] })
    }
  }

  const removeQuickAmount = (amount: number) => {
    const amounts = settings.quickAmounts || []
    setSettings({ ...settings, quickAmounts: amounts.filter(a => a !== amount) })
  }

  const updateQuickAmount = (oldAmount: number, newAmount: number) => {
    const amounts = settings.quickAmounts || []
    const index = amounts.indexOf(oldAmount)
    if (index !== -1) {
      const newAmounts = [...amounts]
      newAmounts[index] = newAmount
      setSettings({ ...settings, quickAmounts: newAmounts })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6 sm:h-10 sm:w-10 flex-shrink-0" 
          title="Ayarlar"
          data-mobile-button="true"
        >
          <Settings className="h-3 w-3 sm:h-5 sm:w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[500px] md:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-auto p-2 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            Ayarlar
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">Uygulamanızı kendinize göre özelleştirin.</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid grid-cols-6 w-full h-8 sm:h-10">
            <TabsTrigger value="general" className="flex items-center gap-1 text-xs sm:text-sm p-1 sm:p-2">
              <Palette className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Genel</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-1 text-xs sm:text-sm p-1 sm:p-2">
              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Görünüm</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-1 text-xs sm:text-sm p-1 sm:p-2">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Bildirim</span>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1 text-xs sm:text-sm p-1 sm:p-2">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Takvim</span>
            </TabsTrigger>
            <TabsTrigger value="finance" className="flex items-center gap-1">
              <Coins className="h-4 w-4" />
              <span className="hidden sm:inline">Finans</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Gelişmiş</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Genel Ayarlar
                  </CardTitle>
                  <CardDescription>Temel uygulama tercihleri ve davranışları.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-save">Otomatik Kaydetme</Label>
                      <p className="text-sm text-muted-foreground">Değişiklikleri otomatik kaydet</p>
                    </div>
                    <Switch
                      id="auto-save"
                      checked={settings.autoSaveEnabled}
                      onCheckedChange={(c) => setSettings({ ...settings, autoSaveEnabled: c })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="welcome-tips">Hoş Geldin İpuçları</Label>
                      <p className="text-sm text-muted-foreground">Yeni özellikler için ipuçları göster</p>
                    </div>
                    <Switch
                      id="welcome-tips"
                      checked={settings.showWelcomeTips}
                      onCheckedChange={(c) => setSettings({ ...settings, showWelcomeTips: c })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="keyboard-shortcuts">Klavye Kısayolları</Label>
                      <p className="text-sm text-muted-foreground">Klavye kısayollarını etkinleştir</p>
                    </div>
                    <Switch
                      id="keyboard-shortcuts"
                      checked={settings.enableKeyboardShortcuts}
                      onCheckedChange={(c) => setSettings({ ...settings, enableKeyboardShortcuts: c })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sound-effects">Ses Efektleri</Label>
                      <p className="text-sm text-muted-foreground">İşlem seslerini etkinleştir</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="sound-effects"
                        checked={settings.soundEnabled}
                        onCheckedChange={(c) => setSettings({ ...settings, soundEnabled: c })}
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={playTestSound}
                        disabled={!settings.soundEnabled}
                      >
                        {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="month-reset-day">Ay Sıfırlama Günü</Label>
                    <Input
                      id="month-reset-day"
                      type="number"
                      min={1}
                      max={28}
                      value={settings.monthResetDay}
                      onChange={(e) =>
                        setSettings({ ...settings, monthResetDay: parseInt(e.target.value) })
                      }
                      className="w-24"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Görünüm Ayarları
                  </CardTitle>
                  <CardDescription>Uygulamanın görünümünü ve hissiyatını özelleştirin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Koyu Tema</Label>
                    <ThemeToggle />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="compact-view">Kompakt Görünüm</Label>
                      <p className="text-sm text-muted-foreground">Daha az boşluk, daha fazla içerik</p>
                    </div>
                    <Switch
                      id="compact-view"
                      checked={settings.compactView}
                      onCheckedChange={(c) => setSettings({ ...settings, compactView: c })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="show-balance">Bakiye Göster</Label>
                      <p className="text-sm text-muted-foreground">Ana sayfada bakiyeyi göster</p>
                    </div>
                    <Switch
                      id="show-balance"
                      checked={settings.showBalance}
                      onCheckedChange={(c) => setSettings({ ...settings, showBalance: c })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="date-format">Tarih Formatı</Label>
                    <Select 
                      value={settings.dateFormat} 
                      onValueChange={(value) => setSettings({ ...settings, dateFormat: value as any })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dd/mm/yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="mm/dd/yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-4">
              <NotificationSettingsAdvanced />
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Takvim Ayarları
                  </CardTitle>
                  <CardDescription>Takvim görünümü ve davranış tercihleri.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="calendar-past">Geçmiş Ay Sayısı</Label>
                    <Input
                      id="calendar-past"
                      type="number"
                      min={0}
                      max={12}
                      value={settings.calendarFixedPastMonths}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          calendarFixedPastMonths: parseInt(e.target.value),
                        })
                      }
                      className="w-24"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="calendar-future">Gelecek Ay Sayısı</Label>
                    <Input
                      id="calendar-future"
                      type="number"
                      min={0}
                      max={12}
                      value={settings.calendarFixedFutureMonths}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          calendarFixedFutureMonths: parseInt(e.target.value),
                        })
                      }
                      className="w-24"
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="calendar-cards">Kart Harcamalarını Göster</Label>
                      <p className="text-sm text-muted-foreground">Takvimde kart harcamalarını işaretle</p>
                    </div>
                    <Switch
                      id="calendar-cards"
                      checked={settings.calendarIncludeCards}
                      onCheckedChange={(c) =>
                        setSettings({ ...settings, calendarIncludeCards: c })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="finance" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Finansal Ayarlar
                  </CardTitle>
                  <CardDescription>Para birimi, format ve hızlı işlem ayarları.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="currency">Para Birimi</Label>
                    <Select 
                      value={settings.currency} 
                      onValueChange={(value) => setSettings({ ...settings, currency: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRY">TRY (₺)</SelectItem>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="currency-symbol">Para Birimi Sembolü</Label>
                    <Input
                      id="currency-symbol"
                      value={settings.currencySymbol}
                      onChange={(e) => setSettings({ ...settings, currencySymbol: e.target.value })}
                      className="w-20"
                      maxLength={3}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="decimal-places">Ondalık Basamak Sayısı</Label>
                    <Select 
                      value={settings.decimalPlaces?.toString()} 
                      onValueChange={(value) => setSettings({ ...settings, decimalPlaces: parseInt(value) })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="default-transaction">Varsayılan İşlem Türü</Label>
                    <Select 
                      value={settings.defaultTransactionType} 
                      onValueChange={(value) => setSettings({ ...settings, defaultTransactionType: value as any })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gider">Gider</SelectItem>
                        <SelectItem value="gelir">Gelir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <Label>Hızlı Tutar Seçenekleri</Label>
                        <p className="text-sm text-muted-foreground">İşlem girişi için hızlı tutar butonları</p>
                      </div>
                      <Button size="sm" onClick={addQuickAmount}>
                        Ekle
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(settings.quickAmounts || []).map((amount, index) => (
                        <Badge key={index} variant="secondary" className="relative group">
                          <Input
                            type="number"
                            value={amount}
                            onChange={(e) => updateQuickAmount(amount, parseInt(e.target.value))}
                            className="w-16 h-6 p-1 text-xs border-0 bg-transparent"
                            min={1}
                          />
                          <button
                            onClick={() => removeQuickAmount(amount)}
                            className="ml-1 opacity-0 group-hover:opacity-100 text-xs hover:text-red-500"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Gelişmiş Ayarlar
                  </CardTitle>
                  <CardDescription>Yedekleme ve gelişmiş sistem ayarları.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="enable-backup">Otomatik Yedekleme</Label>
                      <p className="text-sm text-muted-foreground">Verilerinizi otomatik olarak yedekle</p>
                    </div>
                    <Switch
                      id="enable-backup"
                      checked={settings.enableBackup}
                      onCheckedChange={(c) => setSettings({ ...settings, enableBackup: c })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="backup-frequency">Yedekleme Sıklığı</Label>
                    <Select 
                      value={settings.backupFrequency} 
                      onValueChange={(value) => setSettings({ ...settings, backupFrequency: value as any })}
                      disabled={!settings.enableBackup}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Günlük</SelectItem>
                        <SelectItem value="weekly">Haftalık</SelectItem>
                        <SelectItem value="monthly">Aylık</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h4 className="font-medium">Klavye Kısayolları</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>• <code>Ctrl + N</code> - Yeni işlem</div>
                      <div>• <code>Ctrl + S</code> - Kaydet</div>
                      <div>• <code>Ctrl + K</code> - Hızlı arama</div>
                      <div>• <code>Esc</code> - Dialog kapat</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={reset}>
              Varsayılanları Geri Yükle
            </Button>
          </div>
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button variant="outline">İptal</Button>
            </DialogClose>
            <Button onClick={save} disabled={saving} className="flex items-center gap-2">
              {saving ? (
                <>Kaydediliyor...</>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Değişiklikleri Kaydet
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
