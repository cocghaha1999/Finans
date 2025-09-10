export type Notification = {
  id: string
  message: string
  type: "payment" | "reminder" | "alert" | "info"
  read: boolean
  timestamp: number // Unix timestamp (ms)
  link?: string // e.g., /cards/some-card-id
}

export type Note = {
  id: string
  title: string
  contentHtml: string
  updatedAt: string // ISO date string for local, Firestore serverTimestamp stored separately
  tags?: string[]
}

export type Subscription = {
  id: string
  name: string
  price: number
  nextBillingDate: string // ISO date string
  cancellationReminderDate?: string | null // ISO or null to clear
  cardId?: string | null // linked card for this subscription (optional)
  category?: string | null // subscription category (entertainment, music, etc.)
  updatedAt: string
}

export type BankCard = {
  id: string
  bankName: string
  bankLogo?: string | null
  nickname?: string | null // Kart takma adı
  cardNumber?: string | null
  cardHolderName?: string | null
  expiryDate?: string | null // MM/YY or YYYY-MM
  cardType?: string | null // e.g., "Kredi Kartı"
  cardNetwork?: "visa" | "mastercard" | null
  creditLimit?: number | null
  currentDebt?: number | null
  statementDate?: string | null // display string or day-of-month
  paymentDueDate?: string | null // display string or day-of-month
  minimumPayment?: number | null
  status?: "active" | "inactive" | null
  cardColor?: string | null // tailwind class
  updatedAt: string
  // Taksit planları (istemci ve backend tarafından ilerletilir)
  installmentPlans?: InstallmentPlan[] | null
}

// Per-card entry (harcama/ödeme)
export type CardEntry = {
  id: string
  cardId: string
  type: "harcama"
  amount: number
  description?: string
  category?: string
  date: string // ISO YYYY-MM-DD
  createdAt?: string
  // Taksit kaydı eşlemesi için opsiyonel plan id
  planId?: string
}

export type InstallmentPlan = {
  id: string
  description: string
  total: number
  monthlyAmount: number
  remaining: number
  posted: number
  nextDate?: string | null // ISO YYYY-MM-DD veya null (tamamlandı)
  startDate: string // satın alma tarihi (ISO YYYY-MM-DD)
}

export type Payment = {
  id: string
  name: string
  amount: number
  status: "paid" | "pending"
  description?: string
  updatedAt: any // For Firestore serverTimestamp
  paidAt?: string // YYYY-MM-DD paid date (client-written)
  dueDate?: string // YYYY-MM-DD due date for UI compatibility

  // Type discriminator
  paymentType: "fixed" | "custom"

  // For fixed payments
  category?: string // 'kira', 'internet', etc.
  paymentDay?: number // Day of the month

  // For custom payments
  date?: string // YYYY-MM-DD
  isRecurring?: boolean
}

// Finance transaction (gelir/gider)
export type Transaction = {
  id: string
  type: "gelir" | "gider"
  amount: number
  description: string
  category: string
  date: string // YYYY-MM-DD
  // Oluşturulma zamanı; Firestore Timestamp veya number(ms) ya da ISO string olabilir
  createdAt?: any
}

// Monthly recurring income plan
export type RecurringIncome = {
  id: string
  description: string
  amount: number
  category: string
  nextDate: string // YYYY-MM-DD when next income should be posted
  active?: boolean
  updatedAt: any
}

export type UserSettings = {
  currency: string
  locale: string
  notifications: boolean
  expenseAlertThreshold?: number
  expenseAlertRealertOnThresholdChange?: boolean
  expenseAlertTriggerOnEqual?: boolean
  monthResetDay?: number
  calendarFixedPastMonths?: number
  calendarFixedFutureMonths?: number
  calendarIncludeCards?: boolean
  // Yeni ayarlar
  autoSaveEnabled?: boolean
  soundEnabled?: boolean
  compactView?: boolean
  showWelcomeTips?: boolean
  defaultTransactionType?: "gelir" | "gider"
  quickAmounts?: number[]
  dateFormat?: "dd/mm/yyyy" | "mm/dd/yyyy" | "yyyy-mm-dd"
  enableKeyboardShortcuts?: boolean
  showBalance?: boolean
  currencySymbol?: string
  decimalPlaces?: number
  enableBackup?: boolean
  backupFrequency?: "daily" | "weekly" | "monthly"
}
