"use client"

import React from 'react'
import { RefreshCw } from 'lucide-react'
import { usePullToRefresh } from '@/hooks/use-touch-gestures'

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void
  children: React.ReactNode
  className?: string
}

export function PullToRefresh({ onRefresh, children, className = "" }: PullToRefreshProps) {
  const { isRefreshing, pullDistance, elementRef, handlers } = usePullToRefresh(onRefresh)

  const threshold = 100
  const progress = Math.min(pullDistance / threshold, 1)
  const shouldTrigger = pullDistance >= threshold

  return (
    <div 
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`relative overflow-auto ${className}`}
      {...handlers}
    >
      {/* Pull indicator */}
      <div 
        className={`absolute top-0 left-0 right-0 z-50 flex items-center justify-center transition-all duration-200 ${
          pullDistance > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          height: Math.min(pullDistance, threshold * 1.2),
          transform: `translateY(${pullDistance > threshold ? 0 : pullDistance - threshold}px)`
        }}
      >
        <div className="bg-background/90 backdrop-blur-sm border rounded-full p-3 shadow-lg">
          <RefreshCw 
            className={`h-5 w-5 transition-all duration-200 ${
              isRefreshing ? 'animate-spin' : ''
            } ${
              shouldTrigger ? 'text-primary' : 'text-muted-foreground'
            }`}
            style={{
              transform: `rotate(${progress * 180}deg)`,
              opacity: progress
            }}
          />
        </div>
      </div>

      {/* Content with offset */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance > 0 ? Math.min(pullDistance * 0.5, 60) : 0}px)`
        }}
      >
        {children}
      </div>

      {/* Loading overlay */}
      {isRefreshing && (
        <div className="absolute top-4 left-0 right-0 z-40 flex justify-center">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Yenileniyor...</span>
          </div>
        </div>
      )}
    </div>
  )
}
