"use client"

import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from 'framer-motion'
import { useEffect, useState } from 'react'

// Animation Presets
export const animationPresets = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
  },

  // Card animations
  cardHover: {
    whileHover: { 
      scale: 1.02, 
      y: -4,
      boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
    },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }
  },

  // Button animations
  buttonPress: {
    whileTap: { scale: 0.95 },
    whileHover: { scale: 1.05 },
    transition: { duration: 0.1, ease: [0.4, 0.0, 0.2, 1] }
  },

  // List animations
  listItem: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: 0.2 }
  },

  // Modal animations
  modal: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }
  },

  // Slide animations
  slideUp: {
    initial: { opacity: 0, y: 50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
  },

  slideDown: {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -50 },
    transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
  },

  // Fade animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 }
  },

  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.2, ease: [0.4, 0.0, 0.2, 1] }
  },

  // Stagger animations for lists
  staggerContainer: {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }
}

// Animated Page Wrapper
export function AnimatedPage({ 
  children, 
  className = "",
  animation = "pageTransition" 
}: { 
  children: React.ReactNode
  className?: string
  animation?: "pageTransition" | "slideUp" | "slideDown" | "fadeIn" | "scaleIn"
}) {
  const animations = {
    pageTransition: animationPresets.pageTransition,
    slideUp: animationPresets.slideUp,
    slideDown: animationPresets.slideDown,
    fadeIn: animationPresets.fadeIn,
    scaleIn: animationPresets.scaleIn
  }
  
  const preset = animations[animation]
  
  return (
    <motion.div
      className={className}
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={preset.transition}
    >
      {children}
    </motion.div>
  )
}

// Animated Card Component
export function AnimatedCard({ 
  children, 
  className = "",
  onClick,
  animate = true 
}: { 
  children: React.ReactNode
  className?: string
  onClick?: () => void
  animate?: boolean
}) {
  const cardProps = animate ? animationPresets.cardHover : {}
  
  return (
    <motion.div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
      onClick={onClick}
      {...cardProps}
    >
      {children}
    </motion.div>
  )
}

// Animated List Component
export function AnimatedList({ 
  children, 
  className = "",
  stagger = true 
}: { 
  children: React.ReactNode
  className?: string
  stagger?: boolean
}) {
  const containerProps = stagger ? animationPresets.staggerContainer : {}
  
  return (
    <motion.div
      className={className}
      {...containerProps}
    >
      {children}
    </motion.div>
  )
}

// Animated List Item
export function AnimatedListItem({ 
  children, 
  className = "",
  index = 0 
}: { 
  children: React.ReactNode
  className?: string
  index?: number
}) {
  return (
    <motion.div
      className={className}
      initial={animationPresets.listItem.initial}
      animate={animationPresets.listItem.animate}
      exit={animationPresets.listItem.exit}
      transition={{
        ...animationPresets.listItem.transition,
        delay: index * 0.05
      }}
    >
      {children}
    </motion.div>
  )
}

// Animated Button
export function AnimatedButton({ 
  children, 
  className = "",
  onClick,
  disabled = false,
  variant = "default"
}: { 
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  variant?: string
}) {
  return (
    <motion.button
      className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background ${className}`}
      onClick={onClick}
      disabled={disabled}
      {...(disabled ? {} : animationPresets.buttonPress)}
    >
      {children}
    </motion.button>
  )
}

// Loading Animation
export function LoadingSpinner({ size = 20, className = "" }: { size?: number, className?: string }) {
  return (
    <motion.div
      className={`inline-block border-2 border-current border-t-transparent rounded-full ${className}`}
      style={{ width: size, height: size }}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    />
  )
}

// Pulse Animation
export function PulseAnimation({ 
  children, 
  className = "",
  duration = 2 
}: { 
  children: React.ReactNode
  className?: string
  duration?: number
}) {
  return (
    <motion.div
      className={className}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  )
}

// Success Checkmark Animation
export function SuccessCheck({ 
  size = 24, 
  className = "",
  show = false 
}: { 
  size?: number
  className?: string
  show?: boolean
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`inline-flex items-center justify-center rounded-full bg-green-500 text-white ${className}`}
          style={{ width: size, height: size }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <motion.svg
            width={size * 0.6}
            height={size * 0.6}
            viewBox="0 0 24 24"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <motion.path
              d="M20 6L9 17l-5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Counter Animation
export function AnimatedCounter({ 
  value, 
  duration = 1,
  className = "" 
}: { 
  value: number
  duration?: number
  className?: string
}) {
  const [displayValue, setDisplayValue] = useState(0)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      const increment = value / (duration * 60) // 60fps
      let current = 0
      
      const interval = setInterval(() => {
        current += increment
        if (current >= value) {
          setDisplayValue(value)
          clearInterval(interval)
        } else {
          setDisplayValue(Math.floor(current))
        }
      }, 1000 / 60)
      
      return () => clearInterval(interval)
    }, 100)
    
    return () => clearTimeout(timer)
  }, [value, duration])
  
  return (
    <motion.span
      className={className}
      key={value}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue.toLocaleString('tr-TR')}
    </motion.span>
  )
}

// Progress Bar Animation
export function AnimatedProgressBar({ 
  progress, 
  className = "",
  showPercentage = true 
}: { 
  progress: number
  className?: string
  showPercentage?: boolean
}) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
      <motion.div
        className="bg-blue-500 h-2 rounded-full relative"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {showPercentage && (
          <motion.span
            className="absolute -top-6 right-0 text-xs font-medium"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {Math.round(progress)}%
          </motion.span>
        )}
      </motion.div>
    </div>
  )
}

// Ripple Effect Hook
export function useRipple() {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

  const createRipple = (event: React.MouseEvent) => {
    const button = event.currentTarget
    const rect = button.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const id = Date.now()

    setRipples(prev => [...prev, { x, y, id }])

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id))
    }, 600)
  }

  const RippleContainer = () => (
    <div className="absolute inset-0 overflow-hidden rounded-inherit pointer-events-none">
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            className="absolute bg-white/20 rounded-full"
            style={{
              left: ripple.x - 10,
              top: ripple.y - 10,
              width: 20,
              height: 20,
            }}
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </div>
  )

  return { createRipple, RippleContainer }
}
