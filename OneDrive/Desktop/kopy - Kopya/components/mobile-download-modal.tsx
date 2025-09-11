"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Download, Smartphone, CheckCircle, ExternalLink, Shield, Zap, Cloud, RefreshCw, QrCode, Copy, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { QRDownload } from "@/components/qr-download"
import { APKValidator, type APKValidationResult } from "@/lib/apk-validator"

interface MobileDownloadModalProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileDownloadModal({ isOpen, onClose }: MobileDownloadModalProps) {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [apkValidation, setApkValidation] = useState<APKValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
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

    // PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // APK validation when modal opens
    if (isOpen) {
      validateAPK()
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isOpen])

  const validateAPK = async () => {
    setIsValidating(true)
    try {
      const validation = await APKValidator.validateAPKFromURL(
        `${window.location.origin}/downloads/costikfinans.apk`
      )
      setApkValidation(validation)
      
      if (!validation.isValid) {
        toast({
          title: "APK Güvenlik Uyarısı",
          description: `APK dosyasında sorunlar tespit edildi. Güvenlik skoru: ${validation.securityScore}%`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('APK validation error:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const handlePWAInstall = () => {
    toast({
      title: "PWA Kurulumu",
      description: "Chrome menüsünden (⋮) 'Ana ekrana ekle' seçeneğini kullanın.",
    })
    onClose()
  }

  const handleApkDownload = async () => {
    // APK validation check first
    if (apkValidation && !apkValidation.isValid) {
      toast({
        title: "⚠️ Güvenlik Uyarısı",
        description: `APK dosyası güvenilir görünmüyor (Skor: ${apkValidation.securityScore}%). PWA kurulumunu tercih edin.`,
        variant: "destructive"
      })
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      // Re-validate APK before download
      const validation = await APKValidator.validateAPKFromURL('/downloads/costikfinans.apk')
      
      if (!validation.isValid) {
        throw new Error(`APK güvenlik kontrolü başarısız: ${validation.errors.join(', ')}`)
      }

      // Check if APK exists first (HEAD), fallback GET
      const apkUrl = '/downloads/costikfinans.apk'
      try {
        const head = await fetch(apkUrl, { method: 'HEAD', cache: 'no-store' })
        if (!head.ok) {
          throw new Error('APK bulunamadı (HEAD)')
        }
      } catch (e) {
        // Fallback GET check
        const check = await fetch(apkUrl, { method: 'GET', cache: 'no-store' })
        if (!check.ok) {
          // Open PWA Builder as fallback
          const pwaBuilderUrl = `https://pwabuilder.com/?site=${encodeURIComponent(window.location.origin)}`
          window.open(pwaBuilderUrl, '_blank')
          toast({ title: 'PWA Builder açıldı', description: 'APK şu an mevcut değil. PWA Builder ile oluşturabilirsiniz.' })
          return
        }
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + Math.random() * 15
        })
      }, 200)

      // Direct download
      const response = await fetch('/downloads/costikfinans.apk', { headers: { 'Accept': 'application/vnd.android.package-archive' } })
      
      if (!response.ok) {
        throw new Error('APK dosyası bulunamadı')
      }

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

      toast({
        title: "İndirme Tamamlandı!",
        description: "APK dosyası indirildi. Kurulum için dosyayı açın.",
      })

      onClose()

    } catch (error) {
      console.error('APK download error:', error)
      toast({
        title: "İndirme Hatası",
  description: "APK indirilemedi. PWA kurulumunu deneyin veya PWA Builder ile APK oluşturun.",
        variant: "destructive"
      })
    } finally {
      setIsDownloading(false)
      setTimeout(() => setDownloadProgress(0), 2000)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <img src="/logo.svg" alt="CostikFinans" className="h-6 w-6" />
            <span>CostikFinans - Mobil Uygulama İndir</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Device Info */}
          <div className="flex justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              {deviceInfo.isAndroid ? '🤖 Android' : deviceInfo.isIOS ? '🍎 iOS' : '💻 Desktop'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              🌐 {deviceInfo.browserName}
            </Badge>
          </div>

          {/* Tabs for different download methods */}
          <Tabs defaultValue="pwa" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pwa" className="text-xs">
                <Cloud className="h-3 w-3 mr-1" />
                PWA
              </TabsTrigger>
              <TabsTrigger value="qr" className="text-xs">
                <QrCode className="h-3 w-3 mr-1" />
                QR Kod
              </TabsTrigger>
              <TabsTrigger value="apk" className="text-xs">
                <Download className="h-3 w-3 mr-1" />
                APK
              </TabsTrigger>
            </TabsList>

            {/* PWA Tab */}
            <TabsContent value="pwa" className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <Zap className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-green-800">PWA Kurulumu</span>
                    <Badge className="bg-green-100 text-green-800 text-xs ml-2">Önerilen</Badge>
                  </div>
                </div>
                
                <Button 
                  onClick={handlePWAInstall}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 mb-3"
                  size="sm"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Ana Ekrana Ekle
                </Button>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-green-700">
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
                    <span>Güvenli</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    <span>Hızlı</span>
                  </div>
                </div>

                {/* PWA Instructions */}
                <div className="mt-4 p-3 bg-white/60 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 mb-2">Nasıl Kurulur:</h4>
                  <div className="text-xs text-green-700 space-y-1">
                    {deviceInfo.isIOS ? (
                      <>
                        <p>1. Safari'de "Paylaş" butonuna basın</p>
                        <p>2. "Ana Ekrana Ekle" seçeneğini seçin</p>
                        <p>3. "Ekle" butonuna basın</p>
                      </>
                    ) : (
                      <>
                        <p>1. Chrome menüsünü (⋮) açın</p>
                        <p>2. "Ana ekrana ekle" seçeneğini seçin</p>
                        <p>3. "Yükle" butonuna basın</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* QR Code Tab */}
            <TabsContent value="qr" className="space-y-4">
              <QRDownload 
                downloadUrl={`${window.location.origin}/downloads/costikfinans.apk`}
                appName="CostikFinans"
              />
            </TabsContent>

            {/* APK Tab */}
            <TabsContent value="apk" className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <Download className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-orange-800">APK Dosyası</span>
                    {deviceInfo.isAndroid && (
                      <Badge variant="outline" className="text-xs border-orange-300 text-orange-700 ml-2">
                        Android
                      </Badge>
                    )}
                  </div>
                </div>

                {/* APK Security Status */}
                {isValidating ? (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg mb-3">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <span className="text-sm text-blue-800">APK güvenlik kontrolü yapılıyor...</span>
                  </div>
                ) : apkValidation ? (
                  <div className={`p-3 rounded-lg mb-3 ${
                    apkValidation.securityScore >= 70 ? 'bg-green-50 border border-green-200' :
                    apkValidation.securityScore >= 50 ? 'bg-yellow-50 border border-yellow-200' :
                    'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {apkValidation.securityScore >= 70 ? (
                        <Shield className="h-4 w-4 text-green-600" />
                      ) : apkValidation.securityScore >= 50 ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${
                        apkValidation.securityScore >= 70 ? 'text-green-800' :
                        apkValidation.securityScore >= 50 ? 'text-yellow-800' :
                        'text-red-800'
                      }`}>
                        Güvenlik Skoru: {apkValidation.securityScore}%
                      </span>
                    </div>
                    
                    {apkValidation.size > 0 && (
                      <p className="text-xs text-gray-600 mb-1">
                        Boyut: {APKValidator.formatSize(apkValidation.size)}
                      </p>
                    )}
                    
                    {apkValidation.errors.length > 0 && (
                      <div className="text-xs text-red-700 space-y-1">
                        {apkValidation.errors.map((error, i) => (
                          <p key={i}>❌ {error}</p>
                        ))}
                      </div>
                    )}
                    
                    {apkValidation.warnings.length > 0 && (
                      <div className="text-xs text-yellow-700 space-y-1">
                        {apkValidation.warnings.map((warning, i) => (
                          <p key={i}>⚠️ {warning}</p>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                <Button 
                  onClick={handleApkDownload}
                  disabled={isDownloading || (apkValidation ? !apkValidation.isValid : false)}
                  variant="outline"
                  className={`w-full mb-3 ${
                    apkValidation && !apkValidation.isValid 
                      ? 'border-red-300 bg-red-50 text-red-700 cursor-not-allowed' 
                      : 'border-orange-300 hover:bg-orange-100'
                  }`}
                  size="sm"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      İndiriliyor... {Math.round(downloadProgress)}%
                    </>
                  ) : apkValidation && !apkValidation.isValid ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      APK Güvenilir Değil
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      APK İndir {!deviceInfo.isAndroid ? '(Android için)' : ''}
                    </>
                  )}
                </Button>

                {isDownloading && (
                  <div className="space-y-2 mb-3">
                    <Progress value={downloadProgress} className="h-2" />
                    <p className="text-xs text-center text-orange-600">
                      Dosya hazırlanıyor...
                    </p>
                  </div>
                )}

                <div className="text-xs text-orange-700 space-y-1">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>• Bilinmeyen kaynaklardan yüklemeyi etkinleştirin</p>
                      <p>• İndirilen APK dosyasını açın ve yükleyin</p>
                    </div>
                  </div>
                </div>

                {/* APK Installation Steps */}
                <div className="mt-4 p-3 bg-white/60 rounded-lg">
                  <h4 className="text-sm font-medium text-orange-800 mb-2">Kurulum Adımları:</h4>
                  <div className="text-xs text-orange-700 space-y-1">
                    <p>1. Ayarlar → Güvenlik → Bilinmeyen kaynaklar ✅</p>
                    <p>2. İndirilen APK dosyasını açın</p>
                    <p>3. "Yükle" butonuna basın</p>
                    <p>4. Kurulum tamamlandığında "Aç" butonuna basın</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Help Link */}
          <div className="text-center">
            <Button 
              variant="ghost" 
              className="text-sm text-blue-600 hover:text-blue-800"
              onClick={() => {
                window.open('/yardim/kurulum', '_blank')
                onClose()
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Detaylı Kurulum Rehberi
            </Button>
          </div>

          {/* Device specific info */}
          {!deviceInfo.isAndroid && (
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium">💡 İpucu:</p>
                  <p>
                    {deviceInfo.isIOS 
                      ? 'iOS cihazlar için PWA kurulumu Safari\'de "Paylaş > Ana Ekrana Ekle" ile yapılır.'
                      : 'En iyi deneyim için Chrome tarayıcısı kullanın ve PWA kurulumunu tercih edin.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
