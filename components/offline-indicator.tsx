'use client'

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useInstallPrompt } from '@/hooks/use-offline'

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true)
  const { isInstallable, installApp } = useInstallPrompt()

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

  const handleInstall = async () => {
    const success = await installApp()
    if (success) {
      console.log('Uygulama başarıyla yüklendi!')
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {/* Çevrimdışı durumu */}
      {!isOnline && (
        <Alert className="w-80 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800">
          <WifiOff className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Çevrimdışı mod - Navigation çalışıyor</span>
            <WifiOff className="h-4 w-4 text-orange-600" />
          </AlertDescription>
        </Alert>
      )}

      {/* Çevrimiçi durumu (kısa süre göster) */}
      {isOnline && (
        <Alert className="w-80 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <Wifi className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Çevrimiçi - Veriler senkronize ediliyor</span>
            <Wifi className="h-4 w-4 text-green-600" />
          </AlertDescription>
        </Alert>
      )}

      {/* PWA yükleme butonu */}
      {isInstallable && (
        <div className="flex justify-end">
          <Button 
            onClick={handleInstall}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
          >
            <Download className="h-4 w-4 mr-2" />
            Uygulamayı Yükle
          </Button>
        </div>
      )}
    </div>
  )
}
