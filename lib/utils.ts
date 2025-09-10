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

// Safe JSON parsing utility
export function safeJsonParse<T>(json: string | null, fallback: T): T {
  if (!json) return fallback
  try {
    return JSON.parse(json) ?? fallback
  } catch (error) {
    console.warn('Failed to parse JSON:', error, 'Input:', json?.substring(0, 100) + (json && json.length > 100 ? '...' : ''))
    return fallback
  }
}

// Safe localStorage operations
export function safeLocalStorage() {
  return {
    getItem: (key: string): string | null => {
      try {
        return localStorage.getItem(key)
      } catch (error) {
        console.warn(`Failed to get localStorage item '${key}':`, error)
        return null
      }
    },
    setItem: (key: string, value: string): boolean => {
      try {
        localStorage.setItem(key, value)
        return true
      } catch (error) {
        console.warn(`Failed to set localStorage item '${key}':`, error)
        return false
      }
    },
    removeItem: (key: string): boolean => {
      try {
        localStorage.removeItem(key)
        return true
      } catch (error) {
        console.warn(`Failed to remove localStorage item '${key}':`, error)
        return false
      }
    }
  }
}
