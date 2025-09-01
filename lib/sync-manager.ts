export interface SyncQueueItem {
  id: string
  action: 'create' | 'update' | 'delete'
  type: 'transaction' | 'payment' | 'card' | 'budget'
  data: any
  timestamp: number
  retryCount: number
  lastError?: string
}

export interface ConflictResolution {
  strategy: 'local' | 'remote' | 'merge' | 'manual'
  data?: any
}

export interface SyncStatus {
  isOnline: boolean
  isSyncing: boolean
  queueSize: number
  lastSyncTime?: Date
  errors: string[]
}

export class SyncManager {
  private static instance: SyncManager
  private syncQueue: SyncQueueItem[] = []
  private isProcessing = false
  private retryDelay = 1000 // Start with 1 second
  private maxRetries = 3
  private listeners: Array<(status: SyncStatus) => void> = []

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  private constructor() {
    this.loadQueue()
    this.startSyncProcess()
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.processSyncQueue()
    })

    window.addEventListener('offline', () => {
      this.notifyListeners()
    })
  }

  // Add item to sync queue
  addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): void {
    const queueItem: SyncQueueItem = {
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0
    }

    this.syncQueue.push(queueItem)
    this.saveQueue()
    this.notifyListeners()

    // Process immediately if online
    if (navigator.onLine) {
      this.processSyncQueue()
    }
  }

  // Process sync queue
  private async processSyncQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine || this.syncQueue.length === 0) {
      return
    }

    this.isProcessing = true
    this.notifyListeners()

    const item = this.syncQueue[0]

    try {
      await this.processItem(item)
      
      // Success - remove from queue
      this.syncQueue.shift()
      this.retryDelay = 1000 // Reset delay on success
      
    } catch (error) {
      console.error('Sync failed for item:', item.id, error)
      
      // Increment retry count
      item.retryCount++
      item.lastError = error instanceof Error ? error.message : 'Unknown error'

      if (item.retryCount >= this.maxRetries) {
        // Max retries reached - remove from queue and log error
        this.syncQueue.shift()
        console.error('Max retries reached for sync item:', item.id)
      } else {
        // Exponential backoff
        this.retryDelay = Math.min(this.retryDelay * 2, 30000) // Max 30 seconds
      }
    }

    this.saveQueue()
    this.isProcessing = false
    this.notifyListeners()

    // Continue processing if there are more items
    if (this.syncQueue.length > 0) {
      setTimeout(() => {
        this.processSyncQueue()
      }, this.retryDelay)
    }
  }

  // Process individual sync item
  private async processItem(item: SyncQueueItem): Promise<void> {
    // Import Firebase functions dynamically to avoid SSR issues
    const { 
      addTransaction, 
      upsertTransaction, 
      removeTransaction
    } = await import('@/lib/db')

    const userId = localStorage.getItem('userId')
    if (!userId) {
      throw new Error('No user ID available')
    }

    switch (item.type) {
      case 'transaction':
        switch (item.action) {
          case 'create':
            await addTransaction(userId, item.data)
            break
          case 'update':
            await upsertTransaction(userId, item.data)
            break
          case 'delete':
            await removeTransaction(userId, item.data.id)
            break
        }
        break

      // Payments and cards can be added later
      case 'payment':
      case 'card':
      case 'budget':
        console.log(`Sync for ${item.type} not implemented yet`)
        break

      default:
        throw new Error(`Unsupported sync type: ${item.type}`)
    }
  }

  // Conflict resolution
  async resolveConflict(
    localData: any, 
    remoteData: any, 
    type: string
  ): Promise<ConflictResolution> {
    // Simple timestamp-based resolution for now
    // In a real app, you might want to show a UI for manual resolution
    
    const localTimestamp = localData.updatedAt || localData.createdAt || 0
    const remoteTimestamp = remoteData.updatedAt || remoteData.createdAt || 0

    if (localTimestamp > remoteTimestamp) {
      return { strategy: 'local' }
    } else if (remoteTimestamp > localTimestamp) {
      return { strategy: 'remote' }
    } else {
      // Same timestamp - merge if possible
      return {
        strategy: 'merge',
        data: this.mergeData(localData, remoteData, type)
      }
    }
  }

  // Simple data merging
  private mergeData(localData: any, remoteData: any, type: string): any {
    // For now, prefer local changes for most fields
    // but keep remote metadata
    return {
      ...remoteData,
      ...localData,
      // Always use remote metadata
      id: remoteData.id,
      createdAt: remoteData.createdAt,
      updatedAt: Math.max(localData.updatedAt || 0, remoteData.updatedAt || 0)
    }
  }

  // Data versioning
  private addVersion(data: any): any {
    return {
      ...data,
      version: (data.version || 0) + 1,
      updatedAt: Date.now()
    }
  }

  // Change tracking
  trackChange(type: 'transaction' | 'payment' | 'card', action: 'create' | 'update' | 'delete', data: any): void {
    // Add to local change log
    const changes = this.getLocalChanges()
    changes.push({
      type,
      action,
      data: this.addVersion(data),
      timestamp: Date.now()
    })
    
    localStorage.setItem('sync-changes', JSON.stringify(changes.slice(-100))) // Keep last 100 changes
    
    // Add to sync queue if online
    this.addToQueue({ type, action, data })
  }

  private getLocalChanges(): any[] {
    const stored = localStorage.getItem('sync-changes')
    return stored ? JSON.parse(stored) : []
  }

  // Queue management
  private loadQueue(): void {
    const stored = localStorage.getItem('sync-queue')
    if (stored) {
      try {
        this.syncQueue = JSON.parse(stored)
      } catch (e) {
        console.error('Failed to load sync queue:', e)
        this.syncQueue = []
      }
    }
  }

  private saveQueue(): void {
    localStorage.setItem('sync-queue', JSON.stringify(this.syncQueue))
  }

  private startSyncProcess(): void {
    // Process queue periodically
    setInterval(() => {
      if (navigator.onLine && this.syncQueue.length > 0) {
        this.processSyncQueue()
      }
    }, 5000) // Check every 5 seconds
  }

  // Status and listeners
  addListener(listener: (status: SyncStatus) => void): void {
    this.listeners.push(listener)
  }

  removeListener(listener: (status: SyncStatus) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener)
  }

  private notifyListeners(): void {
    const status: SyncStatus = {
      isOnline: navigator.onLine,
      isSyncing: this.isProcessing,
      queueSize: this.syncQueue.length,
      lastSyncTime: this.syncQueue.length === 0 ? new Date() : undefined,
      errors: this.syncQueue
        .filter(item => item.lastError)
        .map(item => item.lastError!)
    }

    this.listeners.forEach(listener => {
      try {
        listener(status)
      } catch (e) {
        console.error('Sync listener error:', e)
      }
    })
  }

  // Public methods
  getStatus(): SyncStatus {
    return {
      isOnline: navigator.onLine,
      isSyncing: this.isProcessing,
      queueSize: this.syncQueue.length,
      lastSyncTime: this.syncQueue.length === 0 ? new Date() : undefined,
      errors: this.syncQueue
        .filter(item => item.lastError)
        .map(item => item.lastError!)
    }
  }

  async forceSyncNow(): Promise<void> {
    if (navigator.onLine) {
      await this.processSyncQueue()
    }
  }

  clearQueue(): void {
    this.syncQueue = []
    this.saveQueue()
    this.notifyListeners()
  }

  getQueueItems(): SyncQueueItem[] {
    return [...this.syncQueue]
  }
}

// Hook for React components
export const useSync = () => {
  const manager = SyncManager.getInstance()
  
  return {
    addToQueue: manager.addToQueue.bind(manager),
    trackChange: manager.trackChange.bind(manager),
    getStatus: manager.getStatus.bind(manager),
    forceSyncNow: manager.forceSyncNow.bind(manager),
    clearQueue: manager.clearQueue.bind(manager),
    getQueueItems: manager.getQueueItems.bind(manager),
    addListener: manager.addListener.bind(manager),
    removeListener: manager.removeListener.bind(manager)
  }
}
