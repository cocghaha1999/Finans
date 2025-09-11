"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, TrendingUp, TrendingDown, X } from 'lucide-react'
import { mobileUtils } from '@/hooks/use-touch-gestures'

interface FloatingActionButtonProps {
  onAddIncome: () => void
  onAddExpense: () => void
}

export function FloatingActionButton({ onAddIncome, onAddExpense }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    setIsOpen(!isOpen)
    // Completely disable haptic feedback to prevent dialog interference
    // if (!isOpen) {
    //   mobileUtils.haptic('light')
    // }
  }

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
    // Completely disable haptic feedback to prevent dialog interference
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      {/* Action buttons */}
      <div className={`flex flex-col space-y-3 mb-3 transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      }`}>
        <Button
          size="lg"
          onClick={() => handleAction(onAddIncome)}
          className="h-12 w-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg"
        >
          <TrendingUp className="h-5 w-5" />
        </Button>
        <Button
          size="lg"
          onClick={() => handleAction(onAddExpense)}
          className="h-12 w-12 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
        >
          <TrendingDown className="h-5 w-5" />
        </Button>
      </div>

      {/* Main FAB */}
      <Button
        size="lg"
        onClick={handleToggle}
        className={`h-14 w-14 rounded-full shadow-xl transition-all duration-300 ${
          isOpen 
            ? 'bg-gray-500 hover:bg-gray-600 rotate-45' 
            : 'bg-primary hover:bg-primary/90'
        }`}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
