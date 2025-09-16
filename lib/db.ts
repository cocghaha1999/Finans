"use client"

import { db, auth } from "@/lib/firebase"
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore"
import type { Transaction } from "@/lib/types"
import type { Notification, Note, Subscription, BankCard, CardEntry, Payment, RecurringIncome } from "@/lib/types"
import { calculateMinimumPaymentByBank } from './banks'

// Helper function to check if user is authenticated
function isUserAuthenticated(): boolean {
  return auth?.currentUser != null
}

// Helper function to handle Firestore errors gracefully
function handleFirestoreError(error: any, operation: string): void {
  if (error?.code === 'permission-denied') {
    console.warn(`Firebase permission denied for ${operation}. User may not be authenticated.`)
  } else {
    console.error(`Firebase error in ${operation}:`, error)
  }
}

// Transactions (users/{uid}/transactions)
const TXN_SUB = "transactions"

export function isFirestoreReady() {
  return !!db && isUserAuthenticated()
}

export async function listTransactions(userId: string): Promise<Transaction[]> {
  if (!db || !isUserAuthenticated()) return []
  if (!userId) {
    console.warn("listTransactions: userId is empty")
    return []
  }
  try {
    // Use per-user subcollection to avoid composite index requirements
    const q = query(collection(db, "users", userId, TXN_SUB), orderBy("date", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Transaction[]
  } catch (error) {
    handleFirestoreError(error, 'listTransactions')
    return []
  }
}

export function watchTransactions(
  userId: string,
  cb: (txns: Transaction[]) => void
): Unsubscribe | null {
  if (!db || !isUserAuthenticated()) return null
  if (!userId) return null
  const q = query(collection(db, "users", userId, TXN_SUB), orderBy("date", "desc"))
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Transaction[]
      cb(list)
    },
    (err) => {
      // Swallow permission errors to prevent uncaught exceptions in snapshot listener
      // UI should already handle guest mode/local storage fallbacks.
      handleFirestoreError(err, 'watchTransactions')
    }
  )
}

export async function addTransaction(userId: string, t: Transaction) {
  if (!db || !isUserAuthenticated()) return null
  if (!userId) return null
  try {
    // Do not persist client-side id field; Firestore will assign document id
    const { id: _omitId, ...rest } = t as any
    const payload = { ...rest, createdAt: (rest as any).createdAt ?? serverTimestamp(), updatedAt: serverTimestamp() }
    const col = collection(db, "users", userId, TXN_SUB)
    const ref = await addDoc(col, payload as any)
    return ref.id
  } catch (error) {
    handleFirestoreError(error, 'addTransaction')
    return null
  }
}

export async function upsertTransaction(userId: string, t: Transaction) {
  if (!db || !t.id || !userId) return null
  const ref = doc(db, "users", userId, TXN_SUB, t.id)
  await setDoc(ref, { ...t, updatedAt: serverTimestamp() } as any, { merge: true })
  return t.id
}

export async function removeTransaction(userId: string, id: string) {
  if (!db || !userId) return
  await deleteDoc(doc(db, "users", userId, TXN_SUB, id))
}

// User Settings (users/{uid}/settings)
export type UserSettings = {
  currency: string
  locale: string
  notifications: boolean
  expenseAlertThreshold?: number
  expenseAlertRealertOnThresholdChange?: boolean // when threshold value changes, allow alert again the same day
  expenseAlertTriggerOnEqual?: boolean // trigger when monthlyExpenses === threshold
  monthResetDay?: number // 1-31; default 1
  carryover?: boolean // include previous period leftovers into current period budget
  currentPeriodRealBalance?: number // user-stated real balance for current period
  allTimeRealBalance?: number // user-stated real balance for all time
  // Calendar preferences
  calendarFixedPastMonths?: number
  calendarFixedFutureMonths?: number
  calendarIncludeCards?: boolean
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  if (!db) return null
  const ref = doc(db, "users", userId, "meta", "settings")
  const snap = await getDoc(ref)
  return (snap.exists() ? (snap.data() as any) : null) as UserSettings | null
}

