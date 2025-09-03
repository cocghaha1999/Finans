"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth } from "@/lib/firebase"
import { useOfflineAuth } from "@/hooks/use-offline-auth"
import type { User } from "firebase/auth"

type AuthContextType = {
  user: User | null
  isOffline?: boolean
  offlineUser?: any
}

const AuthContext = createContext<AuthContextType>({ user: null })

export const useAuth = () => useContext(AuthContext)

type Props = {
  children: React.ReactNode
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const { offlineUser, isOnline, saveOfflineUser } = useOfflineAuth()

  useEffect(() => {
    const unsubscribe = auth?.onAuthStateChanged?.((user) => {
      setUser(user)
      // Online kullanıcı girişi yapıldığında çevrimdışı için kaydet
      if (user && isOnline) {
        saveOfflineUser(user, true) // rememberMe true olarak ayarlandı
      }
      setLoading(false)
    })

    return () => {
      if (typeof unsubscribe === "function") unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ 
      user: user || (offlineUser ? {
        uid: offlineUser.uid,
        email: offlineUser.email,
        displayName: offlineUser.displayName,
        photoURL: offlineUser.photoURL
      } as User : null), 
      isOffline: !isOnline,
      offlineUser 
    }}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center text-muted-foreground">
          Yükleniyor...
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  )
}

export function AuthGuard({ children }: Props) {
  const { user, isOffline, offlineUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Login sayfasında AuthGuard kontrolü yapmayın
    if (pathname === '/login') {
      setIsReady(true)
      return
    }

    // AuthProvider'dan gelen kullanıcı durumunu bekleyin
    if (user === undefined) return

    // Online kullanıcı veya çevrimdışı kullanıcı var mı kontrol et
    const hasValidUser = user || (isOffline && offlineUser)

    if (!hasValidUser) {
      // Tüm sayfalar için authentication zorunlu - Login'e yönlendir
      const qp = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${qp}`)
      return
    } else {
      setIsReady(true)
      // Grafiklerin yeniden hesaplanması için yeniden boyutlandırma olayını tetikle
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("resize"))
        }
      }, 50)
    }
  }, [user, isOffline, offlineUser, router, pathname])

  // Login sayfasında her zaman içeriği göster
  if (pathname === '/login') {
    return <>{children}</>
  }

  // Authentication kontrolü tamamlanana kadar loading göster
  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Oturum kontrol ediliyor...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
