import { useState, useEffect } from 'react'
import { User } from 'firebase/auth'

interface OfflineUser {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  lastLoginTime: number
  rememberMe: boolean
}

export function useOfflineAuth() {
  const [offlineUser, setOfflineUser] = useState<OfflineUser | null>(null)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOnline(navigator.onLine)

    // Çevrimdışı kullanıcı verilerini yükle
    loadOfflineUser()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadOfflineUser = () => {
    try {
      const storedUser = localStorage.getItem('costik-offline-user')
      if (storedUser) {
        const user: OfflineUser = JSON.parse(storedUser)
        // 7 gün geçmişse oturumu sonlandır (rememberMe false ise)
        const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
        const now = Date.now()
        
        if (user.rememberMe || (now - user.lastLoginTime) < sevenDaysInMs) {
          setOfflineUser(user)
        } else {
          clearOfflineUser()
        }
      }
    } catch (error) {
      console.error('Çevrimdışı kullanıcı yüklenirken hata:', error)
    }
  }

  const saveOfflineUser = (user: User, rememberMe: boolean = false) => {
    try {
      const offlineUserData: OfflineUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLoginTime: Date.now(),
        rememberMe
      }
      localStorage.setItem('costik-offline-user', JSON.stringify(offlineUserData))
      setOfflineUser(offlineUserData)
    } catch (error) {
      console.error('Çevrimdışı kullanıcı kaydedilirken hata:', error)
    }
  }

  const clearOfflineUser = () => {
    try {
      localStorage.removeItem('costik-offline-user')
      setOfflineUser(null)
    } catch (error) {
      console.error('Çevrimdışı kullanıcı silinirken hata:', error)
    }
  }

  const loginOffline = (email: string, password: string, rememberMe: boolean = false): boolean => {
    // Bu basit bir demo implementasyonu
    // Gerçek uygulamada daha güvenli bir yöntem kullanmalısınız
    try {
      const savedCredentials = localStorage.getItem('costik-saved-credentials')
      if (savedCredentials) {
        const credentials = JSON.parse(savedCredentials)
        if (credentials.email === email && credentials.password === password) {
          const mockUser: OfflineUser = {
            uid: credentials.uid || 'offline-user-' + Date.now(),
            email: email,
            displayName: credentials.displayName || email.split('@')[0],
            photoURL: null,
            lastLoginTime: Date.now(),
            rememberMe
          }
          localStorage.setItem('costik-offline-user', JSON.stringify(mockUser))
          setOfflineUser(mockUser)
          return true
        }
      }
      return false
    } catch (error) {
      console.error('Çevrimdışı giriş hatası:', error)
      return false
    }
  }

  const saveCredentialsForOffline = (user: User, email: string, password: string) => {
    try {
      const credentials = {
        uid: user.uid,
        email: email,
        password: password, // Gerçek uygulamada şifrelenmeli!
        displayName: user.displayName
      }
      localStorage.setItem('costik-saved-credentials', JSON.stringify(credentials))
    } catch (error) {
      console.error('Kimlik bilgileri kaydedilirken hata:', error)
    }
  }

  return {
    offlineUser,
    isOnline,
    saveOfflineUser,
    clearOfflineUser,
    loginOffline,
    saveCredentialsForOffline,
    loadOfflineUser
  }
}
