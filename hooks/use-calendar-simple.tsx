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
  const [highlightedDates, setHighlightedDates] = useState<HighlightedDate[]>([])

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
