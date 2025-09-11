'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Smartphone, 
  Download, 
  Zap, 
  Shield, 
  Wifi, 
  Bell, 
  CreditCard, 
  BarChart3, 
  Calendar,
  Database,
  Fingerprint,
  RefreshCw
} from "lucide-react"

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="mb-6">
          <Badge variant="secondary" className="mb-4">
            📱 Mobil Uygulama
          </Badge>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            CostikFinans'ı Telefonunuza İndirin
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Web uygulamasının tüm özelliklerini mobil uygulama olarak kullanın. 
            Çevrimdışı erişim, push bildirimleri ve daha hızlı performans.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
            <Download className="h-5 w-5 mr-2" />
            PWA İndir (Ana Ekrana Ekle)
          </Button>
          <Button variant="outline" size="lg" className="w-full sm:w-auto">
            <Smartphone className="h-4 w-4 mr-2" />
            Ana Ekrana Ekle (iOS/Android)
          </Button>
        </div>
      </div>

      {/* Installation Steps */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-blue-600" />
              Android Kurulum
            </CardTitle>
            <CardDescription>
              Android cihazlarda PWA kurulum rehberi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>1. costikfinans.site'yi Chrome'da açın</li>
              <li>2. Menü (⋮) → "Ana ekrana ekle" seçin</li>
              <li>3. "CostikFinans" ismini onaylayın</li>
              <li>4. Ana ekranda uygulama ikonu belirecek</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-gray-600" />
              iOS Kurulum
            </CardTitle>
            <CardDescription>
              iPhone/iPad'de PWA kurulum rehberi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>1. costikfinans.site'yi Safari'de açın</li>
              <li>2. Paylaş butonu (□↗) → "Ana Ekrana Ekle"</li>
              <li>3. "CostikFinans" ismini onaylayın</li>
              <li>4. Ana ekranda uygulama ikonu belirecek</li>
            </ol>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-8">Mobil Uygulama Özellikleri</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <Wifi className="h-8 w-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">Çevrimdışı Erişim</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                İnternet bağlantısı olmadan da verilerinize erişebilir ve işlem yapabilirsiniz.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Bell className="h-8 w-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Push Bildirimleri</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Önemli finansal olaylar için anında bildirim alın.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-8 w-8 text-yellow-600 mb-2" />
              <CardTitle className="text-lg">Hızlı Performans</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Uygulama gibi hızlı yüklenme ve akıcı kullanım deneyimi.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-8 w-8 text-red-600 mb-2" />
              <CardTitle className="text-lg">Güvenli Veri</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Finansal verileriniz şifreli olarak saklanır ve korunur.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <RefreshCw className="h-8 w-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">Otomatik Senkron</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verileriniz tüm cihazlarınızda otomatik olarak senkronize edilir.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Database className="h-8 w-8 text-indigo-600 mb-2" />
              <CardTitle className="text-lg">Yerel Depolama</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verileriniz cihazınızda güvenle saklanır, hızlı erişim sağlar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
        <h2 className="text-2xl font-bold mb-4">
          CostikFinans'ı Hemen İndirin
        </h2>
        <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
          CostikFinans'ı telefonunuza yükleyerek finansal kontrolünüzü elinize alın. 
          Kurulum ücretsiz ve birkaç saniye sürüyor.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="secondary">
            <Download className="h-5 w-5 mr-2" />
            Şimdi İndir
          </Button>
          <Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-blue-600">
            <Fingerprint className="h-4 w-4 mr-2" />
            Web Uygulamayı Kullan
          </Button>
        </div>
      </div>
    </div>
  )
}
