"use client"

import { usePathname } from "next/navigation"
import { PropsWithChildren } from "react"

export default function ClientHeaderGate({ children }: PropsWithChildren) {
  const pathname = usePathname()
  if (pathname?.startsWith("/login")) return null
  return <>{children}</>
}
