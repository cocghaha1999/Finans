"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { db } from "@/lib/firebase"
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/components/auth-guard"
import { Shield, AlertTriangle, CheckCircle } from "lucide-react"

interface UserData {
  id: string
  email: string
  displayName?: string
  photoURL?: string
  role?: string
  createdAt?: any
  lastLoginAt?: any
}

interface RoleChangeDialogProps {
  user: UserData | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoleChanged: () => void
}

const ROLES = [
  { value: 'user', label: 'Kullanıcı', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
  { value: 'admin', label: 'Admin', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'superadmin', label: 'Süper Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
]

export function RoleChangeDialog({ user, open, onOpenChange, onRoleChanged }: RoleChangeDialogProps) {
  const { user: currentUser } = useAuth()
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRoleChange = async () => {
    if (!user || !selectedRole || !db || !currentUser) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Kullanıcı rolünü güncelle
      await updateDoc(doc(db, 'users', user.id), {
        role: selectedRole,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid
      })
      
      // Admin log'u kaydet
      await addDoc(collection(db, 'admin-logs'), {
        action: 'role_change',
        targetUserId: user.id,
        targetUserEmail: user.email,
        oldRole: user.role || 'user',
        newRole: selectedRole,
        adminId: currentUser.uid,
        adminEmail: currentUser.email,
        timestamp: serverTimestamp(),
        details: `${user.email} kullanıcısının rolü ${user.role || 'user'} → ${selectedRole} olarak değiştirildi`
      })
      
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onRoleChanged()
        onOpenChange(false)
      }, 2000)
      
    } catch (err) {
      console.error('Rol değiştirme hatası:', err)
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return 'KU'
  }

  const getCurrentRoleInfo = () => {
    return ROLES.find(r => r.value === (user?.role || 'user'))
  }

  const getSelectedRoleInfo = () => {
    return ROLES.find(r => r.value === selectedRole)
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Kullanıcı Rolü Değiştir
          </DialogTitle>
          <DialogDescription>
            Kullanıcının sistem yetkilerini düzenleyin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Kullanıcı Bilgileri */}
          <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.photoURL} alt={user.displayName || user.email} />
              <AvatarFallback>
                {getInitials(user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{user.displayName || 'İsimsiz Kullanıcı'}</p>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              <div className="mt-1">
                <Badge className={getCurrentRoleInfo()?.color}>
                  Mevcut: {getCurrentRoleInfo()?.label}
                </Badge>
              </div>
            </div>
          </div>

          {/* Rol Seçimi */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Yeni Rol Seçin</label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Rol seçin..." />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={role.color} variant="outline">
                        {role.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Rol Değişiklik Önizlemesi */}
          {selectedRole && selectedRole !== (user.role || 'user') && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{user.displayName || user.email}</strong> kullanıcısının rolü{' '}
                <Badge className={getCurrentRoleInfo()?.color} variant="outline">
                  {getCurrentRoleInfo()?.label}
                </Badge>{' '}
                →{' '}
                <Badge className={getSelectedRoleInfo()?.color} variant="outline">
                  {getSelectedRoleInfo()?.label}
                </Badge>{' '}
                olarak değiştirilecek.
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Rol başarıyla değiştirildi!
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              İptal
            </Button>
            <Button 
              onClick={handleRoleChange}
              disabled={!selectedRole || selectedRole === (user.role || 'user') || loading}
            >
              {loading ? 'Değiştiriliyor...' : 'Rolü Değiştir'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}