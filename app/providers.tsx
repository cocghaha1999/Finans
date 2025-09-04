"use client"

import { ReactNode } from "react"
import { CalendarProvider } from "@/hooks/use-calendar-simple"
import { AuthProvider } from "@/components/auth-guard"
import { ThemeProvider } from "@/components/theme-provider"

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <CalendarProvider>
          {children}
        </CalendarProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
