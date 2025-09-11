import type { Viewport } from 'next'

export const metadata = {
  title: 'CostikFinans - Kişisel Finans Yöneticisi | costikfinans.site',
  description: 'CostikFinans ile gelir, gider ve finansal işlemlerinizi kolayca takip edin. PWA desteği, çevrimdışı erişim ve mobil uygulama deneyimi. costikfinans.site',
  keywords: 'finans, bütçe, gelir, gider, para yönetimi, kişisel finans, CostikFinans',
  authors: [{ name: 'CostikFinans Team' }],
  creator: 'CostikFinans',
  publisher: 'CostikFinans',
  robots: 'index, follow',
  manifest: '/manifest.json',
  openGraph: {
    title: 'CostikFinans - Kişisel Finans Yöneticisi',
    description: 'Gelir, gider ve finansal işlemlerinizi kolayca takip edin',
    url: 'https://costikfinans.site',
    siteName: 'CostikFinans',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CostikFinans - Kişisel Finans Yöneticisi',
    description: 'Gelir, gider ve finansal işlemlerinizi kolayca takip edin',
  },
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
          <main className="min-h-screen pb-16 sm:pb-20 md:pb-0 px-0">
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
