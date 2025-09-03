import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

type SettingsLike = { locale?: string; currency?: string }

const DEFAULT_LOCALE = "tr-TR"
const DEFAULT_CURRENCY = "TRY"

function readSettings(): SettingsLike {
  if (typeof window === "undefined") return { locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY }
  try {
    const raw = window.localStorage.getItem("settings")
    if (!raw) return { locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY }
    const s = JSON.parse(raw)
    return {
      locale: s?.locale || DEFAULT_LOCALE,
      currency: s?.currency || DEFAULT_CURRENCY,
    }
  } catch {
    return { locale: DEFAULT_LOCALE, currency: DEFAULT_CURRENCY }
  }
}

const fmtCache = new Map<string, Intl.NumberFormat>()
function getCurrencyFormatter(opts: { compact?: boolean } = {}) {
  const s = readSettings()
  const key = `${s.locale}|${s.currency}|${opts.compact ? "1" : "0"}`
  let fmt = fmtCache.get(key)
  if (!fmt) {
    try {
      fmt = new Intl.NumberFormat(s.locale || DEFAULT_LOCALE, {
        style: "currency",
        currency: s.currency || DEFAULT_CURRENCY,
        maximumFractionDigits: opts.compact ? 1 : 2,
        ...(opts.compact ? { notation: "compact" as const } : {}),
      })
      fmtCache.set(key, fmt)
    } catch {
      // Fall back to defaults
      fmt = new Intl.NumberFormat(DEFAULT_LOCALE, {
        style: "currency",
        currency: DEFAULT_CURRENCY,
        maximumFractionDigits: opts.compact ? 1 : 2,
        ...(opts.compact ? { notation: "compact" as const } : {}),
      })
      fmtCache.set(key, fmt)
    }
  }
  return fmt
}

export function formatTRY(value: number) {
  try {
  return getCurrencyFormatter().format(value)
  } catch {
    return `₺${value.toLocaleString("tr-TR")}`
  }
}

export function formatTRYCompact(value: number) {
  try {
  return getCurrencyFormatter({ compact: true }).format(value)
  } catch {
    return `₺${Math.round(value / 1000)}k`
  }
}

export function formatDateTR(iso: string) {
  try {
    const d = new Date(iso)
  const s = readSettings()
  const locale = s.locale || DEFAULT_LOCALE
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(d)
  } catch {
    return iso
  }
}
