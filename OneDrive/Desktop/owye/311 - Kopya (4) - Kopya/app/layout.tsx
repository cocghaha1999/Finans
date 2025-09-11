import type { Viewport } from 'next'

export const metadata = {
  title: 'CostikFinans - Kişisel Finans Yöneticisi',
  description: 'Gelir, gider ve finansal işlemlerinizi kolayca takip edin. Çevrimdışı erişim desteği ile her zaman yanınızda.',
  manifest: '/manifest.json',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'apple-mobile-web-app-title': 'CostikFinans',
    'application-name': 'CostikFinans',
    'msapplication-TileColor': '#3b82f6',
    'msapplication-config': '/browserconfig.xml',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#3b82f6',
}

import "./globals.css"
import "@/styles/enhancements.css"
import Providers from "./providers"
import AppHeader from "@/components/header"
import ClientHeaderGate from "@/app/route-header-gate"
import { CalendarFloat } from "@/components/calendar-float"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="bg-background">
        {/* App Providers (Auth, Calendar, etc.) */}
        <Providers>
          <ClientHeaderGate>
            <AppHeader />
          </ClientHeaderGate>
          
          {/* Main content with mobile-aware padding */}
          <main className="min-h-screen pb-20 md:pb-0">
            {children}
          </main>
          
          {/* Mobile bottom navigation */}
          <MobileBottomNav />
          
          <CalendarFloat />
        </Providers>
      </body>
    </html>
  )
}
