"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Bell, CheckCheck } from "lucide-react"
import type { AppNotification } from "@/lib/types"
import { auth } from "@/lib/firebase"
import { listNotifications, watchNotifications, markNotificationRead, clearNotifications } from "@/lib/db"
import { AuthGuard } from "@/components/auth-guard"
import Link from "next/link"
import { safeJsonParse } from "@/lib/utils"

export default function NotificationsPage() {
  const [items, setItems] = useState<AppNotification[]>([])

  useEffect(() => {
    const u = auth?.currentUser
    if (u) {
      const unsub = watchNotifications(u.uid, (list) => setItems(list))
      listNotifications(u.uid).then((list) => list.length && setItems(list))
      return () => { if (unsub) unsub() }
    }
    try {
      const raw = localStorage.getItem("notifications")
      if (raw) setItems(safeJsonParse(raw, []) as any)
      else setItems([])
    } catch {
      setItems([])
    }
  }, [])

  useEffect(() => {
    const u = auth?.currentUser
    if (u) return
    try { localStorage.setItem("notifications", JSON.stringify(items)) } catch {}
  }, [items])

  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items])

  const markAllRead = async () => {
    const u = auth?.currentUser
    if (u) {
      await Promise.all(items.filter((n) => !n.read).map((n) => markNotificationRead(u.uid, n.id)))
    }
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
  }
  const clearAll = async () => {
    const u = auth?.currentUser
    if (u) await clearNotifications(u.uid)
    setItems([])
  }

  return (
    <AuthGuard>
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline">Geri</Button>
          </Link>
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Bildirimler</h1>
          <Badge variant="secondary">{unreadCount} okunmamış</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={markAllRead} disabled={!unreadCount}>
            <CheckCheck className="h-4 w-4 mr-2" /> Hepsini okundu işaretle
          </Button>
          <Button variant="destructive" onClick={clearAll} disabled={!items.length}>Tümünü temizle</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Son Bildirimler</CardTitle>
          <CardDescription>Uygulama tarafından oluşturulan uyarılar ve bilgilendirmeler</CardDescription>
        </CardHeader>
        <CardContent>
          {!items.length ? (
            <div className="text-center py-16 text-muted-foreground">Bildirim bulunmuyor</div>
          ) : (
            <div className="space-y-4">
              {items.map((n) => (
                <div key={n.id} className="p-4 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{n.title}</span>
                        {!n.read && <Badge>Yeni</Badge>}
                      </div>
                      {n.description && <div className="text-sm text-muted-foreground">{n.description}</div>}
                      <div className="text-xs text-muted-foreground">{new Date(n.date).toLocaleString("tr-TR")}</div>
                    </div>
                    {!n.read && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        const u = auth?.currentUser
                        if (u) await markNotificationRead(u.uid, n.id)
                        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
                      }}>
                        Okundu
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
  </div>
  </AuthGuard>
  )
}
