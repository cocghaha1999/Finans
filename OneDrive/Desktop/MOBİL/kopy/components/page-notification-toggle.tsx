"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/lib/notifications"
import { cn } from "@/lib/utils"

interface PageNotificationToggleProps {
  page: string
  className?: string
  size?: "sm" | "md" | "lg"
  variant?: "ghost" | "outline" | "default"
}

export function PageNotificationToggle({ 
  page, 
  className,
  size = "md",
  variant = "ghost"
}: PageNotificationToggleProps) {
  const { isPageNotificationEnabled, updatePageNotificationSetting } = useNotifications()
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setEnabled(isPageNotificationEnabled(page))
  }, [page, isPageNotificationEnabled])

  const handleToggle = () => {
    const newState = !enabled
    setEnabled(newState)
    updatePageNotificationSetting(page, newState)
  }

  const sizeClasses = {
    sm: "h-6 w-6 p-1",
    md: "h-8 w-8 p-1.5", 
    lg: "h-10 w-10 p-2"
  }

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={handleToggle}
      className={cn(
        sizeClasses[size],
        enabled ? "text-blue-600 hover:text-blue-700" : "text-gray-400 hover:text-gray-500",
        className
      )}
      title={enabled ? "Bildirimleri kapat" : "Bildirimleri aç"}
    >
      {enabled ? (
        <Bell className={iconSizes[size]} />
      ) : (
        <BellOff className={iconSizes[size]} />
      )}
    </Button>
  )
}

// Sayfa adlarını normalize eden yardımcı fonksiyon
export function getPageName(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  
  if (segments.length === 0) return 'home'
  
  const pageName = segments[0]
  
  // Bilinen sayfa adları
  const pageMap: Record<string, string> = {
    'budgets': 'budgets',
    'kartlarim': 'kartlarim', 
    'odemeler': 'odemeler',
    'yatirimlar': 'yatirimlar',
    'notifications': 'notifications'
  }
  
  return pageMap[pageName] || 'home'
}
