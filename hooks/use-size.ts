"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"

type Size = { width: number; height: number }

/**
 * Observe and report the clientWidth/clientHeight of an element.
 * Returns a ref to attach and the current size. Client-only.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })

  // Prefer layout effect on client to avoid flicker; fall back to effect in non-DOM
  const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const setFromRect = (rect: DOMRectReadOnly | DOMRect) => {
      let w = Math.round(rect.width)
      let h = Math.round(rect.height)
      // Eğer kendi genişliği 0 ise ebeveynin genişliğini dene
      if (w === 0 && el.parentElement) {
        const parentRect = el.parentElement.getBoundingClientRect()
        if (parentRect.width > 0) w = Math.round(parentRect.width)
      }
      setSize((prev) => (prev.width !== w || prev.height !== h ? { width: w, height: h } : prev))
    }

    const update = () => setFromRect(el.getBoundingClientRect())
    update()

    let ro: ResizeObserver | null = null
    const supportsRO = typeof ResizeObserver !== "undefined"
    if (supportsRO) {
      // Her bildirimde doğrudan hedef elemandan ölçüm al, entries[0] yerine
      // Bu, ebeveyn/çocuk birlikte gözlemlendiğinde yanlış contentRect alınmasını engeller
      ro = new ResizeObserver(() => {
        update()
      })
      ro.observe(el)
      if (el.parentElement) ro.observe(el.parentElement)
    } else {
      window.addEventListener("resize", update)
    }
    const onLoad = () => update()
    window.addEventListener("load", onLoad)

    return () => {
      if (ro) ro.disconnect()
      else window.removeEventListener("resize", update)
      window.removeEventListener("load", onLoad)
    }
  }, [])

  return [ref, size] as const
}
