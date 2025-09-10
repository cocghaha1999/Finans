'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { WifiOff, Wifi, RefreshCw, Home, Database, Clock, Smartphone } from "lucide-react"
import Link from "next/link"

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setLastSyncTime(new Date().toLocaleString('tr-TR'))
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOnline(navigator.onLine)

    // Get last sync time from localStorage
    const lastSync = localStorage.getItem('lastSyncTime')
    if (lastSync) {
      setLastSyncTime(new Date(lastSync).toLocaleString('tr-TR'))
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRefresh = () => {
    window.location.reload()
  }

  const handleRetry = () => {
    if (isOnline) {
      window.location.href = '/'
    } else {
      handleRefresh()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Main Status Card */}
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 flex items-center justify-center">
              {isOnline ? (
                <Wifi className="h-10 w-10 text-green-600" />
              ) : (
                <WifiOff className="h-10 w-10 text-orange-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isOnline ? '🎉 Bağlantı Geri Geldi!' : '📴 Çevrimdışı Mod'}
            </CardTitle>
            <CardDescription className="text-base">
              {isOnline 
                ? 'Artık tüm özellikleri kullanabilirsiniz. Verileriniz senkronize ediliyor...' 
                : 'İnternet bağlantınız kesildi ancak uygulamayı kullanmaya devam edebilirsiniz.'
              }
            </CardDescription>
            
            {lastSyncTime && (
              <div className="mt-3">
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Son senkronizasyon: {lastSyncTime}
                </Badge>
              </div>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button 
                onClick={handleRetry} 
                className="flex-1"
                variant={isOnline ? "default" : "outline"}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {isOnline ? 'Ana Sayfaya Dön' : 'Yeniden Dene'}
              </Button>
              
              <Link href="/" className="flex-1">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Ana Sayfa
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Offline Features Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Çevrimdışı Özellikler
            </CardTitle>
            <CardDescription>
              İnternet olmadan kullanabileceğiniz özellikler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Mevcut işlemleri görüntüleme</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Yeni işlem ekleme</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm">Bakiye hesaplama</span>
              </div>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">Veriler otomatik senkronize edilecek</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PWA Info Card */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              Mobil Uygulama Deneyimi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              CostikFinans'ı mobil uygulama olarak yükleyerek daha iyi bir deneyim yaşayın:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Çevrimdışı çalışma garantisi
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Push bildirimleri
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Ana ekran kısayolu
              </li>
            </ul>
            
            <Link href="/features" className="block mt-4">
              <Button variant="outline" size="sm" className="w-full">
                <Smartphone className="h-4 w-4 mr-2" />
                Mobil Uygulama Bilgileri
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
