'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Wifi, WifiOff, Database, Trash2, RefreshCw, X } from 'lucide-react'

export default function OfflineDebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [hasBeenShown, setHasBeenShown] = useState(false)
  const [lastOnlineStatus, setLastOnlineStatus] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnlineChange = () => {
      const currentStatus = navigator.onLine
      setIsOnline(currentStatus)
      
      // Durum değiştiğinde ve daha önce gösterilmemişse panel'i göster
      if (currentStatus !== lastOnlineStatus) {
        const shown = localStorage.getItem('offline-panel-shown')
        if (!shown) {
          setIsVisible(true)
          setHasBeenShown(true)
        }
        setLastOnlineStatus(currentStatus)
      }
    }

    window.addEventListener('online', handleOnlineChange)
    window.addEventListener('offline', handleOnlineChange)

    // İlk yüklemede kontrol et
    const shown = localStorage.getItem('offline-panel-shown')
    if (!shown) {
      setIsVisible(true)
      setHasBeenShown(true)
    }

    return () => {
      window.removeEventListener('online', handleOnlineChange)
      window.removeEventListener('offline', handleOnlineChange)
    }
  }, [lastOnlineStatus])

  const hidePanel = () => {
    setIsVisible(false)
    localStorage.setItem('offline-panel-shown', 'true')
  }
  
  const toggleOffline = () => {
    // Bu sadece simülasyon için - gerçek çevrimdışı durumu tarayıcı ayarlarından yapılmalı
    if (isOnline) {
      console.warn('Çevrimdışı modu test etmek için tarayıcınızın Network sekmesinden "Offline" modunu açın')
    }
  }

  const clearAllOfflineData = () => {
    localStorage.removeItem('costik-transactions')
    localStorage.removeItem('costik-payments')
    localStorage.removeItem('costik-cards')
    localStorage.removeItem('costik-card-entries')
    console.log('Tüm çevrimdışı veriler temizlendi')
    window.location.reload()
  }

  const getOfflineDataSize = () => {
    const transactions = localStorage.getItem('costik-transactions')
    const payments = localStorage.getItem('costik-payments')
    const cards = localStorage.getItem('costik-cards')
    const entries = localStorage.getItem('costik-card-entries')
    
    let totalSize = 0
    if (transactions) totalSize += JSON.stringify(transactions).length
    if (payments) totalSize += JSON.stringify(payments).length
    if (cards) totalSize += JSON.stringify(cards).length
    if (entries) totalSize += JSON.stringify(entries).length
    
    return Math.round(totalSize / 1024) // KB cinsinden
  }

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-20 left-4 z-40 bg-white/90 backdrop-blur"
      >
        <Database className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <>
      {/* Debug Panel */}
      {isVisible && (
        <Card className="fixed bottom-4 left-4 z-50 w-80 bg-white/95 backdrop-blur shadow-xl border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Çevrimdışı Debug Panel</span>
              <Button
                onClick={hidePanel}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Bağlantı Durumu:</span>
              <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center gap-1">
                {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isOnline ? "Çevrimiçi" : "Çevrimdışı"}
              </Badge>
            </div>

            {/* Offline Data Size */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Çevrimdışı Veri:</span>
              <Badge variant="secondary">
                {getOfflineDataSize()} KB
              </Badge>
            </div>

            {/* Controls */}
            <div className="space-y-2">
              <Button
                onClick={toggleOffline}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Çevrimdışı Modu Test Et
              </Button>
              
              <Button
                onClick={clearAllOfflineData}
                variant="destructive"
                size="sm"
                className="w-full justify-start"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Çevrimdışı Verileri Temizle
              </Button>
              
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="w-full justify-start"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Sayfayı Yenile
              </Button>
            </div>

            {/* Instructions */}
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p className="mb-1"><strong>Test Etme:</strong></p>
              <p>1. Chrome DevTools açın (F12)</p>
              <p>2. Network sekmesine gidin</p>
              <p>3. "Offline" kutusunu işaretleyin</p>
              <p>4. Sayfayı yenileyin ve test edin</p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
