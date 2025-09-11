"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Download, Smartphone, CheckCircle, ExternalLink, Shield, Zap, Cloud, RefreshCw, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { APKValidator, type APKValidationResult } from "@/lib/apk-validator"

export function ApkDownload() {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [apkAvailable, setApkAvailable] = useState(false)
  const [apkValidation, setApkValidation] = useState<APKValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const apkUrl = '/downloads/costikfinans.apk'
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

    // Check if APK file exists on server (HEAD preferred, fallback GET)
    ;(async () => {
      try {
        const head = await fetch(apkUrl, { method: 'HEAD', cache: 'no-store' })
        if (head.ok) {
          setApkAvailable(true)
          // Validate APK security
          validateAPK()
          return
        }
      } catch {}
      try {
        const res = await fetch(apkUrl, { method: 'GET', cache: 'no-store' })
        setApkAvailable(res.ok)
        if (res.ok) {
          validateAPK()
        }
      } catch {
        setApkAvailable(false)
      }
    })()

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const validateAPK = async () => {
    setIsValidating(true)
    try {
      const validation = await APKValidator.validateAPKFromURL(
        `${window.location.origin}/downloads/costikfinans.apk`
      )
      setApkValidation(validation)
      
      if (!validation.isValid) {
        toast({
          title: "⚠️ APK Güvenlik Uyarısı",
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
    // Eğer PWA kurulumu mümkünse önce onu dene
    if (isInstallable && installPrompt) {
      return handlePWAInstall()
    }

    // APK validation check
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
      if (apkAvailable) {
        // UX için sahte ilerleme
        const progressInterval = setInterval(() => {
          setDownloadProgress(prev => {
            if (prev >= 90) { clearInterval(progressInterval); return prev }
            return prev + Math.random() * 10
          })
        }, 100)

        const response = await fetch(apkUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/vnd.android.package-archive' },
        })
        if (!response.ok) throw new Error('APK bulunamadı')
        const blob = await response.blob()
        clearInterval(progressInterval)
        setDownloadProgress(100)

        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'CostikFinans.apk'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        toast({ title: 'İndirme hazır', description: 'APK dosyası indirildi.' })
        return
      }

      // APK yoksa PWA Builder'a yönlendir
      const pwaBuilderUrl = `https://pwabuilder.com/?site=${encodeURIComponent(window.location.origin)}`
      window.open(pwaBuilderUrl, '_blank')
      setDownloadProgress(100)
      toast({ title: 'PWA Builder açıldı', description: 'Android seçeneğiyle APK oluşturun.' })
    } catch (error) {
      console.error('APK download error:', error)
      toast({ title: 'İndirme Hatası', description: 'APK indirilemedi. PWA kurulumunu deneyin.', variant: 'destructive' })
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
        {/* APK Security Status */}
        {apkAvailable && (
          <div className="space-y-3">
            {isValidating ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                <span className="text-sm text-blue-800">APK güvenlik kontrolü yapılıyor...</span>
              </div>
            ) : apkValidation ? (
              <div className={`p-3 rounded-lg border ${
                apkValidation.securityScore >= 70 ? 'bg-green-50 border-green-200' :
                apkValidation.securityScore >= 50 ? 'bg-yellow-50 border-yellow-200' :
                'bg-red-50 border-red-200'
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
                    APK Güvenlik: {apkValidation.securityScore}%
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {APKValidator.formatSize(apkValidation.size)}
                  </Badge>
                </div>
                
                {apkValidation.errors.length > 0 && (
                  <div className="text-xs text-red-700 space-y-1 mb-2">
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
          </div>
        )}

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
        <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <ExternalLink className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-blue-800">Gerçek APK İndir</span>
              <div className="flex gap-1 mt-1">
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">PWA Builder</Badge>
                {deviceInfo.isAndroid && (
                  <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Android</Badge>
                )}
              </div>
            </div>
          </div>

          <Button 
            onClick={handleApkDownload}
            disabled={isDownloading || (apkValidation ? !apkValidation.isValid : false)}
            variant="outline"
            className={`w-full ${
              apkValidation && !apkValidation.isValid 
                ? 'border-red-300 bg-red-50 text-red-700 cursor-not-allowed' 
                : 'border-blue-300 hover:bg-blue-100'
            }`}
            size="lg"
          >
            {isDownloading ? (
              <>
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                PWA Builder Açılıyor...
              </>
            ) : apkValidation && !apkValidation.isValid ? (
              <>
                <AlertCircle className="h-4 w-4 mr-2" />
                APK Güvenilir Değil - PWA Kullanın
              </>
            ) : apkAvailable ? (
              <>
                <Download className="h-4 w-4 mr-2" />
                APK İndir {!deviceInfo.isAndroid ? '(Android için)' : ''}
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4 mr-2" />
                PWA Builder ile APK Oluştur
              </>
            )}
          </Button>

          {isDownloading && (
            <div className="space-y-2">
              <Progress value={downloadProgress} className="h-2" />
              <p className="text-xs text-center text-blue-600">
                PWA Builder sitesi açılıyor... Lütfen bekleyin
              </p>
            </div>
          )}

          <div className="text-xs text-blue-700 space-y-1">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p>• PWA Builder sitesinde Android seçeneğini seçin</p>
                <p>• Oluşturulan APK dosyasını indirin</p>
                <p>• İmzalanmış, kuruluma hazır APK elde edin</p>
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
