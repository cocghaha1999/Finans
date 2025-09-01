"use client"

import { useEffect, useMemo, useState } from "react"
import { Wallet } from "lucide-react"
import { auth } from "@/lib/firebase"
import { isFirestoreReady, listTransactions, watchTransactions } from "@/lib/db"
import { formatTRY } from "@/lib/utils"

type Txn = { id: string; type: "gelir" | "gider"; amount: number; date: string }

export function BalanceChip() {
  const [transactions, setTransactions] = useState<Txn[]>([])

  useEffect(() => {
    let unsub: undefined | null | (() => void)
    const u = auth?.currentUser
    if (u?.uid && isFirestoreReady()) {
      unsub = watchTransactions(u.uid, (list: any[]) => setTransactions(list as Txn[])) as unknown as (() => void) | null | undefined
      listTransactions(u.uid).then((list: any[]) => setTransactions(list as Txn[])).catch(() => {})
    } else {
      try {
        const raw = localStorage.getItem("transactions")
        setTransactions(raw ? JSON.parse(raw) : [])
      } catch { setTransactions([]) }
    }
    return () => { if (typeof unsub === "function") unsub() }
  }, [])

  const total = useMemo(() => transactions.reduce((s, t) => (t.type === "gelir" ? s + t.amount : s - t.amount), 0), [transactions])

  return (
    <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
      <Wallet className="h-4 w-4 text-primary" />
      <span className="text-sm font-semibold text-foreground">Toplam Bakiye: {formatTRY(total)}</span>
    </div>
  )
}
