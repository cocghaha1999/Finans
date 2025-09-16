import { useState, useEffect } from 'react'
import { safeJsonParse } from '@/lib/utils'

interface UseOfflineStorageProps<T> {
  key: string
  defaultValue: T
}

export function useOfflineStorage<T>({ key, defaultValue }: UseOfflineStorageProps<T>) {
  const [data, setData] = useState<T>(defaultValue)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Çevrimiçi durumu kontrol et
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOnline(navigator.onLine)

    // Local Storage'dan veri yükle
    const loadFromStorage = () => {
      try {
        const item = localStorage.getItem(key)
        if (item) {
          setData(safeJsonParse(item, {} as T))
        }
      } catch (error) {
        console.error('Çevrimdışı veri yüklenirken hata:', error)
      }
    }

    loadFromStorage()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [key])

  const saveData = (newData: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(newData))
      setData(newData)
    } catch (error) {
      console.error('Çevrimdışı veri kaydedilirken hata:', error)
    }
  }

  const clearData = () => {
    try {
      localStorage.removeItem(key)
      setData(defaultValue)
    } catch (error) {
      console.error('Çevrimdışı veri silinirken hata:', error)
    }
  }

  return {
    data,
    saveData,
    clearData,
    isOnline,
  }
}

// PWA Install promptu için hook
export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [isInstallable, setIsInstallable] = useState(false)

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const installApp = async () => {
    if (!installPrompt) return false

    try {
      await installPrompt.prompt()
      const choiceResult = await installPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        setIsInstallable(false)
        setInstallPrompt(null)
        return true
      }
    } catch (error) {
      console.error('Uygulama yüklenirken hata:', error)
    }
    
    return false
  }

  return {
    isInstallable,
    installApp,
  }
}
