"use client"

import React from 'react'
import Image from 'next/image'

interface LogoProps {
  className?: string
  size?: number
  priority?: boolean
}

export const Logo: React.FC<LogoProps> = ({ className = "", size = 40, priority = false }) => {
  return (
    <div className={`flex items-center ${className}`}>
      <Image
        src="/logo.svg"
        alt="CostikFinans Logo"
        width={size}
        height={size}
        priority={priority}
        className="w-auto h-auto"
      />
    </div>
  )
}