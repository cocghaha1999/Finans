"use client"

import { createContext, useContext, useState, ReactNode, useEffect } from "react"
import { useNotifications } from "@/lib/notifications"

export type HighlightedDate = {
  id?: string  // Add unique identifier for payments
  date: Date
  type: "payment" | "card-statement" | "card-due" | "income" | "expense" | "newlyAdded"
  description: string
  amount?: number
  title?: string
  category?: string
}

type CalendarContextType = {
  isCalendarOpen: boolean
  openCalendar: (dates?: HighlightedDate[]) => void
  closeCalendar: () => void
  highlightedDates: HighlightedDate[]
  setHighlightedDates: (dates: HighlightedDate[]) => void
  notificationsEnabled: boolean
  setNotificationsEnabled: (enabled: boolean) => void
  addCalendarEvent: (event: HighlightedDate) => void
  removeCalendarEvent: (eventId: string) => void
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [highlightedDates, setHighlightedDates] = useState<HighlightedDate[]>([])
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  
  const {
    checkDailyCalendarEvents,
    checkPastCalendarEvents,
    createCalendarEventNotification,
    getNotificationSettings
  } = useNotifications()

  // Takvim açıldığında bildirim ayarlarını kontrol et
  useEffect(() => {
    const settings = getNotificationSettings()
    setNotificationsEnabled(settings.calendarNotifications)
  }, [getNotificationSettings])

  // Highlighted dates değiştiğinde bildirim kontrolü yap
  useEffect(() => {
    if (notificationsEnabled && highlightedDates.length > 0) {
      // Günlük etkinlik kontrolü
      checkDailyCalendarEvents(highlightedDates)
      // Geçmiş etkinlik kontrolü
      checkPastCalendarEvents(highlightedDates)
    }
  }, [highlightedDates, notificationsEnabled, checkDailyCalendarEvents, checkPastCalendarEvents])

  // Takvim etkinliği ekleme bildirimi ile
  const addCalendarEvent = (event: HighlightedDate) => {
    setHighlightedDates((prev: HighlightedDate[]) => [...prev, event])
    
    if (notificationsEnabled) {
      // Etkinlik eklendiğinde bildirim oluştur
      createCalendarEventNotification({
        title: event.title || event.description,
        type: event.type,
        amount: event.amount,
        description: event.description,
        date: event.date.toISOString(),
        category: event.category
      })
    }
  }

  // Takvim etkinliği silme
  const removeCalendarEvent = (paymentId: string) => {
    setHighlightedDates((prev: HighlightedDate[]) => 
      prev.filter((event: HighlightedDate) => event.id !== paymentId)
    )
  }

  const openCalendar = (dates?: HighlightedDate[]) => {
    if (dates) {
      setHighlightedDates(dates)
    }
    setIsCalendarOpen(true)

    // Takvim açıldığında mesaj dinleyici ekle
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'OPEN_CALENDAR') {
        setIsCalendarOpen(true)
      }
    }
    window.addEventListener('message', handleMessage)
    
    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }

  const closeCalendar = () => {
    setIsCalendarOpen(false)
  }

  return (
    <CalendarContext.Provider value={{
      isCalendarOpen,
      openCalendar,
      closeCalendar,
      highlightedDates,
      setHighlightedDates,
      notificationsEnabled,
      setNotificationsEnabled,
      addCalendarEvent,
      removeCalendarEvent,
    }}>
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}
