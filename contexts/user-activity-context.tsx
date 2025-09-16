"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { db } from '@/lib/firebase'
import { collection, doc, updateDoc, serverTimestamp, onSnapshot, query, where, orderBy, limit, addDoc } from 'firebase/firestore'
import { useAuth } from '@/components/auth-guard'

interface UserActivity {
  id: string
  userId: string
  action: string
  description: string
  timestamp: Date
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

interface UserActivityContextType {
  activities: UserActivity[]
  logActivity: (action: string, description: string, metadata?: Record<string, any>) => Promise<void>
  updateUserLastSeen: () => Promise<void>
  getUserActivities: (userId: string, limitCount?: number) => Promise<UserActivity[]>
  isLoading: boolean
}

const UserActivityContext = createContext<UserActivityContextType | undefined>(undefined)

export function UserActivityProvider({ children }: { children: ReactNode }) {
  const [activities, setActivities] = useState<UserActivity[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { user } = useAuth()

  // Log user activity
  const logActivity = async (action: string, description: string, metadata?: Record<string, any>) => {
    if (!user?.uid) return

    try {
      const activityData = {
        userId: user.uid,
        action,
        description,
        timestamp: serverTimestamp(),
        ipAddress: await getClientIP(),
        userAgent: navigator.userAgent,
        metadata: metadata || {}
      }

      // Add to activities collection
      await addDoc(collection(db!, 'user_activities'), activityData)
      
      // Update user's last activity
      await updateUserLastSeen()
    } catch (error) {
      console.error('Error logging activity:', error)
    }
  }

  // Update user's last seen timestamp
  const updateUserLastSeen = async () => {
    if (!user?.uid) return

    try {
      const userRef = doc(db!, 'users', user.uid)
      await updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        isOnline: true
      })
    } catch (error) {
      console.error('Error updating last seen:', error)
    }
  }

  // Get user activities
  const getUserActivities = async (userId: string, limitCount: number = 50) => {
    setIsLoading(true)
    try {
      const q = query(
        collection(db!, 'user_activities'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )

      return new Promise<UserActivity[]>((resolve) => {
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const activities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
          })) as UserActivity[]
          
          setActivities(activities)
          resolve(activities)
          setIsLoading(false)
        })
      })
    } catch (error) {
      console.error('Error getting user activities:', error)
      setIsLoading(false)
      return []
    }
  }

  // Get client IP address
  const getClientIP = async (): Promise<string> => {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      return data.ip
    } catch (error) {
      return 'Unknown'
    }
  }

  // Auto-log page visits and user actions
  useEffect(() => {
    if (!user?.uid) return

    // Log page visit
    logActivity('page_visit', `Visited ${window.location.pathname}`, {
      path: window.location.pathname,
      referrer: document.referrer
    })

    // Update online status
    updateUserLastSeen()

    // Track user interaction
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        const buttonText = target.textContent || target.closest('button')?.textContent || 'Unknown button'
        logActivity('button_click', `Clicked: ${buttonText}`, {
          element: target.tagName,
          path: window.location.pathname
        })
      }
    }

    const handleBeforeUnload = () => {
      // Mark user as offline when leaving
      if (user?.uid) {
        const userRef = doc(db!, 'users', user.uid)
        updateDoc(userRef, { isOnline: false })
      }
    }

    document.addEventListener('click', handleClick)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('click', handleClick)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [user?.uid])

  // Set user offline when component unmounts
  useEffect(() => {
    return () => {
      if (user?.uid) {
        const userRef = doc(db!, 'users', user.uid)
        updateDoc(userRef, { isOnline: false })
      }
    }
  }, [user?.uid])

  return (
    <UserActivityContext.Provider value={{
      activities,
      logActivity,
      updateUserLastSeen,
      getUserActivities,
      isLoading
    }}>
      {children}
    </UserActivityContext.Provider>
  )
}

export function useUserActivity() {
  const context = useContext(UserActivityContext)
  if (context === undefined) {
    throw new Error('useUserActivity must be used within a UserActivityProvider')
  }
  return context
}

// Activity tracking hooks for common actions
export const useActivityLogger = () => {
  const { logActivity } = useUserActivity()

  const logTransaction = (type: 'income' | 'expense', amount: number, category: string) => {
    logActivity('transaction_added', `Added ${type}: ₺${amount}`, {
      type,
      amount,
      category
    })
  }

  const logBudgetUpdate = (budgetName: string, amount: number) => {
    logActivity('budget_updated', `Updated budget: ${budgetName}`, {
      budgetName,
      amount
    })
  }

  const logSettingsChange = (setting: string, oldValue: any, newValue: any) => {
    logActivity('settings_changed', `Changed ${setting}`, {
      setting,
      oldValue,
      newValue
    })
  }

  const logError = (error: string, context: string) => {
    logActivity('error_occurred', `Error: ${error}`, {
      error,
      context,
      severity: 'error'
    })
  }

  return {
    logTransaction,
    logBudgetUpdate,
    logSettingsChange,
    logError
  }
}