"use client"

import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback, type JSX } from "react"
import { auth } from "../lib/firebase"
import { watchTransactions, watchPayments, watchCards } from "../lib/db"
import { safeJsonParse } from "../lib/utils"
import type { Transaction, Payment, BankCard } from "../lib/types"

export type HighlightedDate = {
  date: Date
  type: "payment" | "card-statement" | "card-due" | "income" | "expense" | "newlyAdded"
  description: string
}

type CalendarContextType = {
  isCalendarOpen: boolean
  openCalendar: (dates?: HighlightedDate[]) => void
  closeCalendar: () => void
  highlightedDates: HighlightedDate[]
  setHighlightedDates: (dates: HighlightedDate[]) => void
  // customization
  setFixedPaymentRange: (pastMonths: number, futureMonths: number) => void
  setIncludeCardMarkers: (enabled: boolean) => void
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

export function CalendarProvider({ children }: { children: ReactNode }): JSX.Element {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [highlightedDates, setHighlightedDates] = useState<HighlightedDate[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [cards, setCards] = useState<BankCard[]>([])
  // customization state
  const [rangePast, setRangePast] = useState<number>(3)
  const [rangeFuture, setRangeFuture] = useState<number>(3)
  const [includeCards, setIncludeCards] = useState<boolean>(true)
  const txRef = useRef<Transaction[]>([])
  const payRef = useRef<Payment[]>([])
  const cardRef = useRef<BankCard[]>([])
  const rangeRef = useRef<{ past: number; future: number }>({ past: 3, future: 3 })
  const includeCardsRef = useRef<boolean>(true)

  const recompute = useCallback(() => {
    const events = composeHighlights(
      txRef.current,
      payRef.current,
      cardRef.current,
      rangeRef.current.past,
      rangeRef.current.future,
      includeCardsRef.current,
    )
    setHighlightedDates(events)
  }, [])

  useEffect(() => {
    // Keep refs in sync
    txRef.current = transactions
  }, [transactions])
  useEffect(() => {
    payRef.current = payments
  }, [payments])
  useEffect(() => {
    cardRef.current = cards
  }, [cards])
  useEffect(() => {
    rangeRef.current = { past: rangePast, future: rangeFuture }
    recompute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangePast, rangeFuture])
  useEffect(() => {
    includeCardsRef.current = includeCards
    recompute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeCards])

  // Initialize customization from saved settings (localStorage)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("settings")
      if (raw) {
        const s = safeJsonParse(raw, {} as any)
  const past = Number(s.calendarFixedPastMonths ?? 3)
  const future = Number(s.calendarFixedFutureMonths ?? 3)
  const inc = Boolean(s.calendarIncludeCards ?? true)
        setRangePast(Math.max(0, Math.floor(isNaN(past) ? 1 : past)))
        setRangeFuture(Math.max(0, Math.floor(isNaN(future) ? 1 : future)))
        setIncludeCards(inc)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // Prefill highlights continuously (before calendar opens)
    if (!auth) {
      // Guest mode: local-only
      try {
        const raw = localStorage.getItem("transactions")
        const txns: Transaction[] = raw ? safeJsonParse(raw, []) : []
        setTransactions(txns)
        setPayments([])
  txRef.current = txns
  payRef.current = []
        recompute()
      } catch {
        setTransactions([])
        setPayments([])
  txRef.current = []
  payRef.current = []
        setHighlightedDates([])
      }
      return
    }

  let unsubTransactions: (() => void) | null = null
  let unsubPayments: (() => void) | null = null
  let unsubCards: (() => void) | null = null

    const unsubAuth = auth.onAuthStateChanged((user) => {
      // cleanup existing
  try { unsubTransactions && unsubTransactions() } catch {}
  try { unsubPayments && unsubPayments() } catch {}
  try { unsubCards && unsubCards() } catch {}
  unsubTransactions = unsubPayments = unsubCards = null

      if (user) {
        unsubTransactions = watchTransactions(user.uid, (tx) => {
          setTransactions(tx || [])
          txRef.current = tx || []
          // Debounce recompute calls
          setTimeout(() => recompute(), 100)
        }) || null
        unsubPayments = watchPayments(user.uid, (ps) => {
          setPayments(ps || [])
          payRef.current = ps || []
          setTimeout(() => recompute(), 100)
        }) || null
        unsubCards = watchCards(user.uid, (cs) => {
          setCards(cs || [])
          cardRef.current = cs || []
          setTimeout(() => recompute(), 100)
        }) || null
      } else {
        // Logged out → fallback to local txns
        try {
          const raw = localStorage.getItem("transactions")
          const txns: Transaction[] = raw ? safeJsonParse(raw, []) : []
          setTransactions(txns)
          setPayments([])
          setCards([])
          txRef.current = txns
          payRef.current = []
          cardRef.current = []
          setTimeout(() => recompute(), 100)
        } catch {
          setTransactions([])
          setPayments([])
          setCards([])
          txRef.current = []
          payRef.current = []
          cardRef.current = []
          setHighlightedDates([])
        }
      }
    })

    return () => {
  try { unsubAuth() } catch {}
  try { unsubTransactions && unsubTransactions() } catch {}
  try { unsubPayments && unsubPayments() } catch {}
  try { unsubCards && unsubCards() } catch {}
    }
  }, [])

  const openCalendar = (dates: HighlightedDate[] = []) => {
    // If dates provided, override snapshot; otherwise recompute from current data
    if (dates.length > 0) {
      setHighlightedDates(dates)
    } else {
      recompute()
    }
    setIsCalendarOpen(true)
  }

  const closeCalendar = () => {
    setIsCalendarOpen(false)
    // Keep highlights cached so next open shows markers immediately
  }

  return (
    <CalendarContext.Provider
      value={{
        isCalendarOpen,
        openCalendar,
        closeCalendar,
        highlightedDates,
        setHighlightedDates,
        setFixedPaymentRange: (past: number, future: number) => {
          setRangePast(Math.max(0, Math.floor(past)))
          setRangeFuture(Math.max(0, Math.floor(future)))
        },
        setIncludeCardMarkers: (enabled: boolean) => setIncludeCards(!!enabled),
      }}
    >
      {children}
    </CalendarContext.Provider>
  )
}

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider")
  }
  return context
}

