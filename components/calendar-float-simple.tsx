"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, X, Minimize2, Maximize2 } from "lucide-react"
import { auth } from "@/lib/firebase"
import { format, isSameDay } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useCalendar, type HighlightedDate } from "@/hooks/use-calendar-simple"

export function CalendarFloat() {
  const { isCalendarOpen, closeCalendar, highlightedDates } = useCalendar()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [viewMonth, setViewMonth] = useState<Date>(new Date())
  const [pos, setPos] = useState({ x: 100, y: 120 })
  const [size, setSize] = useState({ w: 420, h: 500 })
  const [minimized, setMinimized] = useState(false)

  const dragRef = useRef<HTMLDivElement | null>(null)
  const resizingRef = useRef(false)
  const resizeStartRef = useRef({ w: 0, h: 0, x: 0, y: 0 })
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  // Drag functionality
  const startDrag = (e: React.MouseEvent) => {
    if (resizingRef.current) return
    draggingRef.current = true
    const rect = (e.target as HTMLElement).closest('.calendar-window')?.getBoundingClientRect()
    if (rect) {
      offsetRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        setPos({
          x: e.clientX - offsetRef.current.x,
          y: e.clientY - offsetRef.current.y
        })
      }
    }

    const handleMouseUp = () => {
      draggingRef.current = false
      resizingRef.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  if (!isCalendarOpen) return null

  return (
    <div 
      className="calendar-window fixed select-none z-50" 
      style={{ left: pos.x, top: pos.y, width: size.w }}
    >
      <Card className="border-border/60 bg-card/95 backdrop-blur relative">
        {/* Header */}
        <div 
          ref={dragRef} 
          onMouseDown={startDrag} 
          className="flex items-center justify-between cursor-grab active:cursor-grabbing px-3 py-2 border-b border-border/50"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarIcon className="h-4 w-4" /> İşlem Takvimi
          </div>
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={() => setMinimized(!minimized)}
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6" 
              onClick={closeCalendar}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!minimized && (
          <div className="p-4">
            <div className="space-y-4">
              {/* Calendar view */}
              <div className="border rounded-lg p-3">
                <div className="grid grid-cols-7 gap-1 text-xs text-center mb-2">
                  {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                    <div key={day} className="font-medium text-muted-foreground p-1">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar grid - simplified for now */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i - 6 // Start from appropriate day
                    const date = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
                    const isCurrentMonth = date.getMonth() === viewMonth.getMonth()
                    const isToday = isSameDay(date, new Date())
                    const hasHighlight = highlightedDates.some(h => isSameDay(new Date(h.date), date))

                    return (
                      <Button
                        key={i}
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "h-8 w-8 p-0 text-xs relative",
                          !isCurrentMonth && "text-muted-foreground/50",
                          isToday && "bg-primary text-primary-foreground",
                          selectedDate && isSameDay(date, selectedDate) && "ring-2 ring-ring"
                        )}
                        onClick={() => setSelectedDate(date)}
                      >
                        {date.getDate()}
                        {hasHighlight && (
                          <div className="absolute bottom-0 right-0 w-1 h-1 bg-blue-500 rounded-full" />
                        )}
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Selected date info */}
              {selectedDate && (
                <div className="space-y-2">
                  <h4 className="font-medium">
                    {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
                  </h4>
                  
                  {/* Show events for selected date */}
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {highlightedDates
                      .filter(event => isSameDay(new Date(event.date), selectedDate))
                      .map((event, index) => (
                        <div 
                          key={index} 
                          className="p-2 bg-muted rounded text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {event.type === 'income' ? 'Gelir' : 'Gider'}
                            </Badge>
                            <span className="font-medium">
                              {typeof event.amount === 'number' 
                                ? `₺${event.amount.toLocaleString('tr-TR')}` 
                                : event.amount
                              }
                            </span>
                          </div>
                          <div className="text-muted-foreground">
                            {event.title || 'İşlem'}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resize handle */}
        <div 
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-muted/50 hover:bg-muted"
          onMouseDown={(e) => {
            resizingRef.current = true
            resizeStartRef.current = {
              w: size.w,
              h: size.h,
              x: e.clientX,
              y: e.clientY
            }
            e.preventDefault()
          }}
        />
      </Card>
    </div>
  )
}
