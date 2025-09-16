"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-guard"
import { checkAdminStatus, makeUserAdmin } from "@/lib/admin-helper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, ArrowLeft, Settings } from "lucide-react"

interface AdminGuardProps {
  children: React.ReactNode
  requireSuperAdmin?: boolean
}

export function AdminGuard({ children, requireSuperAdmin = false }: AdminGuardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAdminAccess = async () => {
      if (!user?.uid) {
        setLoading(false)
        return
      }

      console.log('🔍 Starting admin access check for:', user.email)
      
      const result = await checkAdminStatus(user)
      
      setIsAdmin(result.isAdmin)
      setIsSuperAdmin(result.isSuperAdmin)
      setError(result.error || null)
      setLoading(false)
      
      if (result.error) {
        console.error('❌ Admin check failed:', result.error)
      } else {
        console.log('✅ Admin check completed:', {
          isAdmin: result.isAdmin,
          isSuperAdmin: result.isSuperAdmin,
          role: result.userRole?.role
        })
      }
    }

    checkAdminAccess()
  }, [user?.uid])

  // Development helper to make user admin
  const handleMakeAdmin = async () => {
    if (user && await makeUserAdmin(user, 'admin')) {
      window.location.reload() // Refresh to update permissions
    }
  }

  const handleMakeSuperAdmin = async () => {
    if (user && await makeUserAdmin(user, 'superadmin')) {
      window.location.reload() // Refresh to update permissions
    }
  }

  // Loading durumu
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Yetkilendirme kontrol ediliyor...</p>
        </div>
      </div>
    )
  }

  // Kullanıcı giriş yapmamış
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Giriş Gerekli</CardTitle>
            <CardDescription>
              Admin paneline erişmek için önce giriş yapmanız gerekiyor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => router.push('/login')} 
              className="w-full"
            >
              Giriş Yap
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // SuperAdmin gerekli ama kullanıcı SuperAdmin değil
  if (requireSuperAdmin && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Süper Yönetici Yetkisi Gerekli</CardTitle>
            <CardDescription>
              Bu sayfaya erişmek için süper yönetici yetkisine sahip olmanız gerekiyor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              Mevcut rol: {isAdmin ? 'Yönetici' : 'Kullanıcı'}
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/admin')} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Admin Paneline Dön
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin yetkisi gerekli ama kullanıcı admin değil
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle>Yetki Hatası</CardTitle>
            <CardDescription>
              Admin paneline erişmek için yönetici yetkisine sahip olmanız gerekiyor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground text-center">
              Hesabınız: {user.email}
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/')} 
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Kullanıcı yetkili, admin panelini göster
  return <>{children}</>
}

// Admin durumunu kontrol eden hook
export function useAdminStatus() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user?.uid) {
        setIsAdmin(false)
        setIsSuperAdmin(false)
        setLoading(false)
        return
      }

      try {
        console.log('Hook admin check başlıyor, user UID:', user.uid)
        const userDoc = await getDoc(doc(db!, 'users', user.uid))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          console.log('Hook User data:', userData)
          const userRole = userData.role || 'user'
          const userIsAdmin = userRole === 'admin' || userRole === 'superadmin'
          const userIsSuperAdmin = userRole === 'superadmin'
          
          console.log('Hook User role:', userRole, 'isAdmin:', userIsAdmin, 'isSuperAdmin:', userIsSuperAdmin)
          
          setIsAdmin(userIsAdmin)
          setIsSuperAdmin(userIsSuperAdmin)
        } else {
          console.log('Hook User document bulunamadı!')
          setIsAdmin(false)
          setIsSuperAdmin(false)
        }
      } catch (error) {
        console.error('Hook admin status check hatası:', error)
        setIsAdmin(false)
        setIsSuperAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user?.uid])

  return { isAdmin, isSuperAdmin, loading }
}