export async function setUserSettings(userId: string, settings: Partial<UserSettings>) {
  if (!db) return
  const ref = doc(db, "users", userId, "meta", "settings")
  // Remove undefined fields (Firestore rejects undefined)
  const payload: Record<string, any> = {}
  Object.entries(settings || {}).forEach(([k, v]) => {
    if (v !== undefined) payload[k] = v
  })
  payload.updatedAt = serverTimestamp()
  await setDoc(ref, payload as any, { merge: true })
}

export function watchUserSettings(userId: string, cb: (s: UserSettings | null) => void): Unsubscribe | null {
  if (!db) return null
  const ref = doc(db, "users", userId, "meta", "settings")
  return onSnapshot(
    ref,
    (snap) => {
      cb(snap.exists() ? ((snap.data() as any) as UserSettings) : null)
    },
    (err) => console.warn("watchUserSettings error:", err?.message || err)
  )
}

// Notifications (users/{uid}/notifications)
export async function listNotifications(userId: string): Promise<Notification[]> {
  if (!db) return []
  if (!userId) return []
  if (!isUserAuthenticated()) {
    console.warn("listNotifications: User not authenticated")
    return []
  }
  
  try {
    const q = query(collection(db, "users", userId, "notifications"), orderBy("timestamp", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Notification[]
  } catch (error) {
    console.error("listNotifications error:", error)
    handleFirestoreError(error, "listNotifications")
    return []
  }
}

export function watchNotifications(userId: string, cb: (list: Notification[]) => void): Unsubscribe | null {
  if (!db) return null
  if (!userId) return null
  if (!isUserAuthenticated()) {
    console.warn("watchNotifications: User not authenticated")
    return null
  }
  
  try {
    const q = query(collection(db, "users", userId, "notifications"), orderBy("timestamp", "desc"))
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Notification[])
      },
      (err) => {
        console.warn("watchNotifications error:", err?.message || err)
        handleFirestoreError(err, "watchNotifications")
      }
    )
  } catch (error) {
    console.error("watchNotifications error:", error)
    handleFirestoreError(error, "watchNotifications")
    return null
  }
}

export async function addNotification(userId: string, n: Omit<Notification, "id">) {
  if (!db) return null
  if (!userId) return null
  if (!isUserAuthenticated()) {
    console.warn("addNotification: User not authenticated")
    return null
  }
  
  try {
    const col = collection(db, "users", userId, "notifications")
    const ref = await addDoc(col, n as any)
    return ref.id
  } catch (error) {
    console.error("addNotification error:", error)
    handleFirestoreError(error, "addNotification")
    return null
  }
}

export async function markNotificationAsRead(userId: string, id: string, read = true) {
  if (!db || !userId) return
  if (!isUserAuthenticated()) {
    console.warn("markNotificationAsRead: User not authenticated")
    return
  }
  
  try {
    const ref = doc(db, "users", userId, "notifications", id)
    await updateDoc(ref, { read })
  } catch (error) {
    console.error("markNotificationAsRead error:", error)
    handleFirestoreError(error, "markNotificationAsRead")
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  if (!db || !userId) return;
  if (!isUserAuthenticated()) {
    console.warn("markAllNotificationsAsRead: User not authenticated")
    return
  }
  
  try {
    const q = query(collection(db, "users", userId, "notifications"), where("read", "==", false));
    const snap = await getDocs(q);
    const promises = snap.docs.map(d => updateDoc(d.ref, { read: true }));
    await Promise.all(promises);
  } catch (error) {
    console.error("markAllNotificationsAsRead error:", error)
    handleFirestoreError(error, "markAllNotificationsAsRead")
  }
}

export async function clearNotifications(userId: string) {
  // Simple approach: fetch and delete individually
  if (!db || !userId) return
  if (!isUserAuthenticated()) {
    console.warn("clearNotifications: User not authenticated")
    return
  }
  
  try {
    const list = await listNotifications(userId)
    await Promise.all(list.map((n) => deleteDoc(doc(db!, "users", userId, "notifications", n.id))))
  } catch (error) {
    console.error("clearNotifications error:", error)
    handleFirestoreError(error, "clearNotifications")
  }
}

// Notes (users/{uid}/notes)
export async function listNotes(userId: string): Promise<Note[]> {
  if (!db || !userId) return []
  if (!isUserAuthenticated()) {
    console.warn("listNotes: User not authenticated")
    return []
  }
  
  try {
    const q = query(collection(db, "users", userId, "notes"), orderBy("updatedAt", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Note[]
  } catch (error) {
    console.error("listNotes error:", error)
    handleFirestoreError(error, "listNotes")
    return []
  }
}

export function watchNotes(userId: string, cb: (list: Note[]) => void): Unsubscribe | null {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("watchNotes: User not authenticated")
    return null
  }
  
  try {
    const q = query(collection(db, "users", userId, "notes"), orderBy("updatedAt", "desc"))
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Note[])
      },
      (err) => {
        console.warn("watchNotes error:", err?.message || err)
        handleFirestoreError(err, "watchNotes")
      }
    )
  } catch (error) {
    console.error("watchNotes error:", error)
    handleFirestoreError(error, "watchNotes")
    return null
  }
}

