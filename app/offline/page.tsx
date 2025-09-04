'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { WifiOff, Wifi, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
            {isOnline ? (
              <Wifi className="h-8 w-8 text-green-600" />
            ) : (
              <WifiOff className="h-8 w-8 text-orange-600" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isOnline ? 'Bağlantı Geri Geldi!' : 'İnternet Bağlantısı Yok'}
          </CardTitle>
          <CardDescription>
            {isOnline 
              ? 'Artık tüm özellikleri kullanabilirsiniz' 
              : 'Çevrimdışı modda temel özellikleri kullanabilirsiniz'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isOnline ? (
            <div className="space-y-3">
              <Button onClick={handleRefresh} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Sayfayı Yenile
              </Button>
              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Ana Sayfaya Dön
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Mevcut verilerinizi görüntüleyebilirsiniz</p>
                <p>• Yeni işlemler ekleyebilirsiniz</p>
                <p>• Veriler internet geldiğinde senkronize olur</p>
              </div>
              <Link href="/" className="block">
                <Button className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Ana Sayfaya Dön
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
