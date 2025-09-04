"use client"

import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Wifi, WifiOff, RefreshCw, Check, AlertCircle } from "lucide-react"

interface SyncStatusIndicatorProps {
  isOnline?: boolean
}

export function SyncStatusIndicator({ isOnline = true }: SyncStatusIndicatorProps) {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

  const handleSync = () => {
    setSyncStatus('syncing')
    setTimeout(() => {
      setSyncStatus(isOnline ? 'success' : 'error')
    }, 2000)
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="destructive" className="gap-1">
          <WifiOff className="h-3 w-3" />
          Çevrimdışı
        </Badge>
        <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncStatus === 'syncing'}>
          <RefreshCw className={`h-3 w-3 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={syncStatus === 'error' ? 'destructive' : 'secondary'} className="gap-1">
        <Wifi className="h-3 w-3" />
        Çevrimiçi
      </Badge>
      <Button size="sm" variant="ghost" onClick={handleSync} disabled={syncStatus === 'syncing'}>
        {syncStatus === 'syncing' ? (
          <RefreshCw className="h-3 w-3 animate-spin" />
        ) : syncStatus === 'success' ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : syncStatus === 'error' ? (
          <AlertCircle className="h-3 w-3 text-red-500" />
        ) : (
          <RefreshCw className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}
