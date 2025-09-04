"use client"

import { useState, useRef, useEffect } from 'react'

export interface TouchGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onTap?: () => void
  onDoubleTap?: () => void
  onLongPress?: () => void
  swipeThreshold?: number
  longPressDelay?: number
}

export function useTouchGestures(options: TouchGestureOptions = {}) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    swipeThreshold = 50,
    longPressDelay = 500
  } = options

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastTapTimeRef = useRef<number>(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    // Long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        onLongPress()
        // Disable haptic feedback for long press to prevent dialog interference
        // if ('vibrate' in navigator) {
        //   navigator.vibrate(25)
        // }
      }, longPressDelay)
    }
  }

  const handleTouchMove = () => {
    // Cancel long press on move
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const deltaTime = Date.now() - touchStartRef.current.time

    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Swipe detection
    if (Math.max(absDeltaX, absDeltaY) > swipeThreshold) {
      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          onSwipeRight?.()
        } else {
          onSwipeLeft?.()
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          onSwipeDown?.()
        } else {
          onSwipeUp?.()
        }
      }
      return
    }

    // Tap detection (only if no swipe)
    if (deltaTime < 300) {
      const now = Date.now()
      const timeSinceLastTap = now - lastTapTimeRef.current

      if (timeSinceLastTap < 300 && onDoubleTap) {
        // Double tap
        onDoubleTap()
        lastTapTimeRef.current = 0 // Reset to prevent triple tap
      } else {
        // Single tap
        onTap?.()
        lastTapTimeRef.current = now
      }
    }

    touchStartRef.current = null
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }
}

// Pull to refresh hook
export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const touchStartRef = useRef<number>(0)
  const elementRef = useRef<HTMLElement | null>(null)

  const threshold = 100 // Minimum pull distance to trigger refresh

  const handleTouchStart = (e: React.TouchEvent) => {
    if (elementRef.current?.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === 0 || isRefreshing) return

    const currentY = e.touches[0].clientY
    const distance = currentY - touchStartRef.current

    if (distance > 0 && elementRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance, threshold * 1.5))
      e.preventDefault()
    }
  }

  const handleTouchEnd = async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      
      // Disable haptic feedback for pull to refresh to prevent dialog interference
      // if ('vibrate' in navigator) {
      //   navigator.vibrate(15)
      // }

      try {
        await onRefresh()
      } catch (error) {
        console.error('Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
    touchStartRef.current = 0
  }

  return {
    isRefreshing,
    pullDistance,
    elementRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  }
}

// Mobile-specific utilities
export const mobileUtils = {
  // Detect if device is mobile
  isMobile: () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  },

  // Detect if device supports touch
  isTouch: () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  },

  // Prevent zoom on double tap
  preventZoom: (element: HTMLElement) => {
    element.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    })
  },

  // Add haptic feedback with minimal intensity (almost disabled)
  haptic: (type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: 1,    // Minimal vibration
        medium: 2,   // Very light
        heavy: 5     // Still very light
      }
      navigator.vibrate(patterns[type])
    }
  },

  // Safe area insets for notched devices
  getSafeAreaInsets: () => {
    const style = getComputedStyle(document.documentElement)
    return {
      top: style.getPropertyValue('env(safe-area-inset-top)') || '0px',
      right: style.getPropertyValue('env(safe-area-inset-right)') || '0px',
      bottom: style.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
      left: style.getPropertyValue('env(safe-area-inset-left)') || '0px',
    }
  }
}
