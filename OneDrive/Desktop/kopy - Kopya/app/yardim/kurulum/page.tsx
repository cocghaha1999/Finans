"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, CheckCircle, Smartphone, Download, Settings, Shield, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ApkInstallGuide() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfa
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">APK Kurulum Rehberi</h1>
            <p className="text-muted-foreground">CostikFinans uygulamasını telefonunuza nasıl kuracağınızı öğrenin</p>
          </div>
        </div>

        <div className="grid gap-6">
          {/* APK vs PWA Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Hangi Kurulum Yöntemini Seçmeliyim?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">Önerilen</Badge>
                    <h3 className="font-semibold">PWA (Ana Ekrana Ekle)</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Anında kurulum
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Otomatik güncellemeler
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Güvenlik ayarı gerektirmez
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      App Store'dan indirme hissi
                    </li>
                  </ul>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Alternatif</Badge>
                    <h3 className="font-semibold">APK Dosyası</h3>
                  </div>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Güvenlik ayarı gerekir
                    </li>
                    <li className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      Manuel güncelleme
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Çevrimdışı kurulum
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Tam uygulama deneyimi
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PWA Installation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-green-600" />
                PWA Kurulumu (Önerilen)
              </CardTitle>
              <CardDescription>
                En kolay ve güvenli yöntem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <div className="flex gap-3">
                  <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <h4 className="font-medium">Ana sayfada "Ana Ekrana Ekle" butonuna tıklayın</h4>
                    <p className="text-sm text-muted-foreground">Chrome, Safari veya Edge tarayıcısı kullanıyor olmanız gerekir</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <h4 className="font-medium">Çıkan dialog'da "Yükle" veya "Ekle"ye tıklayın</h4>
                    <p className="text-sm text-muted-foreground">Tarayıcınızın diline göre farklı olabilir</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <h4 className="font-medium">Uygulama ana ekranınıza eklenir</h4>
                    <p className="text-sm text-muted-foreground">Normal bir uygulama gibi açabilirsiniz</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* APK Installation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-600" />
                APK Kurulumu
              </CardTitle>
              <CardDescription>
                Manuel kurulum için adım adım rehber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Enable Unknown Sources */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Adım 1: Bilinmeyen Kaynaklara İzin Verme
                </h3>
                
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <h4 className="font-medium">Telefon Ayarlarını açın</h4>
                      <p className="text-sm text-muted-foreground">⚙️ Ayarlar uygulamasını bulun ve açın</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <h4 className="font-medium">"Güvenlik" veya "Gizlilik" bölümüne gidin</h4>
                      <p className="text-sm text-muted-foreground">Telefon modeline göre farklı olabilir</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <h4 className="font-medium">"Bilinmeyen Kaynaklar" veya "Bilinmeyen Uygulamalara İzin Ver"i açın</h4>
                      <p className="text-sm text-muted-foreground">Chrome için özel izin vermeniz gerekebilir</p>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-orange-800">Güvenlik Uyarısı</h4>
                      <p className="text-sm text-orange-700">
                        Bu ayarı sadece güvendiğiniz kaynaklardan uygulama yüklerken açın. 
                        Kurulum sonrası tekrar kapatabilirsiniz.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 2: Download APK */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Adım 2: APK Dosyasını İndirme
                </h3>
                
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <h4 className="font-medium">Ana sayfada "APK Dosyası İndir" butonuna tıklayın</h4>
                      <p className="text-sm text-muted-foreground">İndirme işlemi birkaç saniye sürebilir</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-purple-100 text-purple-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <h4 className="font-medium">Dosya "İndirilenler" klasörüne kaydedilir</h4>
                      <p className="text-sm text-muted-foreground">CostikFinans.apk adında bir dosya olacak</p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Step 3: Install APK */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Adım 3: APK Dosyasını Kurma
                </h3>
                
                <div className="grid gap-4">
                  <div className="flex gap-3">
                    <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">1</div>
                    <div>
                      <h4 className="font-medium">Dosya yöneticisini açın</h4>
                      <p className="text-sm text-muted-foreground">Telefondaki "Dosyalar" veya "Dosya Yöneticisi" uygulaması</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">2</div>
                    <div>
                      <h4 className="font-medium">"İndirilenler" klasörüne gidin</h4>
                      <p className="text-sm text-muted-foreground">CostikFinans.apk dosyasını bulun</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">3</div>
                    <div>
                      <h4 className="font-medium">APK dosyasına tıklayın</h4>
                      <p className="text-sm text-muted-foreground">Kurulum ekranı açılacak</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <div className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">4</div>
                    <div>
                      <h4 className="font-medium">"Yükle" butonuna tıklayın</h4>
                      <p className="text-sm text-muted-foreground">Kurulum tamamlandığında "Aç" butonu görünecek</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle>Sorun Giderme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium">PWA yükleme butonu görünmüyor</h4>
                  <p className="text-sm text-muted-foreground">• Chrome, Safari veya Edge tarayıcısı kullandığınızdan emin olun</p>
                  <p className="text-sm text-muted-foreground">• Sayfayı yenilemeyi deneyin</p>
                  <p className="text-sm text-muted-foreground">• Tarayıcı ayarlarından "Masaüstü sitesi"ni kapatın</p>
                </div>
                
                <div>
                  <h4 className="font-medium">APK kurulum hatası</h4>
                  <p className="text-sm text-muted-foreground">• "Bilinmeyen kaynaklar" ayarının açık olduğundan emin olun</p>
                  <p className="text-sm text-muted-foreground">• Eski sürümü kaldırıp tekrar deneyin</p>
                  <p className="text-sm text-muted-foreground">• Depolama alanınızın yeterli olduğunu kontrol edin</p>
                </div>
                
                <div>
                  <h4 className="font-medium">Uygulama açılmıyor</h4>
                  <p className="text-sm text-muted-foreground">• İnternet bağlantınızı kontrol edin</p>
                  <p className="text-sm text-muted-foreground">• Uygulamayı kapatıp tekrar açmayı deneyin</p>
                  <p className="text-sm text-muted-foreground">• Telefonu yeniden başlatın</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Back to Home */}
          <div className="text-center">
            <Link href="/">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ana Sayfaya Dön
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
