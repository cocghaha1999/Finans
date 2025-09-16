"use client"

import { useEffect, useState, createContext, useContext } from "react"
import { useRouter, usePathname } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { useOfflineAuth } from "@/hooks/use-offline-auth"
import type { User } from "firebase/auth"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"

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

  // Kullanıcı document'i oluşturma/kontrol etme fonksiyonu
  const ensureUserDocument = async (user: User) => {
    if (!db || !user) return
    
    try {
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        // User document yoksa oluştur
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          role: 'user', // Varsayılan rol
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'active',
          emailVerified: user.emailVerified,
          photoURL: user.photoURL || null
        })
        console.log('User document created for existing user:', user.uid)
      } else {
        // Document varsa güncelle
        await setDoc(userDocRef, {
          updatedAt: serverTimestamp(),
          emailVerified: user.emailVerified,
          displayName: user.displayName || '',
          photoURL: user.photoURL || null
        }, { merge: true })
      }
    } catch (error) {
      console.error('Error ensuring user document:', error)
    }
  }

  useEffect(() => {
    // If Firebase auth is available, listen once; otherwise, fall back to offline user and end loading.
    let unsub: (() => void) | undefined

    if (auth?.onAuthStateChanged) {
      unsub = auth.onAuthStateChanged(async (u) => {
        setUser(u)
        // Online kullanıcı girişi yapıldığında çevrimdışı için kaydet
        if (u && isOnline) {
          saveOfflineUser(u, true) // rememberMe true olarak ayarlandı
          // User document'ini kontrol et/oluştur
          await ensureUserDocument(u)
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
  }, []) // dependency array'i boşalttık

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
  const [redirectArmed, setRedirectArmed] = useState(false)

  // Normalize path to avoid trailingSlash differences (e.g., "/login" vs "/login/")
  const normalizedPath = (pathname || "").replace(/\/+$/, "") || "/"
  const isLoginRoute = normalizedPath === "/login"

  useEffect(() => {
    // Login sayfasında AuthGuard kontrolü yapmayın
    if (isLoginRoute) {
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
      const target = `/login/${qp}`.replace(/\?\//, "?")
      router.replace(target)

      // Eğer client-side navigation ilerlemezse sert yönlendirme uygula (PWA/cache durumları için)
      if (!redirectArmed) {
        setRedirectArmed(true)
        const t = setTimeout(() => {
          if (typeof window !== "undefined" && !isLoginRoute) {
            window.location.assign(target)
          }
        }, 1200)
        return () => clearTimeout(t)
      }
    } else {
      setIsReady(true)
      // Grafiklerin yeniden hesaplanması için yeniden boyutlandırma olayını tetikle
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("resize"))
        }
      }, 50)
    }
  }, [user, isOffline, offlineUser, isLoginRoute]) // router ve pathname'i çıkardık

  // Login sayfasında her zaman içeriği göster
  if (isLoginRoute) {
    return <>{children}</>
  }

  if (!isReady) {
    // Beklerken kullanıcıya net mesaj ve elle girişe gitme imkanı göster
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center text-muted-foreground gap-2">
        <span>Oturum kontrol ediliyor…</span>
        <span className="text-xs opacity-70">Lütfen birkaç saniye bekleyin</span>
        <a href="/login/" className="mt-2 text-primary text-sm underline">Giriş sayfasına git</a>
      </div>
    )
  }

  return <>{children}</>
}
