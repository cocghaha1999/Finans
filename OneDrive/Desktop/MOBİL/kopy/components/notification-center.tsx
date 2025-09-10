"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell } from 'lucide-react'
import { useNotifications } from '@/lib/notifications'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  
  const { 
    getNotifications, 
    markAllAsRead: markAllAsReadService, 
    getUnreadCount,
    markAsRead 
  } = useNotifications()

  // Memoize the load function to prevent recreating on every render
  const loadNotifications = useCallback(() => {
    try {
      const notifs = getNotifications()
      // Notifications are already sorted by service (newest first)
      setNotifications(notifs)
      setUnreadCount(getUnreadCount())
    } catch (e) {
      console.error('Error loading notifications:', e)
    }
  }, [getNotifications, getUnreadCount])

  useEffect(() => {
    // Initial load
    loadNotifications()
  }, [loadNotifications])

  // Separate effect for polling when popover is open
  useEffect(() => {
    if (!isOpen) return

    // Refresh notifications when popover opens and periodically while open
    loadNotifications()
    
    const interval = setInterval(loadNotifications, 5000) // 5 seconds when open
    
    return () => clearInterval(interval)
  }, [isOpen, loadNotifications])

  const markAllAsRead = useCallback(() => {
    markAllAsReadService()
    loadNotifications()
  }, [markAllAsReadService, loadNotifications])

  const handleNotificationClick = useCallback((notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id)
      loadNotifications()
    }
  }, [markAsRead, loadNotifications])

  const formatTime = (date: Date | string) => {
    const notifDate = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Şimdi'
    if (diffMins < 60) return `${diffMins}d önce`
    if (diffHours < 24) return `${diffHours}s önce`
    if (diffDays < 7) return `${diffDays} gün önce`
    return notifDate.toLocaleDateString('tr-TR')
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-6 w-6 sm:h-10 sm:w-10 flex-shrink-0" 
          title="Bildirimler"
          data-mobile-button="true"
        >
          <Bell className="h-3 w-3 sm:h-5 sm:w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[8px] sm:text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 mr-2 sm:mr-4">
        <div className="p-3 sm:p-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm sm:text-base">Bildirimler</h3>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs h-7 px-2"
              >
                Tümünü Okundu İşaretle
              </Button>
            )}
          </div>
        </div>
        
        <div className="max-h-80 sm:max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Henüz bildirim yok</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.slice(0, 20).map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 hover:bg-muted/50 cursor-pointer border-l-2 transition-colors ${
                    notification.read ? 'border-transparent' : 'border-primary'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.title || 'Bildirim'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {notification.body || notification.message || 'Bildirim mesajı'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTime(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
              {notifications.length > 20 && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t">
                  {notifications.length - 20} daha fazla bildirim var
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
