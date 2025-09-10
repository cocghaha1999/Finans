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
    // If Firebase auth is available, listen once; otherwise, fall back to offline user and end loading.
    let unsub: (() => void) | undefined

    if (auth?.onAuthStateChanged) {
      unsub = auth.onAuthStateChanged((u) => {
        setUser(u)
        // Online kullanıcı girişi yapıldığında çevrimdışı için kaydet
        if (u && isOnline) {
          saveOfflineUser(u, true) // rememberMe true olarak ayarlandı
        }
        setLoading(false)
      })
    } else {
      // No Firebase (e.g., missing env or static-only). Use offline user and stop loading.
      // Give a microtask tick to allow useOfflineAuth to hydrate from localStorage.
      const t = setTimeout(() => setLoading(false), 0)
      return () => clearTimeout(t)
    }

    return () => {
      if (typeof unsub === "function") unsub()
    }
  }, [isOnline, saveOfflineUser])

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
  const [waitedMs, setWaitedMs] = useState(0)

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
      // Oturum açma sayfasına yönlendir
      const qp = pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : ""
      router.replace(`/login${qp}`)
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

  if (!isReady) {
    // Beklerken kullanıcıya net mesaj göster
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <span>Oturum kontrol ediliyor…</span>
        <span className="text-xs opacity-70">Lütfen birkaç saniye bekleyin</span>
      </div>
    )
  }

  return <>{children}</>
}
