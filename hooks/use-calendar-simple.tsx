"use client"

import { createContext, useContext, useState, ReactNode } from "react"

export type HighlightedDate = {
  date: Date
  type: "payment" | "card-statement" | "card-due" | "income" | "expense" | "newlyAdded"
  description: string
  amount?: number
}

type CalendarContextType = {
  isCalendarOpen: boolean
  openCalendar: (dates?: HighlightedDate[]) => void
  closeCalendar: () => void
  highlightedDates: HighlightedDate[]
  setHighlightedDates: (dates: HighlightedDate[]) => void
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [highlightedDates, setHighlightedDates] = useState<HighlightedDate[]>([
    // Test verileri
    {
      date: new Date(2025, 8, 1), // 1 Eylül 2025
      type: "income",
      description: "Maaş",
      amount: 15000
    },
    {
      date: new Date(2025, 8, 2), // 2 Eylül 2025
      type: "expense",
      description: "Market Alışverişi",
      amount: 450
    },
    {
      date: new Date(2025, 8, 5), // 5 Eylül 2025
      type: "expense",
      description: "Kira",
      amount: 3500
    },
    {
      date: new Date(2025, 8, 10), // 10 Eylül 2025
      type: "income",
      description: "Freelance Proje",
      amount: 2500
    },
    {
      date: new Date(2025, 8, 15), // 15 Eylül 2025
      type: "expense",
      description: "Elektrik Faturası",
      amount: 320
    },
    {
      date: new Date(2025, 8, 20), // 20 Eylül 2025
      type: "expense",
      description: "Yakıt",
      amount: 800
    },
    {
      date: new Date(2025, 8, 25), // 25 Eylül 2025
      type: "income",
      description: "Yan Gelir",
      amount: 1200
    },
    {
      date: new Date(2025, 8, 28), // 28 Eylül 2025
      type: "expense",
      description: "İnternet Faturası",
      amount: 150
    }
  ])

  const openCalendar = (dates?: HighlightedDate[]) => {
    if (dates) {
      setHighlightedDates(dates)
    }
    setIsCalendarOpen(true)
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
