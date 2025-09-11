"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { X, Download, Smartphone } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export function PWAInstallBanner() {
  const [isVisible, setIsVisible] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
      
      // Always show banner when prompt is available
      setIsVisible(true)
    }

    const handleAppInstalled = () => {
      setIsVisible(false)
      toast({
        title: "Uygulama Yüklendi!",
        description: "CostikFinans artık ana ekranınızda. Uygulamayı açın!",
      })
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return
    }

    // Show banner for iOS devices (manual install)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIOS && !localStorage.getItem('pwa-banner-dismissed-ios')) {
      setTimeout(() => setIsVisible(true), 2000) // Delay for iOS
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return

    try {
      const result = await installPrompt.prompt()
      
      if (result.outcome === 'accepted') {
        toast({
          title: "Başarılı!",
          description: "CostikFinans ana ekranınıza eklendi!",
        })
      }
      
      setInstallPrompt(null)
      setIsVisible(false)
    } catch (error) {
      console.error('PWA install error:', error)
      toast({
        title: "Kurulum Hatası",
        description: "Bir hata oluştu. Lütfen tekrar deneyin.",
        variant: "destructive"
      })
    }
  }

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem('pwa-banner-dismissed', 'true')
  }

  if (!isVisible || !installPrompt) return null

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
            <img src="/logo.svg" alt="CostikFinans" className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-blue-900 text-sm">
              Uygulamayı İndir
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              CostikFinans'ı ana ekranınıza ekleyin ve daha hızlı erişin!
            </p>
            
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                onClick={handleInstall}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 h-7"
              >
                <Download className="h-3 w-3 mr-1" />
                Ekle
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 h-7"
              >
                Kapat
              </Button>
            </div>
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="p-1 h-6 w-6 text-blue-400 hover:text-blue-600 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  )
}
