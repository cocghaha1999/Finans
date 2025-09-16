"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Mail, 
  Shield, 
  Database, 
  Bell,
  Globe,
  Palette,
  Users,
  Key,
  AlertTriangle,
  Download,
  Upload,
  Trash2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("general")
  const [isLoading, setIsLoading] = useState(false)
  const [testEmail, setTestEmail] = useState("")

  // Mock ayarlar - gerçek projede API'den gelecek
  const [settings, setSettings] = useState({
    general: {
      appName: "CostikFinans",
      appDescription: "Modern Finans Yönetim Uygulaması",
      supportEmail: "support@costikfinans.com",
      maintenance: false,
      registrationEnabled: true
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      transactionAlerts: true,
      paymentReminders: true,
      budgetAlerts: true,
      monthlyReports: true,
      weeklyReports: true,
      systemUpdates: false,
      smtpHost: "smtp.gmail.com",
      smtpPort: 587,
      emailUser: "",
      emailPassword: ""
    },
    security: {
      twoFactorEnabled: false,
      sessionTimeout: "24",
      passwordComplexity: "medium",
      maxLoginAttempts: "5"
    },
    appearance: {
      defaultTheme: "system",
      allowUserThemes: true,
      compactMode: false,
      showAnimations: true
    },
    integrations: {
      analyticsEnabled: true,
      backupEnabled: true,
      backupFrequency: "daily",
      dataRetention: "365"
    }
  })

  const handleSave = async (section: string) => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast({
        title: "Ayarlar kaydedildi",
        description: `${section} ayarları başarıyla güncellendi.`,
      })
    } catch (error) {
      toast({
        title: "Hata",
        description: "Ayarlar kaydedilirken bir hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail) return
    
    setIsLoading(true)
    try {
      // Gmail SMTP ile direkt test gönderimi (geliştirme amaçlı)
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userEmail: testEmail,
          smtpSettings: {
            host: settings.notifications.smtpHost,
            port: settings.notifications.smtpPort,
            user: settings.notifications.emailUser,
            password: settings.notifications.emailPassword
          }
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        toast({
          title: "Test e-postası gönderildi",
          description: `${testEmail} adresine test e-postası gönderildi.`,
        })
      } else {
        throw new Error(result.error || 'E-posta gönderilemedi')
      }
      
      setTestEmail("")
    } catch (error) {
      console.error('Test e-posta hatası:', error)
      toast({
        title: "Test e-postası hatası",
        description: error instanceof Error ? error.message : "Test e-postası gönderilirken bir hata oluştu.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateSetting = (section: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value
      }
    }))
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sistem Ayarları</h1>
          <p className="text-muted-foreground">
            Uygulama ayarlarını yönetin ve yapılandırın
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Yedek Al
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Yedek Yükle
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="notifications">Bildirimler</TabsTrigger>
          <TabsTrigger value="security">Güvenlik</TabsTrigger>
          <TabsTrigger value="appearance">Görünüm</TabsTrigger>
          <TabsTrigger value="integrations">Entegrasyonlar</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Genel Ayarlar
              </CardTitle>
              <CardDescription>
                Temel uygulama ayarları ve konfigürasyonu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="appName">Uygulama Adı</Label>
                  <Input
                    id="appName"
                    value={settings.general.appName}
                    onChange={(e) => updateSetting('general', 'appName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Destek E-postası</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={settings.general.supportEmail}
                    onChange={(e) => updateSetting('general', 'supportEmail', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="appDescription">Uygulama Açıklaması</Label>
                <Textarea
                  id="appDescription"
                  value={settings.general.appDescription}
                  onChange={(e) => updateSetting('general', 'appDescription', e.target.value)}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bakım Modu</Label>
                    <p className="text-sm text-muted-foreground">
                      Uygulama bakım modunda olduğunda kullanıcılar erişemez
                    </p>
                  </div>
                  <Switch
                    checked={settings.general.maintenance}
                    onCheckedChange={(checked) => updateSetting('general', 'maintenance', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Kullanıcı Kaydı</Label>
                    <p className="text-sm text-muted-foreground">
                      Yeni kullanıcıların kayıt olmasına izin ver
                    </p>
                  </div>
                  <Switch
                    checked={settings.general.registrationEnabled}
                    onCheckedChange={(checked) => updateSetting('general', 'registrationEnabled', checked)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('Genel')} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Bildirim Ayarları
              </CardTitle>
              <CardDescription>
                E-posta ve push bildirim ayarlarını yönetin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* E-posta Konfigürasyonu */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">E-posta Konfigürasyonu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Sunucu</Label>
                    <Input
                      id="smtpHost"
                      value={settings.notifications.smtpHost || 'smtp.gmail.com'}
                      onChange={(e) => updateSetting('notifications', 'smtpHost', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="smtpPort">SMTP Port</Label>
                    <Input
                      id="smtpPort"
                      type="number"
                      value={settings.notifications.smtpPort || 587}
                      onChange={(e) => updateSetting('notifications', 'smtpPort', parseInt(e.target.value))}
                      placeholder="587"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailUser">E-posta Kullanıcısı</Label>
                    <Input
                      id="emailUser"
                      type="email"
                      value={settings.notifications.emailUser || ''}
                      onChange={(e) => updateSetting('notifications', 'emailUser', e.target.value)}
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emailPassword">E-posta Şifresi</Label>
                    <Input
                      id="emailPassword"
                      type="password"
                      value={settings.notifications.emailPassword || ''}
                      onChange={(e) => updateSetting('notifications', 'emailPassword', e.target.value)}
                      placeholder="Uygulama şifresi"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Not:</strong> Gmail kullanıyorsanız, 2FA açık olmalı ve "Uygulama Şifresi" oluşturmalısınız.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Bildirim Türleri</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>E-posta Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Önemli olaylar için e-posta gönder
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'emailNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Bildirimleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Tarayıcı push bildirimlerini etkinleştir
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.pushNotifications}
                    onCheckedChange={(checked) => updateSetting('notifications', 'pushNotifications', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Ödeme Hatırlatıcıları</Label>
                    <p className="text-sm text-muted-foreground">
                      Vadesi yaklaşan ödemeler için e-posta gönder
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.paymentReminders}
                    onCheckedChange={(checked) => updateSetting('notifications', 'paymentReminders', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Bütçe Aşım Uyarıları</Label>
                    <p className="text-sm text-muted-foreground">
                      Bütçe aştığında e-posta uyarısı gönder
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.budgetAlerts}
                    onCheckedChange={(checked) => updateSetting('notifications', 'budgetAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>İşlem Uyarıları</Label>
                    <p className="text-sm text-muted-foreground">
                      Büyük işlemler için anlık uyarı gönder
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.transactionAlerts}
                    onCheckedChange={(checked) => updateSetting('notifications', 'transactionAlerts', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Aylık Raporlar</Label>
                    <p className="text-sm text-muted-foreground">
                      Aylık özet raporları e-posta ile gönder
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.monthlyReports}
                    onCheckedChange={(checked) => updateSetting('notifications', 'monthlyReports', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Sistem Güncellemeleri</Label>
                    <p className="text-sm text-muted-foreground">
                      Sistem güncellemeleri hakkında bilgilendir
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.systemUpdates}
                    onCheckedChange={(checked) => updateSetting('notifications', 'systemUpdates', checked)}
                  />
                </div>
              </div>

              {/* Test E-posta Gönderme */}
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Test İşlemleri</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Test e-posta adresi"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleTestEmail}
                    disabled={!testEmail || isLoading}
                    variant="outline"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Test E-posta Gönder
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  E-posta ayarlarının çalıştığını test etmek için test e-postası gönderebilirsiniz.
                </p>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('Bildirim')} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Güvenlik Ayarları
              </CardTitle>
              <CardDescription>
                Uygulama güvenlik politikalarını yapılandırın
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Oturum Zaman Aşımı (saat)</Label>
                  <Select
                    value={settings.security.sessionTimeout}
                    onValueChange={(value) => updateSetting('security', 'sessionTimeout', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Saat</SelectItem>
                      <SelectItem value="8">8 Saat</SelectItem>
                      <SelectItem value="24">24 Saat</SelectItem>
                      <SelectItem value="168">1 Hafta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordComplexity">Şifre Karmaşıklığı</Label>
                  <Select
                    value={settings.security.passwordComplexity}
                    onValueChange={(value) => updateSetting('security', 'passwordComplexity', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Düşük</SelectItem>
                      <SelectItem value="medium">Orta</SelectItem>
                      <SelectItem value="high">Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Giriş Denemesi</Label>
                  <Select
                    value={settings.security.maxLoginAttempts}
                    onValueChange={(value) => updateSetting('security', 'maxLoginAttempts', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 Deneme</SelectItem>
                      <SelectItem value="5">5 Deneme</SelectItem>
                      <SelectItem value="10">10 Deneme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>İki Faktörlü Doğrulama</Label>
                  <p className="text-sm text-muted-foreground">
                    Admin hesapları için 2FA zorunlu kıl
                  </p>
                </div>
                <Switch
                  checked={settings.security.twoFactorEnabled}
                  onCheckedChange={(checked) => updateSetting('security', 'twoFactorEnabled', checked)}
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('Güvenlik')} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Görünüm Ayarları
              </CardTitle>
              <CardDescription>
                Kullanıcı arayüzü ve tema ayarları
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultTheme">Varsayılan Tema</Label>
                  <Select
                    value={settings.appearance.defaultTheme}
                    onValueChange={(value) => updateSetting('appearance', 'defaultTheme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Açık</SelectItem>
                      <SelectItem value="dark">Koyu</SelectItem>
                      <SelectItem value="system">Sistem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Kullanıcı Tema Seçimi</Label>
                    <p className="text-sm text-muted-foreground">
                      Kullanıcıların tema değiştirmesine izin ver
                    </p>
                  </div>
                  <Switch
                    checked={settings.appearance.allowUserThemes}
                    onCheckedChange={(checked) => updateSetting('appearance', 'allowUserThemes', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Kompakt Mod</Label>
                    <p className="text-sm text-muted-foreground">
                      Daha sıkışık arayüz elementi kullan
                    </p>
                  </div>
                  <Switch
                    checked={settings.appearance.compactMode}
                    onCheckedChange={(checked) => updateSetting('appearance', 'compactMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Animasyonlar</Label>
                    <p className="text-sm text-muted-foreground">
                      Geçiş animasyonlarını etkinleştir
                    </p>
                  </div>
                  <Switch
                    checked={settings.appearance.showAnimations}
                    onCheckedChange={(checked) => updateSetting('appearance', 'showAnimations', checked)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('Görünüm')} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integration Settings */}
        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Entegrasyon Ayarları
              </CardTitle>
              <CardDescription>
                Üçüncü parti servisler ve veri yönetimi
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="backupFrequency">Yedekleme Sıklığı</Label>
                  <Select
                    value={settings.integrations.backupFrequency}
                    onValueChange={(value) => updateSetting('integrations', 'backupFrequency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Saatlik</SelectItem>
                      <SelectItem value="daily">Günlük</SelectItem>
                      <SelectItem value="weekly">Haftalık</SelectItem>
                      <SelectItem value="monthly">Aylık</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataRetention">Veri Saklama (gün)</Label>
                  <Select
                    value={settings.integrations.dataRetention}
                    onValueChange={(value) => updateSetting('integrations', 'dataRetention', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 Gün</SelectItem>
                      <SelectItem value="90">90 Gün</SelectItem>
                      <SelectItem value="365">1 Yıl</SelectItem>
                      <SelectItem value="unlimited">Sınırsız</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analitik Takibi</Label>
                    <p className="text-sm text-muted-foreground">
                      Kullanım analitiklerini topla ve kaydet
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.analyticsEnabled}
                    onCheckedChange={(checked) => updateSetting('integrations', 'analyticsEnabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Otomatik Yedekleme</Label>
                    <p className="text-sm text-muted-foreground">
                      Düzenli aralıklarla otomatik yedekleme yap
                    </p>
                  </div>
                  <Switch
                    checked={settings.integrations.backupEnabled}
                    onCheckedChange={(checked) => updateSetting('integrations', 'backupEnabled', checked)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => handleSave('Entegrasyon')} disabled={isLoading}>
                  {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Kaydet
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Tehlikeli Bölge
              </CardTitle>
              <CardDescription>
                Bu işlemler geri alınamaz. Lütfen dikkatli olun.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded">
                <div>
                  <h4 className="font-medium">Tüm Verileri Sil</h4>
                  <p className="text-sm text-muted-foreground">Bu işlem tüm kullanıcı verilerini kalıcı olarak siler</p>
                </div>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Verileri Sil
                </Button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-destructive/20 rounded">
                <div>
                  <h4 className="font-medium">Sistemi Sıfırla</h4>
                  <p className="text-sm text-muted-foreground">Uygulamayı fabrika ayarlarına döndür</p>
                </div>
                <Button variant="destructive" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sıfırla
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}