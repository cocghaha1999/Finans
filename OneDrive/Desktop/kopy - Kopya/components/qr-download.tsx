"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { QrCode, Copy, Download, Smartphone, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface QRDownloadProps {
  downloadUrl: string
  appName?: string
}

export function QRDownload({ downloadUrl, appName = "CostikFinans" }: QRDownloadProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    generateQRCode()
  }, [downloadUrl])

  const generateQRCode = async () => {
    try {
      setIsLoading(true)
      // Use external QR service directly for static hosting
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(downloadUrl)}&format=png&bgcolor=FFFFFF&color=000000&margin=10`
      setQrCodeUrl(qrUrl)
    } catch (error) {
      console.error('QR kod oluşturma hatası:', error)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(downloadUrl)}&format=png&bgcolor=FFFFFF&color=000000&margin=10`
      setQrCodeUrl(qrUrl)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl)
      toast({
        title: "Kopyalandı!",
        description: "İndirme linki panoya kopyalandı.",
      })
    } catch (error) {
      toast({
        title: "Kopyalama Hatası",
        description: "Link kopyalanamadı. Manuel olarak kopyalayın.",
        variant: "destructive"
      })
    }
  }

  const downloadQR = () => {
    if (!qrCodeUrl) return
    const a = document.createElement('a')
    a.href = qrCodeUrl
    a.download = `${appName}-QR.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast({
      title: "QR Kod İndirildi",
      description: "QR kod resmi indirildi.",
    })
  }

  return (
    <Card className="w-full max-w-sm mx-auto">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full">
            <QrCode className="h-6 w-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-lg font-bold">QR Kod ile İndir</CardTitle>
        <CardDescription className="text-sm">
          Telefon kameranızla QR kodu tarayın
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* QR Code Display */}
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
            {isLoading ? (
              <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : (
              <img 
                src={qrCodeUrl} 
                alt={`${appName} QR Kod`}
                className="w-48 h-48 rounded-lg"
                onError={() => {
                  const fallbackUrl = `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(downloadUrl)}&choe=UTF-8`
                  setQrCodeUrl(fallbackUrl)
                }}
              />
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-center">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <Smartphone className="h-4 w-4" />
              <span>Kamera uygulamanızı açın</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <QrCode className="h-4 w-4" />
              <span>QR kodu ekrana sığdırın</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
              <CheckCircle className="h-4 w-4" />
              <span>Çıkan linke dokunun</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={copyToClipboard}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            <Copy className="h-3 w-3 mr-1" />
            Linki Kopyala
          </Button>
          
          <Button
            onClick={downloadQR}
            variant="outline"
            size="sm"
            className="text-xs"
            disabled={!qrCodeUrl || isLoading}
          >
            <Download className="h-3 w-3 mr-1" />
            QR İndir
          </Button>
        </div>

        {/* Direct Link */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-2">Direkt Link:</p>
          <p className="text-xs text-blue-600 break-all font-mono">
            {downloadUrl}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
