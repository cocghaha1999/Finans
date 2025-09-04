"use client"

import type React from "react"

import { Suspense, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import {
  Wallet,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  TrendingUp,
  BarChart3,
  PieChart,
  User,
  Github,
  Chrome,
  WifiOff,
} from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useOfflineAuth } from "@/hooks/use-offline-auth"
import { auth, googleProvider, githubProvider } from "@/lib/firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth"

function LoginContent() {
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const { loginOffline, isOnline, saveCredentialsForOffline } = useOfflineAuth()
  const searchParams = useSearchParams()
  const nextPath = searchParams?.get("next") || "/"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    ;(async () => {
      setLoading(true)
      
      // Çevrimdışıysa offline giriş dene
      if (!isOnline) {
        if (isLogin) {
          const success = loginOffline(email, password, rememberMe)
          if (success) {
            toast({ 
              title: "Çevrimdışı Giriş Başarılı", 
              description: "Önceki oturumunuz devam ediyor"
            })
            router.push(nextPath)
          } else {
            toast({ 
              variant: "destructive", 
              title: "Çevrimdışı Giriş Başarısız", 
              description: "Bu hesap için kaydedilmiş bilgi bulunamadı" 
            })
          }
        } else {
          toast({ 
            variant: "destructive", 
            title: "İnternet Bağlantısı Gerekli", 
            description: "Yeni hesap oluşturmak için internet bağlantısı gereklidir" 
          })
        }
        setLoading(false)
        return
      }

      // Online durumda normal Firebase auth
      if (!auth) {
        toast({ variant: "destructive", title: "Hata", description: "Kimlik doğrulama yapılandırılmadı" })
        setLoading(false)
        return
      }
      
      try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
        if (isLogin) {
          const cred = await signInWithEmailAndPassword(auth, email, password)
          // Başarılı girişte kimlik bilgilerini çevrimdışı için kaydet
          saveCredentialsForOffline(cred.user, email, password)
          toast({ title: "Giriş başarılı" })
        } else {
          const cred = await createUserWithEmailAndPassword(auth, email, password)
          if (name.trim()) {
            await updateProfile(cred.user, { displayName: name.trim() })
          }
          // Yeni hesap için de kimlik bilgilerini kaydet
          saveCredentialsForOffline(cred.user, email, password)
          toast({ title: "Kayıt başarılı" })
        }
        router.push(nextPath)
      } catch (err: any) {
        const msg = err?.message || "İşlem sırasında hata oluştu"
        toast({ variant: "destructive", title: "Hata", description: msg })
      } finally {
        setLoading(false)
      }
    })()
  }

  const handleOAuth = async (provider: "google" | "github") => {
    if (!auth) {
  toast({ variant: "destructive", title: "Hata", description: "Kimlik doğrulama yapılandırılmadı" })
      return
    }
    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      if (provider === "google") {
        if (!googleProvider) throw new Error("Google sağlayıcı hazır değil")
        await signInWithPopup(auth, googleProvider)
      } else {
        if (!githubProvider) throw new Error("GitHub sağlayıcı hazır değil")
        await signInWithPopup(auth, githubProvider)
      }
  toast({ title: "Giriş başarılı" })
  router.push(nextPath)
    } catch (err: any) {
  toast({ variant: "destructive", title: "Giriş başarısız", description: err?.message })
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Sol Taraf - Tanıtım Bölümü */}
        <div className="hidden lg:block space-y-8">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-primary/20 rounded-xl border border-primary/30">
                <Wallet className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">FinansPanel</h1>
                <p className="text-muted-foreground">Akıllı finans yönetimi</p>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground text-balance">
                Finansal geleceğinizi kontrol altına alın
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Gelir ve giderlerinizi takip edin, bütçe oluşturun ve finansal hedeflerinize ulaşın.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-card/50 rounded-lg border border-border/50">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="font-semibold text-foreground">Gelir Takibi</h3>
              </div>
              <p className="text-sm text-muted-foreground">Tüm gelir kaynaklarınızı tek yerden yönetin</p>
            </div>

            <div className="p-4 bg-card/50 rounded-lg border border-border/50">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="font-semibold text-foreground">Gider Analizi</h3>
              </div>
              <p className="text-sm text-muted-foreground">Harcamalarınızı kategorilere ayırın ve analiz edin</p>
            </div>

            <div className="p-4 bg-card/50 rounded-lg border border-border/50">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <PieChart className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Görsel Raporlar</h3>
              </div>
              <p className="text-sm text-muted-foreground">Finansal durumunuzu grafiklerle görselleştirin</p>
            </div>

            <div className="p-4 bg-card/50 rounded-lg border border-border/50">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-chart-3/20 rounded-lg">
                  <Shield className="h-5 w-5 text-chart-3" />
                </div>
                <h3 className="font-semibold text-foreground">Güvenli Veri</h3>
              </div>
              <p className="text-sm text-muted-foreground">Verileriniz şifrelenmiş ve güvenli ortamda saklanır</p>
            </div>
          </div>

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>10,000+ Aktif Kullanıcı</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>%99.9 Uptime</span>
            </div>
          </div>
        </div>

        {/* Sağ Taraf - Giriş Formu */}
        <div className="w-full max-w-md mx-auto">
          <Card className="border-border/50 shadow-2xl">
            <CardHeader className="space-y-4 text-center">
              <div className="flex justify-center lg:hidden">
                <div className="p-3 bg-primary/20 rounded-xl border border-primary/30">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
              </div>

              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  {isLogin ? "Hesabınıza Giriş Yapın" : "Yeni Hesap Oluşturun"}
                </CardTitle>
                <CardDescription className="text-base">
                  {isLogin ? "Finansal paneline erişim için giriş yapın" : "Finansal yolculuğunuza bugün başlayın"}
                </CardDescription>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant={isLogin ? "default" : "outline"} className="flex-1" onClick={() => setIsLogin(true)} disabled={loading}>
                  Giriş Yap
                </Button>
                <Button variant={!isLogin ? "default" : "outline"} className="flex-1" onClick={() => setIsLogin(false)} disabled={loading}>
                  Kayıt Ol
                </Button>
              </div>

              {/* Çevrimdışı Durum Göstergesi */}
              {!isOnline && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
                    <WifiOff className="h-4 w-4" />
                    <span className="text-sm font-medium">Çevrimdışı Mod</span>
                  </div>
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                    {isLogin ? "Daha önce giriş yaptıysanız çevrimdışı giriş yapabilirsiniz" : "Yeni hesap oluşturmak için internet bağlantısı gereklidir"}
                  </p>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium text-foreground">
                      Ad Soyad
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Adınızı ve soyadınızı girin"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-10 h-12 border-border/50 focus:border-primary"
                        required={!isLogin}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-foreground">
                    E-posta Adresi
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="ornek@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 border-border/50 focus:border-primary"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    Şifre
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={isLogin ? "Şifrenizi girin" : "Güçlü bir şifre oluşturun"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 border-border/50 focus:border-primary"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {!isLogin && (
                    <p className="text-xs text-muted-foreground">
                      En az 8 karakter, büyük harf, küçük harf ve rakam içermelidir
                    </p>
                  )}
                </div>

                {isLogin && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
                      />
                      <Label htmlFor="remember" className="text-sm text-muted-foreground">
                        Beni hatırla
                      </Label>
                    </div>
                    <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-medium">
                      Şifremi unuttum
                    </Link>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-semibold" 
                  disabled={loading || (!isOnline && !isLogin)}
                >
                  {loading ? "İşleniyor..." : 
                   !isOnline && !isLogin ? "İnternet Bağlantısı Gerekli" :
                   !isOnline && isLogin ? "Çevrimdışı Giriş Yap" :
                   isLogin ? "Giriş Yap" : "Hesap Oluştur"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground font-medium">veya</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-12 border-border/50 bg-transparent" 
                    onClick={() => handleOAuth("google")} 
                    disabled={loading || !isOnline}
                  >
                    <Chrome className="h-4 w-4 mr-2" />
                    Google
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-12 border-border/50 bg-transparent" 
                    onClick={() => handleOAuth("github")} 
                    disabled={loading || !isOnline}
                  >
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </Button>
                </div>
              </div>

              {!isLogin && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Hesap oluşturarak{" "}
                    <Link href="/terms" className="text-primary hover:text-primary/80 font-medium">
                      Kullanım Şartları
                    </Link>{" "}
                    ve{" "}
                    <Link href="/privacy" className="text-primary hover:text-primary/80 font-medium">
                      Gizlilik Politikası
                    </Link>
                    &apos;nı kabul etmiş olursunuz.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="text-center mt-6">
            <p className="text-sm text-muted-foreground">
              {isLogin ? "Hesabınız yok mu?" : "Zaten hesabınız var mı?"}{" "}
              <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:text-primary/80 font-medium">
                {isLogin ? "Kayıt olun" : "Giriş yapın"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>}>
      <LoginContent />
    </Suspense>
  )
}