export async function upsertNote(userId: string, note: Note) {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("upsertNote: User not authenticated")
    return null
  }
  
  try {
    const ref = note.id
      ? doc(db, "users", userId, "notes", note.id)
      : doc(collection(db, "users", userId, "notes"))
    const payload: any = {
      title: note.title,
      contentHtml: note.contentHtml,
      tags: note.tags || [],
      updatedAt: serverTimestamp(),
    }
    await setDoc(ref, payload, { merge: true })
    return ref.id
  } catch (error) {
    console.error("upsertNote error:", error)
    handleFirestoreError(error, "upsertNote")
    return null
  }
}

export async function removeNote(userId: string, id: string) {
  if (!db || !userId) return
  if (!isUserAuthenticated()) {
    console.warn("removeNote: User not authenticated")
    return
  }
  
  try {
    await deleteDoc(doc(db, "users", userId, "notes", id))
  } catch (error) {
    console.error("removeNote error:", error)
    handleFirestoreError(error, "removeNote")
  }
}

// Subscriptions (users/{uid}/subscriptions)
const SUBS_SUB = "subscriptions"

export async function listSubscriptions(userId: string): Promise<Subscription[]> {
  if (!db || !userId) return []
  if (!isUserAuthenticated()) {
    console.warn("listSubscriptions: User not authenticated")
    return []
  }
  
  try {
    const q = query(collection(db, "users", userId, SUBS_SUB), orderBy("nextBillingDate", "asc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Subscription[]
  } catch (error) {
    console.error("listSubscriptions error:", error)
    handleFirestoreError(error, "listSubscriptions")
    return []
  }
}

export function watchSubscriptions(userId: string, cb: (list: Subscription[]) => void): Unsubscribe | null {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("watchSubscriptions: User not authenticated")
    return null
  }
  
  try {
    const q = query(collection(db, "users", userId, SUBS_SUB), orderBy("nextBillingDate", "asc"))
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Subscription[])
      },
      (err) => {
        console.warn("watchSubscriptions error:", err?.message || err)
        handleFirestoreError(err, "watchSubscriptions")
      }
    )
  } catch (error) {
    console.error("watchSubscriptions error:", error)
    handleFirestoreError(error, "watchSubscriptions")
    return null
  }
}

export async function upsertSubscription(userId: string, sub: Omit<Subscription, "id" | "updatedAt"> & { id?: string }) {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("upsertSubscription: User not authenticated")
    return null
  }
  
  try {
    const ref = sub.id
      ? doc(db, "users", userId, SUBS_SUB, sub.id)
      : doc(collection(db, "users", userId, SUBS_SUB))
    // Normalize payload to avoid undefined fields (Firestore rejects undefined)
    const payload: any = {
      name: sub.name,
      price: typeof (sub as any).price === "number" ? (sub as any).price : Number((sub as any).price) || 0,
      nextBillingDate: sub.nextBillingDate,
      cardId: (sub as any).cardId === undefined ? null : (sub as any).cardId,
      // if undefined -> store null; Firestore accepts nulls and we can clear field intentionally
      cancellationReminderDate:
        (sub as any).cancellationReminderDate === undefined
          ? null
          : (sub as any).cancellationReminderDate,
      updatedAt: serverTimestamp(),
    }
    await setDoc(ref, payload, { merge: true })
    return ref.id
  } catch (error) {
    console.error("upsertSubscription error:", error)
    handleFirestoreError(error, "upsertSubscription")
    return null
  }
}

