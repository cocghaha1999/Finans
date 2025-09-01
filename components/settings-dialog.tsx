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
import { ThemeToggle } from "@/components/theme-toggle"
import { auth } from "@/lib/firebase"
import { getUserSettings, setUserSettings, watchUserSettings } from "@/lib/db"
import { UserSettings } from "@/lib/types"
import Link from "next/link"
import { useCalendar } from "@/hooks/use-calendar-simple"
import { Settings } from "lucide-react"

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
        const merged = { ...DEFAULTS, ...JSON.parse(raw) }
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ayarlar</DialogTitle>
          <DialogDescription>Uygulama ayarlarınızı buradan değiştirin.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Card>
            <CardHeader>
              <CardTitle>Genel</CardTitle>
              <CardDescription>Genel uygulama tercihleri.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

          <Card>
            <CardHeader>
              <CardTitle>Görünüm</CardTitle>
              <CardDescription>Uygulamanın görünümünü özelleştirin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Koyu Tema</Label>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Takvim</CardTitle>
              <CardDescription>Takvim görünümü tercihleri.</CardDescription>
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
                <Label htmlFor="calendar-cards">Kart Harcamalarını Göster</Label>
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

          <Card>
            <CardHeader>
              <CardTitle>Bildirimler</CardTitle>
              <CardDescription>Bildirim ayarları.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="notifications">Bildirimleri Etkinleştir</Label>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={(c) => setSettings({ ...settings, notifications: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="expense-alert-threshold">Harcama Uyarı Eşiği</Label>
                <Input
                  id="expense-alert-threshold"
                  type="number"
                  value={settings.expenseAlertThreshold}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      expenseAlertThreshold: parseInt(e.target.value),
                    })
                  }
                  className="w-24"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="realert-on-change">Eşik Değiştiğinde Yeniden Uyar</Label>
                <Switch
                  id="realert-on-change"
                  checked={settings.expenseAlertRealertOnThresholdChange}
                  onCheckedChange={(c) =>
                    setSettings({
                      ...settings,
                      expenseAlertRealertOnThresholdChange: c,
                    })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="trigger-on-equal">Eşit olduğunda Uyar</Label>
                <Switch
                  id="trigger-on-equal"
                  checked={settings.expenseAlertTriggerOnEqual}
                  onCheckedChange={(c) =>
                    setSettings({ ...settings, expenseAlertTriggerOnEqual: c })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={reset}>Sıfırla</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
