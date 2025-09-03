"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  BellRing,
  Trash2, 
  Check, 
  AlertCircle,
  Calendar,
  Wallet,
  Target,
  TrendingUp,
  CreditCard,
  MoreHorizontal
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { tr } from 'date-fns/locale'

export interface EnhancedNotification {
  id: string
  type: "payment" | "budget" | "card" | "achievement" | "alert"
  title: string
  message: string
  timestamp: Date
  read: boolean
  priority: "low" | "medium" | "high"
  actionUrl?: string
  data?: any
}

interface EnhancedNotificationCenterProps {
  notifications?: EnhancedNotification[]
  onMarkAsRead?: (id: string) => void
  onMarkAllAsRead?: () => void
  onDelete?: (id: string) => void
  onClearAll?: () => void
}

const notificationIcons = {
  payment: Bell,
  budget: Target,
  card: CreditCard,
  achievement: TrendingUp,
  alert: AlertCircle,
}

const priorityColors = {
  low: "text-muted-foreground",
  medium: "text-blue-500",
  high: "text-red-500",
}

// Mock veriler
const mockNotifications: EnhancedNotification[] = []

export function EnhancedNotificationCenter({
  notifications = mockNotifications,
  onMarkAsRead = () => {},
  onMarkAllAsRead = () => {},
  onDelete = () => {},
  onClearAll = () => {}
}: EnhancedNotificationCenterProps) {
  const [filter, setFilter] = useState<"all" | "unread" | "payment" | "budget" | "card">("all")
  const [isOpen, setIsOpen] = useState(false)
  
  const filteredNotifications = notifications.filter(notification => {
    if (filter === "all") return true
    if (filter === "unread") return !notification.read
    return notification.type === filter
  })

  const unreadCount = notifications.filter(n => !n.read).length

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
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Bildirimler
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </CardTitle>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>İşlemler</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onMarkAllAsRead}>
                    <Check className="mr-2 h-4 w-4" />
                    Tümünü Okundu İşaretle
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onClearAll} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Tümünü Temizle
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filter tabs */}
            <Tabs value={filter} onValueChange={(value: any) => setFilter(value)} className="mt-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Tümü</TabsTrigger>
                <TabsTrigger value="unread">Okunmamış</TabsTrigger>
                <TabsTrigger value="payment">Ödemeler</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <AnimatePresence mode="popLayout">
                {filteredNotifications.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-8 text-center"
                  >
                    <Bell className="h-12 w-12 text-muted-foreground/50 mb-2" />
                    <p className="text-muted-foreground">Bildirim bulunmuyor</p>
                  </motion.div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredNotifications.map((notification, index) => (
                      <EnhancedNotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={onMarkAsRead}
                        onDelete={onDelete}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}

function EnhancedNotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  index
}: {
  notification: EnhancedNotification
  onMarkAsRead: (id: string) => void
  onDelete: (id: string) => void
  index: number
}) {
  const Icon = notificationIcons[notification.type]
  const timeAgo = formatDistanceToNow(notification.timestamp, { 
    addSuffix: true, 
    locale: tr 
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
      className={`group relative p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm ${
        notification.read 
          ? "bg-background border-border/50" 
          : "bg-accent/50 border-primary/20"
      }`}
      onClick={() => !notification.read && onMarkAsRead(notification.id)}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 p-2 rounded-full bg-background ${priorityColors[notification.priority]}`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="font-medium text-sm leading-tight">
                {notification.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {timeAgo}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkAsRead(notification.id)
                  }}
                  className="h-6 w-6 p-0"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(notification.id)
                }}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Unread indicator */}
        {!notification.read && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
        )}
      </div>

      {/* Priority indicator */}
      {notification.priority === "high" && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-lg" />
      )}
    </motion.div>
  )
}