export async function removeSubscription(userId: string, id: string) {
  if (!db || !userId) return
  if (!isUserAuthenticated()) {
    console.warn("removeSubscription: User not authenticated")
    return
  }
  
  try {
    await deleteDoc(doc(db, "users", userId, SUBS_SUB, id))
  } catch (error) {
    console.error("removeSubscription error:", error)
    handleFirestoreError(error, "removeSubscription")
  }
}

// Cards (users/{uid}/cards)
const CARDS_SUB = "cards"

export async function listCards(userId: string): Promise<BankCard[]> {
  if (!db || !userId) return []
  if (!isUserAuthenticated()) {
    console.warn("listCards: User not authenticated")
    return []
  }
  
  try {
    const q = query(collection(db, "users", userId, CARDS_SUB), orderBy("updatedAt", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as BankCard[]
  } catch (error) {
    console.error("listCards error:", error)
    handleFirestoreError(error, "listCards")
    return []
  }
}

export function watchCards(userId: string, cb: (list: BankCard[]) => void): Unsubscribe | null {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("watchCards: User not authenticated")
    return null
  }
  
  try {
    const q = query(collection(db, "users", userId, CARDS_SUB), orderBy("updatedAt", "desc"))
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as BankCard[])
      },
      (err) => {
        console.warn("watchCards error:", err?.message || err)
        handleFirestoreError(err, "watchCards")
      }
    )
  } catch (error) {
    console.error("watchCards error:", error)
    handleFirestoreError(error, "watchCards")
    return null
  }
}

export async function upsertCard(userId: string, card: Omit<BankCard, "id" | "updatedAt"> & { id?: string }) {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("upsertCard: User not authenticated")
    return null
  }
  
  try {
    const ref = card.id ? doc(db, "users", userId, CARDS_SUB, card.id) : doc(collection(db, "users", userId, CARDS_SUB))
    // Normalize undefined -> null to satisfy Firestore
    const norm = (v: any) => (v === undefined ? null : v)
    const payload: any = {
      bankName: card.bankName,
      bankLogo: norm(card.bankLogo),
      cardNumber: norm(card.cardNumber),
      cardHolderName: norm(card.cardHolderName),
      expiryDate: norm(card.expiryDate),
      cardType: norm(card.cardType),
      cardNetwork: norm(card.cardNetwork),
      creditLimit: typeof (card as any).creditLimit === "number" ? (card as any).creditLimit : Number((card as any).creditLimit) || 0,
      currentDebt: typeof (card as any).currentDebt === "number" ? (card as any).currentDebt : Number((card as any).currentDebt) || 0,
      statementDate: norm(card.statementDate),
      paymentDueDate: norm((card as any).paymentDueDate),
      // minimumPayment is recalculated below using bank-aware rules
      minimumPayment: 0,
      status: norm(card.status) ?? "active",
      cardColor: norm(card.cardColor),
      installmentPlans: Array.isArray((card as any).installmentPlans) ? (card as any).installmentPlans : norm((card as any).installmentPlans),
      updatedAt: serverTimestamp(),
    }
    // Recompute minimum payment consistently on the server-side write path
    try {
      payload.minimumPayment = computeMinimumPaymentForBank(payload.bankName, payload.creditLimit, payload.currentDebt)
    } catch (e) {
      // Fallback to a safe default if anything goes wrong
      payload.minimumPayment = Math.max(0, Math.round((payload.currentDebt || 0) * 0.2))
    }
    await setDoc(ref, payload, { merge: true })
    return ref.id
  } catch (error) {
    console.error("upsertCard error:", error)
    handleFirestoreError(error, "upsertCard")
    return null
  }
}

export async function removeCard(userId: string, id: string) {
  if (!db || !userId) return
  if (!isUserAuthenticated()) {
    console.warn("removeCard: User not authenticated")
    return
  }
  
  try {
    await deleteDoc(doc(db, "users", userId, CARDS_SUB, id))
  } catch (error) {
    console.error("removeCard error:", error)
    handleFirestoreError(error, "removeCard")
  }
}

