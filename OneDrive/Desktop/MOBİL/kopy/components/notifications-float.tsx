"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { auth } from "@/lib/firebase"
import { watchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "@/lib/db"
import type { Notification } from "@/lib/types"
import { useAuthState } from "react-firebase-hooks/auth"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import { Banknote, BellRing, ShieldAlert, Info, CheckCheck, Bell } from "lucide-react"
import { cn } from "@/lib/utils"

interface NotificationsFloatProps {
  open: boolean
  onClose: () => void
}

const notificationIcons: Record<Notification["type"], React.ReactNode> = {
  payment: <Banknote className="h-5 w-5" />,
  reminder: <BellRing className="h-5 w-5" />,
  alert: <ShieldAlert className="h-5 w-5" />,
  info: <Info className="h-5 w-5" />,
}

const notificationColors: Record<Notification["type"], string> = {
  payment: "text-green-500",
  reminder: "text-blue-500",
  alert: "text-red-500",
  info: "text-gray-500",
}

export function NotificationsFloat({ open, onClose }: NotificationsFloatProps) {
  const [user] = useAuthState(auth!)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    if (user && open) {
  const unsubscribe = watchNotifications(user.uid, setNotifications)
  return () => { if (unsubscribe) unsubscribe() }
    }
  }, [user, open])

  const handleMarkAsRead = async (id: string) => {
    if (user) {
      await markNotificationAsRead(user.uid, id)
    }
  }

  const handleMarkAllRead = async () => {
    if (user) {
      await markAllNotificationsAsRead(user.uid)
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="flex flex-col h-full max-h-[100dvh]">
        <SheetHeader>
          <SheetTitle>Bildirimler ({unreadCount > 0 ? `${unreadCount} yeni` : "tümü okundu"})</SheetTitle>
          <SheetDescription>
            Son güncellemeler ve hatırlatıcılar.
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-grow -mr-6 pr-6">
          <div className="space-y-2 pr-6">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const Icon = notificationIcons[notif.type] || notificationIcons.info
                const color = notificationColors[notif.type] || notificationColors.info

                const content = (
                  <div
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-muted/80 cursor-pointer",
                      !notif.read && "bg-muted/50"
                    )}
                    onClick={() => {
                      if (!notif.read) handleMarkAsRead(notif.id!)
                      if (notif.link) onClose()
                    }}
                  >
                    <div className="relative flex-shrink-0">
                      {!notif.read && (
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
                      )}
                      <div className={cn("mt-1", color, notif.read && "opacity-50")}>{Icon}</div>
                    </div>
                    <div className="flex-grow">
                      <p className={cn("text-sm", !notif.read ? "font-semibold text-foreground" : "text-muted-foreground")}>
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: tr })}
                      </p>
                    </div>
                  </div>
                )

                if (notif.link) {
                  return (
                    <Link href={notif.link} key={notif.id} passHref>
                      {content}
                    </Link>
                  )
                }
                return <div key={notif.id}>{content}</div>
              })
            ) : (
              <div className="text-center text-muted-foreground py-16 flex flex-col items-center justify-center">
                <Bell className="h-10 w-10 mb-4" />
                <h3 className="font-semibold">Henüz bildirim yok</h3>
                <p className="text-sm">Yeni bir şey olduğunda burada görünecek.</p>
              </div>
            )}
          </div>
        </ScrollArea>
        {notifications.length > 0 && (
          <SheetFooter className="mt-4 sticky bottom-0 bg-background pt-2">
            <Button variant="outline" className="w-full" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Tümünü Okundu Olarak İşaretle
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
