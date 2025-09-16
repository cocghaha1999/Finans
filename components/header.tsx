"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Wallet,
  Home,
  Receipt,
  CreditCard,
  Target,
  Settings,
  Bell,
  User,
  FileText,
  Calendar,
  LogOut,
  TrendingUp,
} from "lucide-react"

import { auth } from "@/lib/firebase"
import { signOut, type User as FirebaseUser, type Unsubscribe } from "firebase/auth"
import { watchNotifications, watchTransactions, watchPayments, watchCards, getUserSettings, watchUserSettings, addTransaction, addNotification, isFirestoreReady, listTransactions } from "@/lib/db"
import type { Transaction, Payment, BankCard } from "@/lib/types"
import { safeJsonParse, safeLocalStorage } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { NotesFloat } from "./notes-float"
import { NotificationsFloat } from "./notifications-float"
import { useCalendar, type HighlightedDate } from "@/hooks/use-calendar-simple"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SettingsDialog } from "./settings-dialog"
import { NotificationCenter } from "./notification-center"

export default function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null)
  const [unreadNotif, setUnreadNotif] = useState<number>(0)
  const [totalBalance, setTotalBalance] = useState(0)
  const [resetDay, setResetDay] = useState<number>(1)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [cards, setCards] = useState<BankCard[]>([])
  const { openCalendar } = useCalendar()
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [desiredBalance, setDesiredBalance] = useState("")

  useEffect(() => {
    if (!auth) return

  let unsubNotifications: Unsubscribe | undefined
  let unsubTransactions: Unsubscribe | undefined
  let unsubPayments: Unsubscribe | undefined
  let unsubCards: Unsubscribe | undefined

    const unsubAuth = auth.onAuthStateChanged(user => {
      setCurrentUser(user)

      // Clean up previous listeners
  if (unsubNotifications) unsubNotifications()
  if (unsubTransactions) unsubTransactions()
  if (unsubPayments) unsubPayments()
  if (unsubCards) unsubCards()

      if (user) {
        // user settings for period start day
        getUserSettings(user.uid).then((s) => {
          const d = Number((s as any)?.monthResetDay)
          if (Number.isFinite(d) && d >= 1 && d <= 31) setResetDay(d)
        }).catch(() => {})
        const unsubSettings = watchUserSettings(user.uid, (s) => {
          const d = Number((s as any)?.monthResetDay)
          if (Number.isFinite(d) && d >= 1 && d <= 31) setResetDay(d)
        })
        // Set up new listeners for logged-in user
  unsubNotifications = watchNotifications(user.uid, list => {
          setUnreadNotif(list.filter(n => !n.read).length)
  }) || undefined
  unsubTransactions = watchTransactions(user.uid, (txns: Transaction[]) => {
    setTransactions(txns)
  }) || undefined
  unsubPayments = watchPayments(user.uid, (list: Payment[]) => {
          setPayments(list)
  }) || undefined
  unsubCards = watchCards(user.uid, (list: BankCard[]) => {
          setCards(list)
  }) || undefined
        // Ensure settings unsubscribed
        const prevAuthUnsub = unsubAuth
        // chain cleanups on auth change as well
        const prevCleanup = () => {
          if (unsubNotifications) unsubNotifications()
          if (unsubTransactions) unsubTransactions()
          if (unsubPayments) unsubPayments()
          if (unsubCards) unsubCards()
          if (typeof unsubSettings === "function") unsubSettings()
        }
        // Replace cleanups
        ;(unsubNotifications as any)._cleanup = prevCleanup
      } else {
        // User is logged out, clear notifications and get balance from local storage
        setUnreadNotif(0)
        try {
          const storage = safeLocalStorage()
          const localTxns = storage.getItem("transactions")
          setTransactions(safeJsonParse(localTxns, []))
        } catch { setTransactions([]) }
        setPayments([])
        setCards([])
      }
    })

    // Cleanup function for the main effect
  return () => {
      unsubAuth()
      if (unsubNotifications) unsubNotifications()
      if (unsubTransactions) unsubTransactions()
      if (unsubPayments) unsubPayments()
      if (unsubCards) unsubCards()
    }
  }, [])

  // Logged-out: listen to local transaction changes to refresh balance immediately
  useEffect(() => {
  const handler = () => {
      if (currentUser) return
      try {
        const storage = safeLocalStorage()
        const raw = storage.getItem("transactions")
        const txns: Transaction[] = safeJsonParse(raw, [])
        setTransactions(txns)
        // Kümülatif bakiye hesaplama - Tüm işlemler dahil
        const totalBalance = txns.reduce((acc, t) => acc + (t.type === "gelir" ? t.amount : -t.amount), 0)
        setTotalBalance(totalBalance)
      } catch {}
    }
    window.addEventListener("transactions:changed", handler)
    // Logged-in refresh hook: force-fetch latest txns when requested
    const refresh = async () => {
      const u = auth?.currentUser
      if (!u || !isFirestoreReady()) return
      try {
        const list = await listTransactions(u.uid)
        setTransactions(list || [])
      } catch {}
    }
    window.addEventListener("transactions:refresh-request", refresh)
    return () => {
      window.removeEventListener("transactions:changed", handler)
      window.removeEventListener("transactions:refresh-request", refresh)
    }
  }, [currentUser, resetDay])

  // Recompute cumulative balance whenever transactions change
  useEffect(() => {
    const txns = transactions || []
    // Kümülatif bakiye hesaplama - Tüm işlemler dahil
    const totalBalance = txns.reduce((acc, t) => acc + (t.type === "gelir" ? t.amount : -t.amount), 0)
    setTotalBalance(totalBalance)
  }, [transactions])

  const openGlobalCalendar = () => {
    const today = new Date()
    const events: HighlightedDate[] = []

    // Transactions -> income/expense
    const parseYMD = (s: string): Date | null => {
      const core = String(s || "").split("T")[0]
      const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(core)
      if (!m) return null
      const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      return isNaN(dt.getTime()) ? null : dt
    }

    for (const t of transactions) {
      const d = parseYMD(t.date)
      if (d) {
        events.push({
          date: d,
          type: t.type === "gelir" ? "income" : "expense",
          description: `${t.description} • ₺${t.amount.toLocaleString("tr-TR")}`,
          amount: t.amount
        })
      }
    }

    // Payments -> payment
    for (const p of payments) {
      if (p.paymentType === "custom" && p.date) {
        const d = parseYMD(p.date)
        if (d) {
          events.push({ date: d, type: "payment", description: `${p.name} • ₺${p.amount.toLocaleString("tr-TR")}`, amount: p.amount })
        }
      }
      if (p.paymentType === "fixed" && typeof p.paymentDay === "number") {
        const d = new Date(today.getFullYear(), today.getMonth(), Math.min(Math.max(1, p.paymentDay), 28))
        events.push({ date: d, type: "payment", description: `${p.name} • ₺${p.amount.toLocaleString("tr-TR")}`, amount: p.amount })
      }
    }

    // Cards -> card-statement / card-due
    for (const c of cards) {
      if (c.statementDate) {
        const day = parseInt(String(c.statementDate).replace(/\D/g, ""))
        if (!isNaN(day)) {
          const d = new Date(today.getFullYear(), today.getMonth(), Math.min(Math.max(1, day), 28))
          events.push({ date: d, type: "card-statement", description: `${c.nickname || c.bankName} Ekstre` })
        }
      }
      if (c.paymentDueDate) {
        const day = parseInt(String(c.paymentDueDate).replace(/\D/g, ""))
        if (!isNaN(day)) {
          const d = new Date(today.getFullYear(), today.getMonth(), Math.min(Math.max(1, day), 28))
          events.push({ date: d, type: "card-due", description: `${c.nickname || c.bankName} Son Ödeme` })
        }
      }
    }

    openCalendar(events)
  }

  const handleLogout = async () => {
    try {
      // Firebase çıkışı
      if (auth) {
        await signOut(auth)
      }
      
      // Çevrimdışı verileri temizle
      localStorage.removeItem('offline-user')
      localStorage.removeItem('offline-credentials')
      
      // Login sayfasına yönlendir
      router.push('/login')
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error)
    }
  }

  const navItems = [
    { href: "/", label: "Panel", icon: Home },
    { href: "/odemeler", label: "Ödemeler", icon: Receipt },
    { href: "/yatirimlar", label: "Yatırımlar", icon: TrendingUp },
    { href: "/kartlarim", label: "Kartlarım", icon: CreditCard },
    { href: "/budgets", label: "Bütçeler", icon: Target },
  ]

  const handleReconcile = async () => {
    const parseAmount = (raw: string): number => {
      if (!raw) return NaN
      const s = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".")
      return Number(s)
    }
    const val = parseAmount(desiredBalance)
    if (!isFinite(val)) return
    // Compute current period balance again to get precise delta
    const today = new Date()
    const y = today.getFullYear(), m = today.getMonth(), d = today.getDate()
    const day = Math.min(Math.max(1, resetDay), 28)
    const start = d >= day ? new Date(y, m, day) : new Date(y, m - 1, day)
    const end = d >= day ? new Date(y, m + 1, day - 1) : new Date(y, m, day - 1)
    end.setHours(23, 59, 59, 999)

    const inPeriod = (t: Transaction) => { const td = new Date(t.date); return td >= start && td <= end }
    const current = (transactions || []).filter(inPeriod)
      .reduce((acc, t) => acc + (t.type === "gelir" ? t.amount : -t.amount), 0)
    // Compute previous period leftover (carryover)
    const prevStart = new Date(start)
    prevStart.setMonth(prevStart.getMonth() - 1)
  const prevEnd = new Date(start)
  prevEnd.setDate(prevEnd.getDate() - 1)
  prevEnd.setHours(23, 59, 59, 999)
    const prevTotal = transactions
      .filter((t) => { const td = new Date(t.date); return td >= prevStart && td <= prevEnd })
      .reduce((acc, t) => acc + (t.type === "gelir" ? t.amount : -t.amount), 0)

  // Basit ve güvenli eşitleme: sadece bu dönem toplamını hedefe ayarla
  const delta = val - current

  const reconTxn = Math.abs(delta) > 0.00001 ? {
      id: crypto.randomUUID(),
      type: delta > 0 ? "gelir" : "gider",
      amount: Math.abs(delta),
      description: delta > 0 ? "Bakiye Eşitleme (Gelir)" : "Bakiye Eşitleme (Gider)",
      category: "Eşitleme",
      date: new Date().toISOString().slice(0,10),
      createdAt: Date.now(),
    } as any : null

    const u = auth?.currentUser
  if (u?.uid && isFirestoreReady()) {
      if (reconTxn) {
        await addTransaction(u.uid, reconTxn)
        await addNotification(u.uid, { message: `${reconTxn.description} • ₺${reconTxn.amount.toLocaleString("tr-TR")}` , type: "info", read: false, timestamp: Date.now() })
      }
    } else {
      try {
        const storage = safeLocalStorage()
        const raw = storage.getItem("transactions")
        const arr: any[] = safeJsonParse(raw, [])
        const updated = [
      ...(reconTxn ? [reconTxn] : []),
          ...arr,
        ]
        storage.setItem("transactions", JSON.stringify(updated))
        setTransactions(updated as any)
        try { window.dispatchEvent(new Event("transactions:changed")) } catch {}
      } catch {}
    }
    setReconcileOpen(false)
    setDesiredBalance("")
  }

  return (
    <>
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-1 sm:px-4 py-1 sm:py-4">
          <div className="flex items-center justify-between gap-1 overflow-hidden">
            <div className="flex items-center space-x-2 sm:space-x-8 min-w-0 flex-shrink">
              <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                <Wallet className="h-5 w-5 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                <h1 className="text-sm sm:text-2xl font-bold text-foreground truncate">FinansPanel</h1>
              </div>

              <nav className="hidden md:flex items-center space-x-6">
                {navItems.map(item => (
                  <Button
                    key={item.href}
                    variant="ghost"
                    onClick={() => router.push(item.href)}
                    className={
                      pathname === item.href
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  >
                    <item.icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-1 sm:gap-4 flex-shrink-0 overflow-hidden">
              <div className="hidden sm:flex items-center space-x-2 px-2 py-2 bg-primary/10 rounded-lg border border-primary/20">
                <Wallet className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold text-foreground">
                  Bakiye: {totalBalance.toLocaleString("tr-TR", { style: "currency", currency: "TRY" })}
                </span>
                <Popover open={reconcileOpen} onOpenChange={setReconcileOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-6 sm:h-7 px-1 sm:px-2 text-[10px] sm:text-xs ml-1 sm:ml-2">Eşitle</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 space-y-3">
                    <div className="space-y-2">
                      <Label>Cebimdeki Gerçek Para (₺)</Label>
                      <Input value={desiredBalance} onChange={(e) => setDesiredBalance(e.target.value)} inputMode="decimal" type="text" />
                      <p className="text-[11px] text-muted-foreground">Bu dönem bakiyesini bu tutara ayarlar; fark kadar Gelir/Gider (Eşitleme) ekler.</p>
                      <Button size="sm" variant="secondary" onClick={handleReconcile}>Eldeki Paraya Eşitle</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              {/* Mobile balance display */}
              <div className="sm:hidden flex items-center">
                <Popover open={reconcileOpen} onOpenChange={setReconcileOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline" className="h-6 px-1 text-[9px] bg-primary/10 border-primary/20">
                      <Wallet className="h-2.5 w-2.5 mr-0.5 text-primary" />
                      {totalBalance.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}₺
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 space-y-3">
                    <div className="space-y-2">
                      <Label>Cebimdeki Gerçek Para (₺)</Label>
                      <Input value={desiredBalance} onChange={(e) => setDesiredBalance(e.target.value)} inputMode="decimal" type="text" />
                      <p className="text-[11px] text-muted-foreground">Bu dönem bakiyesini bu tutara ayarlar; fark kadar Gelir/Gider (Eşitleme) ekler.</p>
                      <Button size="sm" variant="secondary" onClick={handleReconcile}>Eldeki Paraya Eşitle</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setNotesOpen(true)} 
                className="h-6 w-6 sm:h-10 sm:w-10 flex-shrink-0" 
                title="Notlar"
                data-mobile-button="true"
              >
                <FileText className="h-3 w-3 sm:h-5 sm:w-5" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={openGlobalCalendar} 
                className="h-6 w-6 sm:h-10 sm:w-10 flex-shrink-0" 
                title="Takvim"
                data-mobile-button="true"
              >
                <Calendar className="h-3 w-3 sm:h-5 sm:w-5" />
              </Button>
              
              <div className="flex-shrink-0" data-mobile-button="true">
                <NotificationCenter />
              </div>
              <div className="flex-shrink-0" data-mobile-button="true">
                <SettingsDialog />
              </div>
              {currentUser ? (
                <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0" data-mobile-button="true">
                  <Avatar className="h-6 w-6 sm:h-10 sm:w-10 border-2 border-primary/20">
                    <AvatarImage src={currentUser.photoURL || "/placeholder-user.png"} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-3 w-3 sm:h-5 sm:w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleLogout} 
                    title="Çıkış Yap" 
                    className="h-6 w-6 sm:h-10 sm:w-10"
                    data-mobile-button="true"
                  >
                    <LogOut className="h-3 w-3 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => router.push('/login')} 
                  size="sm" 
                  className="text-xs px-2 py-1 h-6"
                  data-mobile-button="true"
                >
                  Giriş Yap
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
  <NotesFloat open={notesOpen} onClose={() => setNotesOpen(false)} />
      <NotificationsFloat open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </>
  )
}