// Card entries (users/{uid}/cards/{cardId}/entries)
export async function listCardEntries(userId: string, cardId: string): Promise<CardEntry[]> {
  if (!db || !userId || !cardId) return []
  if (!isUserAuthenticated()) {
    console.warn("listCardEntries: User not authenticated")
    return []
  }
  
  try {
    const q = query(collection(db, "users", userId, CARDS_SUB, cardId, "entries"), orderBy("date", "desc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as CardEntry[]
  } catch (error) {
    console.error("listCardEntries error:", error)
    handleFirestoreError(error, "listCardEntries")
    return []
  }
}

export async function addCardEntry(userId: string, cardId: string, e: Omit<CardEntry, "id">) {
  if (!db || !userId || !cardId) return null
  if (!isUserAuthenticated()) {
    console.warn("addCardEntry: User not authenticated")
    return null
  }
  
  try {
    const col = collection(db, "users", userId, CARDS_SUB, cardId, "entries")
    const payload: any = { ...e, createdAt: serverTimestamp() }
    const ref = await addDoc(col, payload)
    return ref.id
  } catch (error) {
    console.error("addCardEntry error:", error)
    handleFirestoreError(error, "addCardEntry")
    return null
  }
}

export async function upsertCardEntry(userId: string, cardId: string, e: CardEntry) {
  if (!db || !userId || !cardId || !e.id) return null
  if (!isUserAuthenticated()) {
    console.warn("upsertCardEntry: User not authenticated")
    return null
  }
  
  try {
    const ref = doc(db, "users", userId, CARDS_SUB, cardId, "entries", e.id)
    const payload: any = { ...e }
    delete payload.id
    payload.updatedAt = serverTimestamp()
    await setDoc(ref, payload, { merge: true })
    return e.id
  } catch (error) {
    console.error("upsertCardEntry error:", error)
    handleFirestoreError(error, "upsertCardEntry")
    return null
  }
}

export async function removeCardEntry(userId: string, cardId: string, id: string) {
  if (!db || !userId || !cardId) return
  if (!isUserAuthenticated()) {
    console.warn("removeCardEntry: User not authenticated")
    return
  }
  
  try {
    await deleteDoc(doc(db, "users", userId, CARDS_SUB, cardId, "entries", id))
  } catch (error) {
    console.error("removeCardEntry error:", error)
    handleFirestoreError(error, "removeCardEntry")
  }
}

// Payments (users/{uid}/payments)
const PAYMENTS_SUB = "payments"

export function watchPayments(userId: string, cb: (payments: Payment[]) => void): Unsubscribe | null {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("watchPayments: User not authenticated")
    return null
  }
  
  try {
    const q = query(collection(db, "users", userId, PAYMENTS_SUB), orderBy("updatedAt", "desc"))
    return onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as Payment[]
        cb(list)
      },
      (err) => {
        console.warn("watchPayments error:", err?.message || err)
        handleFirestoreError(err, "watchPayments")
      }
    )
  } catch (error) {
    console.error("watchPayments error:", error)
    handleFirestoreError(error, "watchPayments")
    return null
  }
}

export async function upsertPayment(userId: string, payment: Partial<Payment>) {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("upsertPayment: User not authenticated")
    return null
  }
  
  try {
    const ref = payment.id
      ? doc(db, "users", userId, PAYMENTS_SUB, payment.id)
      : doc(collection(db, "users", userId, PAYMENTS_SUB))

    // Firestore kabul etmiyor: undefined alanlar. Bunları sil.
    const payload: Record<string, any> = {}
    Object.entries(payment || {}).forEach(([k, v]) => {
      if (v !== undefined) payload[k] = v
    })
    payload.updatedAt = serverTimestamp()
    await setDoc(ref, payload as any, { merge: true })
    return ref.id
  } catch (error) {
    console.error("upsertPayment error:", error)
    handleFirestoreError(error, "upsertPayment")
    return null
  }
}

