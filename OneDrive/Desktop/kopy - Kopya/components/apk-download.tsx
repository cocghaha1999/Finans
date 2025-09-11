"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Download, Smartphone, CheckCircle, ExternalLink, Shield, Zap, Cloud, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"

export function ApkDownload() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [deviceInfo, setDeviceInfo] = useState<{
    isAndroid: boolean
    isIOS: boolean
    isMobile: boolean
    browserName: string
  }>({
    isAndroid: false,
    isIOS: false,
    isMobile: false,
    browserName: 'Unknown'
  })
  const { toast } = useToast()

  useEffect(() => {
    // Device detection
    const userAgent = navigator.userAgent.toLowerCase()
    const isAndroid = /android/.test(userAgent)
    const isIOS = /iphone|ipad|ipod/.test(userAgent)
    const isMobile = /mobile|android|iphone|ipad|ipod/.test(userAgent)
    
    let browserName = 'Unknown'
    if (userAgent.includes('chrome')) browserName = 'Chrome'
    else if (userAgent.includes('firefox')) browserName = 'Firefox'
    else if (userAgent.includes('safari')) browserName = 'Safari'
    else if (userAgent.includes('edge')) browserName = 'Edge'

    setDeviceInfo({ isAndroid, isIOS, isMobile, browserName })

    // PWA install prompt event listener
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handlePWAInstall = async () => {
    if (!installPrompt) {
      toast({
        title: "Yükleme Mevcut Değil",
        description: "Bu cihazda PWA yüklemesi desteklenmiyor veya uygulama zaten yüklü.",
        variant: "destructive"
      })
      return
    }

    try {
      const result = await installPrompt.prompt()
      
      if (result.outcome === 'accepted') {
        toast({
          title: "Başarılı!",
          description: "CostikFinans başarıyla ana ekranınıza eklendi!",
        })
        setIsInstallable(false)
      }
      
      setInstallPrompt(null)
    } catch (error) {
      console.error('PWA install error:', error)
      toast({
        title: "Yükleme Hatası",
        description: "Uygulama yüklenirken bir hata oluştu.",
        variant: "destructive"
      })
    }
  }

  const handleApkDownload = async () => {
    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 10
        })
      }, 100)

      // Try to download the pre-built APK file first
      const response = await fetch('/downloads/costikfinans.apk', {
        method: 'GET',
        headers: {
          'Accept': 'application/vnd.android.package-archive',
        }
      })

      if (!response.ok) {
        // Fallback to API generation
        const apiResponse = await fetch('/api/apk/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appName: 'CostikFinans',
            packageName: 'com.costikfinans.app',
            version: '1.0.0'
          })
        })

        if (!apiResponse.ok) {
          throw new Error('APK dosyası bulunamadı')
        }

        const blob = await apiResponse.blob()
        clearInterval(progressInterval)
        setDownloadProgress(100)

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'CostikFinans.apk'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      } else {
        // Direct download from static file
        const blob = await response.blob()
        clearInterval(progressInterval)
        setDownloadProgress(100)

        // Create download link
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'CostikFinans.apk'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }

      toast({
        title: "İndirme Tamamlandı!",
        description: "CostikFinans.apk dosyası indirildi. Kurulum rehberine göz atın.",
      })

    } catch (error) {
      console.error('APK download error:', error)
      toast({
        title: "İndirme Hatası",
        description: "APK dosyası indirilemedi. PWA kurulumunu deneyin.",
        variant: "destructive"
      })
    } finally {
      setIsDownloading(false)
      setTimeout(() => setDownloadProgress(0), 2000)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-2">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
        </div>
        <CardTitle className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Mobil Uygulama İndir
        </CardTitle>
        <CardDescription className="text-base">
          CostikFinans'ı {deviceInfo.isMobile ? 'telefonunuza' : 'cihazınıza'} yükleyin ve her yerden erişin
        </CardDescription>
        
        {/* Device Info */}
        <div className="flex justify-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {deviceInfo.isAndroid ? '🤖 Android' : deviceInfo.isIOS ? '🍎 iOS' : '💻 Desktop'}
          </Badge>
          <Badge variant="outline" className="text-xs">
            🌐 {deviceInfo.browserName}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* PWA Install Option */}
        {isInstallable && (
          <div className="space-y-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <Zap className="h-4 w-4 text-green-600" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-green-800">Önerilen Yöntem</span>
                <div className="flex gap-1 mt-1">
                  <Badge className="bg-green-100 text-green-800 text-xs">Anında</Badge>
                  <Badge className="bg-green-100 text-green-800 text-xs">Güvenli</Badge>
                  <Badge className="bg-green-100 text-green-800 text-xs">Otomatik</Badge>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handlePWAInstall}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              size="lg"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Ana Ekrana Ekle (PWA)
            </Button>
            
            <div className="grid grid-cols-2 gap-4 text-xs text-green-700">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                <span>3 saniyede kurulum</span>
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3" />
                <span>Otomatik güncelleme</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3" />
                <span>Güvenli kurulum</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>Hızlı performans</span>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        {isInstallable && (
          <div className="relative">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-background px-4 text-xs text-muted-foreground uppercase tracking-wider">
                veya alternatif
              </span>
            </div>
          </div>
        )}

        {/* APK Download Option */}
        <div className="space-y-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-full">
              <Download className="h-4 w-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-orange-800">APK Dosyası</span>
              <div className="flex gap-1 mt-1">
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">Manuel</Badge>
                {deviceInfo.isAndroid && (
                  <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">Android</Badge>
                )}
              </div>
            </div>
          </div>

          <Button 
            onClick={handleApkDownload}
            disabled={isDownloading}
            variant="outline"
            className="w-full border-orange-300 hover:bg-orange-100"
            size="lg"
          >
            {isDownloading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                İndiriliyor... {Math.round(downloadProgress)}%
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                APK Dosyası İndir {deviceInfo.isAndroid ? '' : '(Android için)'}
              </>
            )}
          </Button>

          {isDownloading && (
            <div className="space-y-2">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-center text-orange-600">
                Dosya hazırlanıyor... Lütfen bekleyin
              </p>
            </div>
          )}

          <div className="text-xs text-orange-700 space-y-1">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p>• Bilinmeyen kaynaklardan yüklemeyi etkinleştirin</p>
                <p>• İndirilen APK dosyasını açın ve yükleyin</p>
                <p>• Manuel güncellemeler gerekebilir</p>
              </div>
            </div>
          </div>
        </div>

        {/* Install Instructions Link */}
        <div className="text-center">
          <Button 
            variant="ghost" 
            className="text-sm text-blue-600 hover:text-blue-800"
            onClick={() => window.open('/yardim/kurulum', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Detaylı Kurulum Rehberi
          </Button>
        </div>

        {/* Additional Info */}
        {!deviceInfo.isAndroid && !isInstallable && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-700">
                <p className="font-medium">Bilgi:</p>
                <p>
                  {deviceInfo.isIOS 
                    ? 'iOS cihazlar için PWA kurulumu Safari tarayıcısında mevcut.'
                    : 'En iyi deneyim için Chrome, Safari veya Edge tarayıcısı kullanın.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
