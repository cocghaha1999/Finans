/**
 * Admin Helper Functions
 * Handles user role management and permission checks
 */

import { db } from '@/lib/firebase'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { User } from 'firebase/auth'

export interface UserRole {
  uid: string
  email: string
  role: 'user' | 'admin' | 'superadmin'
  createdAt?: any
  updatedAt?: any
  status?: 'active' | 'inactive'
  emailVerified?: boolean
}

/**
 * Ensures user document exists with proper role
 */
export async function ensureUserRole(user: User): Promise<UserRole | null> {
  if (!db || !user) return null

  try {
    console.log('🔧 Ensuring user role for:', user.uid)
    
    const userDocRef = doc(db, 'users', user.uid)
    
    // Try to get document first
    let userDoc
    try {
      userDoc = await getDoc(userDocRef)
    } catch (getError) {
      console.warn('⚠️ Could not get user document, attempting to create:', getError)
      // If we can't get the document, try to create it
      const newUserData: UserRole = {
        uid: user.uid,
        email: user.email || '',
        role: 'user', // Default role
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        emailVerified: user.emailVerified || false
      }
      
      await setDoc(userDocRef, newUserData)
      console.log('✅ User document created successfully after error')
      return newUserData
    }
    
    if (!userDoc.exists()) {
      console.log('📝 Creating new user document...')
      const newUserData: UserRole = {
        uid: user.uid,
        email: user.email || '',
        role: 'user', // Default role
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'active',
        emailVerified: user.emailVerified || false
      }
      
      await setDoc(userDocRef, newUserData)
      console.log('✅ User document created successfully')
      return newUserData
    } else {
      const userData = userDoc.data() as UserRole
      console.log('✅ User document exists:', userData)
      
      // Update email verification status if changed
      if (userData.emailVerified !== user.emailVerified) {
        await setDoc(userDocRef, {
          emailVerified: user.emailVerified,
          updatedAt: serverTimestamp()
        }, { merge: true })
      }
      
      return userData
    }
  } catch (error) {
    console.error('❌ Error ensuring user role:', error)
    
    // If it's a permissions error, return a default user object
    if ((error as any)?.code === 'permission-denied') {
      console.log('🔄 Permissions denied, returning default user role')
      return {
        uid: user.uid,
        email: user.email || '',
        role: 'user',
        status: 'active',
        emailVerified: user.emailVerified || false
      }
    }
    
    return null
  }
}

/**
 * Safely checks if user is admin
 */
export async function checkAdminStatus(user: User | null): Promise<{
  isAdmin: boolean
  isSuperAdmin: boolean
  userRole: UserRole | null
  error?: string
}> {
  if (!user) {
    return { isAdmin: false, isSuperAdmin: false, userRole: null }
  }

  try {
    const userRole = await ensureUserRole(user)
    if (!userRole) {
      return { 
        isAdmin: false, 
        isSuperAdmin: false, 
        userRole: null,
        error: 'User document could not be created or accessed'
      }
    }

    const isAdmin = userRole.role === 'admin' || userRole.role === 'superadmin'
    const isSuperAdmin = userRole.role === 'superadmin'

    console.log(`🎯 Admin check result for ${user.email}: role=${userRole.role}, isAdmin=${isAdmin}, isSuperAdmin=${isSuperAdmin}`)

    return { isAdmin, isSuperAdmin, userRole }
  } catch (error) {
    console.error('❌ Admin status check failed:', error)
    
    // For development, if there's a permissions error, assume regular user
    if ((error as any)?.code === 'permission-denied') {
      console.log('🔄 Permissions denied in admin check, returning default user')
      const defaultUserRole: UserRole = {
        uid: user.uid,
        email: user.email || '',
        role: 'user',
        status: 'active',
        emailVerified: user.emailVerified || false
      }
      return { isAdmin: false, isSuperAdmin: false, userRole: defaultUserRole }
    }
    
    return { 
      isAdmin: false, 
      isSuperAdmin: false, 
      userRole: null,
      error: `Permission check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

/**
 * Makes current user admin (for development/testing)
 */
export async function makeUserAdmin(user: User, targetRole: 'admin' | 'superadmin' = 'admin'): Promise<boolean> {
  if (!db || !user) return false

  try {
    console.log(`🛠️ Making user ${user.email} a ${targetRole}...`)
    
    const userDocRef = doc(db, 'users', user.uid)
    
    // Try to update with merge
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email || '',
      role: targetRole,
      updatedAt: serverTimestamp(),
      status: 'active',
      emailVerified: user.emailVerified || false
    }, { merge: true })
    
    console.log(`✅ User ${user.email} is now a ${targetRole}`)
    return true
  } catch (error) {
    console.error('❌ Failed to make user admin:', error)
    
    // If permissions denied, try creating a new document
    if ((error as any)?.code === 'permission-denied') {
      try {
        console.log('🔄 Trying to create new admin document...')
        const userDocRef = doc(db, 'users', user.uid)
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email || '',
          role: targetRole,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          status: 'active',
          emailVerified: user.emailVerified || false
        })
        console.log(`✅ User ${user.email} admin document created successfully`)
        return true
      } catch (createError) {
        console.error('❌ Failed to create admin document:', createError)
        return false
      }
    }
    
    return false
  }
}