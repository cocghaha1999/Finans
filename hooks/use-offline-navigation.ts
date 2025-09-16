import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function useOfflineNavigation() {
  const router = useRouter()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const navigateTo = (path: string) => {
    try {
      router.push(path)
    } catch (error) {
      console.error('Navigation error:', error)
      // Fallback: window location change
      if (typeof window !== 'undefined') {
        window.location.href = path
      }
    }
  }

  return {
    navigateTo,
    isOnline,
    router
  }
}
