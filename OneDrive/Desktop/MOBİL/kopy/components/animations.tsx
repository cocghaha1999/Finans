"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// Smooth fade in animation
export const FadeIn = ({ 
  children, 
  delay = 0, 
  duration = 0.3,
  className = ""
}: { 
  children: React.ReactNode
  delay?: number
  duration?: number
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ 
      duration, 
      delay,
      ease: [0.16, 1, 0.3, 1]
    }}
    className={className}
  >
    {children}
  </motion.div>
)

// Slide up animation
export const SlideUp = ({ 
  children, 
  delay = 0,
  className = ""
}: { 
  children: React.ReactNode
  delay?: number
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ 
      duration: 0.4, 
      delay,
      ease: [0.16, 1, 0.3, 1]
    }}
    className={className}
  >
    {children}
  </motion.div>
)

// Scale animation for buttons and cards (reduced intensity)
export const ScalePress = ({ 
  children, 
  className = "",
  whileHover = { scale: 1.01 },  // Reduced from 1.02
  whileTap = { scale: 0.99 }     // Reduced from 0.98 - less jarring
}: { 
  children: React.ReactNode
  className?: string
  whileHover?: any
  whileTap?: any
}) => (
  <motion.div
    whileHover={whileHover}
    whileTap={whileTap}
    transition={{ duration: 0.05 }}  // Faster transition - less noticeable
    className={className}
  >
    {children}
  </motion.div>
)

// Stagger children animation
export const StaggerContainer = ({ 
  children, 
  staggerDelay = 0.1,
  className = ""
}: { 
  children: React.ReactNode
  staggerDelay?: number
  className?: string
}) => (
  <motion.div
    initial="hidden"
    animate="visible"
    variants={{
      hidden: {},
      visible: {
        transition: {
          staggerChildren: staggerDelay
        }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
)

export const StaggerItem = ({ 
  children, 
  className = ""
}: { 
  children: React.ReactNode
  className?: string
}) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 10 },
      visible: { 
        opacity: 1, 
        y: 0,
        transition: {
          duration: 0.3,
          ease: [0.16, 1, 0.3, 1]
        }
      }
    }}
    className={className}
  >
    {children}
  </motion.div>
)

// Loading skeleton animation
export const Skeleton = ({ 
  className = "",
  width = "w-full",
  height = "h-4"
}: { 
  className?: string
  width?: string
  height?: string
}) => (
  <motion.div
    className={`${width} ${height} bg-muted rounded shimmer ${className}`}
    animate={{ opacity: [0.5, 1, 0.5] }}
    transition={{ 
      duration: 1.5, 
      repeat: Infinity,
      ease: "easeInOut"
    }}
  />
)

// Success checkmark animation
export const SuccessCheckmark = ({ 
  size = 24,
  className = ""
}: { 
  size?: number
  className?: string
}) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={className}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ 
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: 0.1
    }}
  >
    <motion.circle
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="2"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, ease: "easeInOut" }}
    />
    <motion.path
      d="m9 12 2 2 4-4"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ 
        duration: 0.3, 
        delay: 0.3,
        ease: "easeInOut"
      }}
    />
  </motion.svg>
)

// Floating animation for action buttons
export const FloatingButton = ({ 
  children, 
  className = ""
}: { 
  children: React.ReactNode
  className?: string
}) => (
  <motion.div
    className={className}
    animate={{ 
      y: [0, -5, 0],
    }}
    transition={{ 
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    {children}
  </motion.div>
)

// Number counter animation
export const CountUp = ({ 
  value, 
  duration = 1,
  className = ""
}: { 
  value: number
  duration?: number
  className?: string
}) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = (timestamp - startTime) / (duration * 1000)

      if (progress < 1) {
        setCount(Math.floor(value * progress))
        animationFrame = requestAnimationFrame(animate)
      } else {
        setCount(value)
      }
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [value, duration])

  return <span className={className}>{count}</span>
}

// Modal/Dialog animations
export const ModalBackdrop = ({ 
  children,
  onClose
}: { 
  children: React.ReactNode
  onClose?: () => void
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.2 }}
    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
    onClick={onClose}
  >
    {children}
  </motion.div>
)

export const ModalContent = ({ 
  children,
  className = ""
}: { 
  children: React.ReactNode
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95, y: 10 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95, y: 10 }}
    transition={{ 
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1]
    }}
    className={className}
    onClick={(e: React.MouseEvent) => e.stopPropagation()}
  >
    {children}
  </motion.div>
)

// Page transition wrapper
export const PageTransition = ({ 
  children,
  className = ""
}: { 
  children: React.ReactNode
  className?: string
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ 
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1]
    }}
    className={className}
  >
    {children}
  </motion.div>
)
