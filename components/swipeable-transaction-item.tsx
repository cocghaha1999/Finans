"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Edit, Undo2 } from 'lucide-react'
import { useTouchGestures } from '@/hooks/use-touch-gestures'
import { formatTRY, formatDateTR } from '@/lib/utils'
import type { Transaction } from '@/lib/types'

interface SwipeableTransactionItemProps {
  transaction: Transaction
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  className?: string
}

export function SwipeableTransactionItem({
  transaction,
  onEdit,
  onDelete,
  className = ""
}: SwipeableTransactionItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const maxSwipe = 160 // Maximum swipe distance
  const actionThreshold = 80 // Threshold to reveal actions

  const touchGestures = useTouchGestures({
    onSwipeLeft: () => {
      if (!isRevealed) {
        setSwipeOffset(-maxSwipe)
        setIsRevealed(true)
      }
    },
    onSwipeRight: () => {
      if (isRevealed) {
        setSwipeOffset(0)
        setIsRevealed(false)
      }
    },
    onTap: () => {
      if (isRevealed) {
        setSwipeOffset(0)
        setIsRevealed(false)
      }
    },
    swipeThreshold: 20
  })

  const handleEdit = () => {
    setSwipeOffset(0)
    setIsRevealed(false)
    onEdit(transaction)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    
    // Disable haptic feedback to prevent interference with dialogs
    // if ('vibrate' in navigator) {
    //   navigator.vibrate(25)
    // }

    // Animate delete
    setTimeout(() => {
      onDelete(transaction)
    }, 300)
  }

  const handleUndo = () => {
    setSwipeOffset(0)
    setIsRevealed(false)
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Action buttons (behind the card) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center bg-red-500/10 dark:bg-red-950/20">
        <div className="flex items-center space-x-2 px-4">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-950"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDelete}
            className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-950"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Undo button (visible when revealed) */}
      {isRevealed && (
        <Button
          size="sm"
          variant="ghost"
          onClick={handleUndo}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-8 w-8 p-0 bg-background/80 backdrop-blur-sm border"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
      )}

      {/* Main transaction card */}
      <Card
        className={`transition-all duration-300 ${
          isDeleting ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        } ${
          isRevealed ? 'shadow-lg' : ''
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.3s ease-out' : 'none'
        }}
        {...touchGestures}
      >
        <div className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge 
                  variant={transaction.type === "gelir" ? "default" : "destructive"}
                  className="text-xs"
                >
                  {transaction.type === "gelir" ? "Gelir" : "Gider"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {transaction.category}
                </span>
              </div>
              
              <h4 className="font-medium text-sm truncate mb-1">
                {transaction.description}
              </h4>
              
              <p className="text-xs text-muted-foreground">
                {formatDateTR(transaction.date)}
              </p>
            </div>
            
            <div className="text-right flex-shrink-0 ml-4">
              <p className={`font-bold text-sm ${
                transaction.type === "gelir" 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-red-600 dark:text-red-400"
              }`}>
                {transaction.type === "gelir" ? "+" : "-"}
                {formatTRY(Math.abs(transaction.amount))}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