// Helpers to compose highlight events
function composeHighlights(
  txns: Transaction[],
  pays: Payment[],
  cards: BankCard[],
  pastMonths: number,
  futureMonths: number,
  includeCards: boolean,
): HighlightedDate[] {
  const daysInMonth = (year: number, monthIndex0: number) => {
    return new Date(year, monthIndex0 + 1, 0).getDate()
  }
  // Esnek tarih ayrıştırma: öncelik DD-MM-YYYY, aynı zamanda YYYY-MM-DD ve farklı ayraçlar (-/.) desteklenir
  const parseDateFlexible = (s: string): Date | null => {
    if (!s) return null
    const core = String(s).trim().split("T")[0]
    // DD-MM-YYYY veya DD/MM/YYYY veya DD.MM.YYYY
    let m = /^(\d{2})[-\/.](\d{2})[-\/.](\d{4})$/.exec(core)
    if (m) {
      const d = Number(m[1])
      const mo = Number(m[2]) - 1
      const y = Number(m[3])
      const dt = new Date(y, mo, d)
      return isNaN(dt.getTime()) ? null : dt
    }
    // YYYY-MM-DD
    m = /^(\d{4})[-\/.](\d{2})[-\/.](\d{2})$/.exec(core)
    if (m) {
      const y = Number(m[1])
      const mo = Number(m[2]) - 1
      const d = Number(m[3])
      const dt = new Date(y, mo, d)
      return isNaN(dt.getTime()) ? null : dt
    }
    return null
  }
  const today = new Date()
  const events: HighlightedDate[] = []

  // Transactions -> income and expense
  for (const t of txns) {
  const d = parseDateFlexible(t.date)
    if (!d) continue
    if (t.type === "gider") {
      events.push({
        date: d,
        type: "expense",
        description: `${t.description} • ₺${t.amount.toLocaleString("tr-TR")}`,
      })
    } else if (t.type === "gelir") {
      events.push({
        date: d,
        type: "income",
        description: `${t.description} • ₺${t.amount.toLocaleString("tr-TR")}`,
      })
    }
  }

  // Payments -> payment (with range)
  for (const p of pays) {
  // Hide paid items from the calendar to reduce confusion
  if (p.status === "paid") continue

  if (p.paymentType === "custom" && p.date) {
      const d = parseDateFlexible(p.date)
      if (d) {
        events.push({ date: d, type: "payment", description: `${p.name} • ₺${p.amount.toLocaleString("tr-TR")}` })
      }
    }
    // For fixed: mark previous..next months range
    if (p.paymentType === "fixed" && typeof p.paymentDay === "number") {
      const windowMonths: number[] = []
      for (let i = -pastMonths; i <= futureMonths; i++) windowMonths.push(today.getMonth() + i)
      const years = windowMonths.map((m) => today.getFullYear() + Math.floor(m / 12))
      const normMonths = windowMonths.map((m) => ((m % 12) + 12) % 12)
      for (let i = 0; i < windowMonths.length; i++) {
        const maxDay = daysInMonth(years[i], normMonths[i])
        const clampDay = Math.min(Math.max(1, p.paymentDay), maxDay)
        const d = new Date(years[i], normMonths[i], clampDay)
        events.push({ date: d, type: "payment", description: `${p.name} • ₺${p.amount.toLocaleString("tr-TR")}` })
      }
    }
  }

  // Cards (optional)
  if (includeCards) {
    const windowMonths: number[] = []
    for (let i = -pastMonths; i <= futureMonths; i++) windowMonths.push(today.getMonth() + i)
    const years = windowMonths.map((m) => today.getFullYear() + Math.floor(m / 12))
    const normMonths = windowMonths.map((m) => ((m % 12) + 12) % 12)
    for (const c of cards) {
      const stmt = c.statementDate ? parseInt(String(c.statementDate).replace(/\D/g, "")) : NaN
      const due = c.paymentDueDate ? parseInt(String(c.paymentDueDate).replace(/\D/g, "")) : NaN
      for (let i = 0; i < windowMonths.length; i++) {
        const maxDay = daysInMonth(years[i], normMonths[i])
        if (!isNaN(stmt)) {
          const clampDay = Math.min(Math.max(1, stmt), maxDay)
          const d = new Date(years[i], normMonths[i], clampDay)
          events.push({ date: d, type: "card-statement", description: `${c.nickname || c.bankName} Ekstre` })
        }
        if (!isNaN(due)) {
          const clampDay = Math.min(Math.max(1, due), maxDay)
          const d = new Date(years[i], normMonths[i], clampDay)
          events.push({ date: d, type: "card-due", description: `${c.nickname || c.bankName} Son Ödeme` })
        }
      }
    }
  }

  return events
}

