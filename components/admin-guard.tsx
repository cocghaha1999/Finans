"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/auth-guard"
import { checkAdminStatus, makeUserAdmin } from "@/lib/admin-helper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, ArrowLeft, Settings, RefreshCw } from "lucide-react"

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
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <p className="text-muted-foreground">Yetki kontrol ediliyor...</p>
        </div>
      </div>
    )
  }

  // Giriş yapılmamış
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle>Giriş Gerekli</CardTitle>
            <CardDescription>Bu sayfaya erişmek için giriş yapmanız gerekiyor.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Giriş Yap
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Yetki kontrolü
  const hasRequiredPermission = requireSuperAdmin ? isSuperAdmin : isAdmin

  if (!hasRequiredPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-red-600 dark:text-red-400">Yetkisiz Erişim</CardTitle>
            <CardDescription>
              {error ? (
                <div className="text-left mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  <p className="font-semibold text-red-600 dark:text-red-400 mb-2">Hata Detayı:</p>
                  <p className="text-gray-700 dark:text-gray-300">{error}</p>
                </div>
              ) : (
                requireSuperAdmin ? 
                  "Bu sayfaya erişmek için süper admin yetkisi gerekiyor." :
                  "Bu sayfaya erişmek için admin yetkisi gerekiyor."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => router.push('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Ana Sayfaya Dön
            </Button>
            
            {/* Development helpers */}
            {process.env.NODE_ENV === 'development' && (
              <div className="border-t pt-3 space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Development Tools:</p>
                <Button onClick={handleMakeAdmin} variant="outline" size="sm" className="w-full">
                  <Settings className="h-4 w-4 mr-2" />
                  Make Me Admin
                </Button>
                <Button onClick={handleMakeSuperAdmin} variant="outline" size="sm" className="w-full">
                  <Shield className="h-4 w-4 mr-2" />
                  Make Me Super Admin
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin yetkisi var, children'ı render et
  return <>{children}</>
}