export async function removePayment(userId: string, id: string) {
  if (!db || !userId) return
  if (!isUserAuthenticated()) {
    console.warn("removePayment: User not authenticated")
    return
  }
  
  try {
    await deleteDoc(doc(db, "users", userId, PAYMENTS_SUB, id))
  } catch (error) {
    console.error("removePayment error:", error)
    handleFirestoreError(error, "removePayment")
  }
}

// Recurring incomes (users/{uid}/recurringIncomes)
const RIN_SUB = "recurringIncomes"

export async function listRecurringIncomes(userId: string): Promise<RecurringIncome[]> {
  if (!db || !userId) return []
  if (!isUserAuthenticated()) {
    console.warn("listRecurringIncomes: User not authenticated")
    return []
  }
  
  try {
    const q = query(collection(db, "users", userId, RIN_SUB), orderBy("nextDate", "asc"))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as RecurringIncome[]
  } catch (error) {
    console.error("listRecurringIncomes error:", error)
    handleFirestoreError(error, "listRecurringIncomes")
    return []
  }
}

export function watchRecurringIncomes(userId: string, cb: (list: RecurringIncome[]) => void): Unsubscribe | null {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("watchRecurringIncomes: User not authenticated")
    return null
  }
  
  try {
    const q = query(collection(db, "users", userId, RIN_SUB), orderBy("nextDate", "asc"))
    return onSnapshot(
      q,
      (snap) => {
        cb(snap.docs.map((d) => ({ ...(d.data() as any), id: d.id })) as RecurringIncome[])
      },
      (err) => {
        console.warn("watchRecurringIncomes error:", err?.message || err)
        handleFirestoreError(err, "watchRecurringIncomes")
      }
    )
  } catch (error) {
    console.error("watchRecurringIncomes error:", error)
    handleFirestoreError(error, "watchRecurringIncomes")
    return null
  }
}

export async function upsertRecurringIncome(userId: string, rin: Partial<RecurringIncome>) {
  if (!db || !userId) return null
  if (!isUserAuthenticated()) {
    console.warn("upsertRecurringIncome: User not authenticated")
    return null
  }
  
  try {
    const ref = rin.id
      ? doc(db, "users", userId, RIN_SUB, rin.id)
      : doc(collection(db, "users", userId, RIN_SUB))
    const payload: Record<string, any> = {}
    Object.entries(rin || {}).forEach(([k, v]) => { if (v !== undefined) payload[k] = v })
    payload.updatedAt = serverTimestamp()
    await setDoc(ref, payload as any, { merge: true })
    return ref.id
  } catch (error) {
    console.error("upsertRecurringIncome error:", error)
    handleFirestoreError(error, "upsertRecurringIncome")
    return null
  }
}

export async function removeRecurringIncome(userId: string, id: string) {
  if (!db || !userId) return
  if (!isUserAuthenticated()) {
    console.warn("removeRecurringIncome: User not authenticated")
    return
  }
  
  try {
    await deleteDoc(doc(db, "users", userId, RIN_SUB, id))
  } catch (error) {
    console.error("removeRecurringIncome error:", error)
    handleFirestoreError(error, "removeRecurringIncome")
  }
}


// Compute minimum payment (güncel: %40 özel banka, %30 kamu/katılım bankası, min 50-75₺)
export function computeMinimumPayment(currentDebt: number): number {
  if (!currentDebt || currentDebt <= 0) return 0
  // Use the same default tiered logic as bank-aware function for unknown bank
  return calculateMinimumPaymentByBank(undefined, undefined, currentDebt)
}

export function computeMinimumPaymentForBank(bankName: string | undefined | null, creditLimit: number | null | undefined, currentDebt: number): number {
  // Yeni banka sistemi ile hesaplama
  return calculateMinimumPaymentByBank(bankName, creditLimit, currentDebt);
}

// Notification functions
export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  if (!isUserAuthenticated()) {
    console.warn("markNotificationRead: User not authenticated")
    return
  }
  
  try {
    if (!db) throw new Error("Database not initialized")
    const notificationRef = doc(db, `users/${userId}/notifications`, notificationId)
    await updateDoc(notificationRef, {
      read: true,
      readAt: new Date()
    })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    handleFirestoreError(error, "markNotificationRead")
    throw error
  }
}
