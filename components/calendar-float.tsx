"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Calendar as CalendarIcon, 
  X, 
  Minimize2, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  TrendingUp,
  TrendingDown,
  Filter,
  Settings,
  Eye,
  BarChart3,
  Keyboard,
  HelpCircle,
  Bell,
  BellOff
} from "lucide-react"
import { auth } from "@/lib/firebase"
import { format, isSameDay, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from "date-fns"
import { tr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useCalendar, type HighlightedDate } from "@/hooks/use-calendar-simple"
import { useNotifications } from "@/lib/notifications"
import { PageNotificationToggle } from "@/components/page-notification-toggle"

export function CalendarFloat() {
  const { isCalendarOpen, closeCalendar, highlightedDates, notificationsEnabled, addCalendarEvent, removeCalendarEvent } = useCalendar()
  const { checkDailyCalendarEvents, checkPastCalendarEvents, createCalendarEventNotification } = useNotifications()
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [viewMonth, setViewMonth] = useState<Date>(new Date())
  const [viewWeek, setViewWeek] = useState<Date>(new Date())
  const [pos, setPos] = useState({ x: 20, y: 80 })
  const [size, setSize] = useState({ w: 320, h: 500 })
  const [minimized, setMinimized] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'payment' | 'card'>('all')
  const [showEventDialog, setShowEventDialog] = useState(false)
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventAmount, setNewEventAmount] = useState('')
  const [newEventType, setNewEventType] = useState<'income' | 'expense'>('expense')

  const dragRef = useRef<HTMLDivElement | null>(null)
  const resizingRef = useRef(false)
  const resizeStartRef = useRef({ w: 0, h: 0, x: 0, y: 0, direction: '' as 's' | 'e' | 'se' | '' })
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  // Etkinlik kaydetme fonksiyonu
  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !selectedDate) return
    
    const newEvent: HighlightedDate = {
      date: selectedDate,
      type: newEventType,
      description: newEventTitle,
      title: newEventTitle,
      amount: newEventAmount ? parseFloat(newEventAmount) : undefined,
      category: newEventType
    }
    
    // Takvim hook'u ile etkinlik ekleme (bu bildirim de oluşturacak)
    addCalendarEvent(newEvent)
    
    // Dialog temizle ve kapat
    setNewEventTitle('')
    setNewEventAmount('')
    setNewEventType('expense')
    setShowEventDialog(false)
  }

  // Takvim açıldığında günlük kontrol yap
  useEffect(() => {
    if (isCalendarOpen && notificationsEnabled) {
      checkDailyCalendarEvents(highlightedDates)
      checkPastCalendarEvents(highlightedDates)
    }
  }, [isCalendarOpen, notificationsEnabled, highlightedDates, checkDailyCalendarEvents, checkPastCalendarEvents])

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

  // Filter highlighted dates based on filter type
  const filteredHighlightedDates = highlightedDates.filter(event => {
    if (filterType === 'all') return true
    if (filterType === 'card') return event.type === 'card-statement' || event.type === 'card-due'
    return event.type === filterType
  })

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const start = startOfMonth(viewMonth)
    const end = endOfMonth(viewMonth)
    const days = eachDayOfInterval({ start, end })
    
    // Add padding days from previous month
    const startDay = getDay(start)
    const paddingDays = startDay === 0 ? 6 : startDay - 1
    
    const allDays = []
    for (let i = paddingDays; i > 0; i--) {
      const day = new Date(start)
      day.setDate(day.getDate() - i)
      allDays.push({ date: day, isCurrentMonth: false })
    }
    
    days.forEach(day => {
      allDays.push({ date: day, isCurrentMonth: true })
    })
    
    return allDays
  }

  // Generate week days for current week
  const generateWeekDays = () => {
    const start = startOfWeek(viewWeek, { weekStartsOn: 1 }) // Monday start
    const end = endOfWeek(viewWeek, { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }

  // Get current week events
  const getWeekEvents = () => {
    const weekStart = startOfWeek(viewWeek, { weekStartsOn: 1 })
    const weekEnd = endOfWeek(viewWeek, { weekStartsOn: 1 })
    
    return filteredHighlightedDates.filter(event => {
      const eventDate = new Date(event.date)
      return isWithinInterval(eventDate, { start: weekStart, end: weekEnd })
    })
  }

  // Statistics calculation
  const monthStats = filteredHighlightedDates.reduce((acc, event) => {
    const eventDate = new Date(event.date)
    if (eventDate.getMonth() === viewMonth.getMonth() && 
        eventDate.getFullYear() === viewMonth.getFullYear()) {
      if (event.type === 'income') {
        acc.totalIncome += typeof event.amount === 'number' ? event.amount : 0
        acc.incomeCount++
      } else {
        acc.totalExpense += typeof event.amount === 'number' ? event.amount : 0
        acc.expenseCount++
      }
    }
    return acc
  }, { totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0 })

  const balance = monthStats.totalIncome - monthStats.totalExpense

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!isCalendarOpen) return
      
      switch (e.key) {
        case 'Escape':
          closeCalendar()
          break
        case 'ArrowLeft':
          if (e.ctrlKey) {
            if (viewMode === 'week') {
              setViewWeek(subWeeks(viewWeek, 1))
            } else {
              setViewMonth(subMonths(viewMonth, 1))
            }
            e.preventDefault()
          }
          break
        case 'ArrowRight':
          if (e.ctrlKey) {
            if (viewMode === 'week') {
              setViewWeek(addWeeks(viewWeek, 1))
            } else {
              setViewMonth(addMonths(viewMonth, 1))
            }
            e.preventDefault()
          }
          break
        case 'Home':
          if (e.ctrlKey) {
            const today = new Date()
            setViewMonth(today)
            setViewWeek(today)
            e.preventDefault()
          }
          break
        case '1':
          if (e.ctrlKey) {
            setViewMode('month')
            e.preventDefault()
          }
          break
        case '2':
          if (e.ctrlKey) {
            setViewMode('week')
            e.preventDefault()
          }
          break
        case '3':
          if (e.ctrlKey) {
            setViewMode('list')
            e.preventDefault()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => document.removeEventListener('keydown', handleKeydown)
  }, [isCalendarOpen, viewMonth, viewWeek, viewMode, closeCalendar])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        setPos({
          x: e.clientX - offsetRef.current.x,
          y: e.clientY - offsetRef.current.y
        })
      } else if (resizingRef.current) {
        const dx = e.clientX - resizeStartRef.current.x
        const dy = e.clientY - resizeStartRef.current.y
        const direction = resizeStartRef.current.direction
        
        let newWidth = resizeStartRef.current.w
        let newHeight = resizeStartRef.current.h
        let newX = pos.x
        let newY = pos.y
        
        switch (direction) {
          case 's': // South (bottom)
            newHeight = Math.max(200, resizeStartRef.current.h + dy)
            break
          case 'e': // East (right)
            newWidth = Math.max(300, resizeStartRef.current.w + dx)
            break
          case 'se': // Southeast (bottom-right)
            newWidth = Math.max(300, resizeStartRef.current.w + dx)
            newHeight = Math.max(200, resizeStartRef.current.h + dy)
            break
        }
        
        setSize({ w: newWidth, h: newHeight })
        // Position doesn't change for right/bottom only resizing
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
      className="calendar-window fixed select-none z-50 max-w-[95vw] sm:max-w-none" 
      style={{ 
        left: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : pos.x, 
        top: typeof window !== 'undefined' && window.innerWidth < 640 ? 60 : pos.y, 
        width: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100vw - 10px)' : size.w,
        height: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100vh - 140px)' : size.h
      }}
    >
      <Card className="border-border/60 bg-card/95 backdrop-blur relative h-full overflow-hidden">
        {/* Header */}
        <div 
          ref={dragRef} 
          onMouseDown={startDrag} 
          className="flex items-center justify-between cursor-grab active:cursor-grabbing px-1 sm:px-3 py-1 sm:py-2 border-b border-border/50"
        >
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold">
            <CalendarIcon className="h-3 w-3 sm:h-4 sm:w-4" /> 
            <span className="hidden sm:inline">İşlem Takvimi</span>
            <span className="sm:hidden">Takvim</span>
            <Badge variant="outline" className="text-xs hidden sm:inline-flex">
              {format(viewMonth, 'MMMM yyyy', { locale: tr })}
            </Badge>
            <Badge variant="outline" className="text-xs sm:hidden">
              {format(viewMonth, 'MMM yy', { locale: tr })}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {/* Bildirim Toggle */}
            <PageNotificationToggle 
              page="calendar" 
              size="sm" 
              className="h-6 w-6" 
            />
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-6 w-6">
                    <HelpCircle className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="space-y-1">
                    <div><strong>Klavye Kısayolları:</strong></div>
                    <div>ESC: Kapat</div>
                    <div>Ctrl + ←/→: Ay/Hafta değiştir</div>
                    <div>Ctrl + Home: Bugün</div>
                    <div>Ctrl + 1: Ay görünümü</div>
                    <div>Ctrl + 2: Hafta görünümü</div>
                    <div>Ctrl + 3: Liste görünümü</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6">
                  <Plus className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Etkinlik Ekle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Başlık</Label>
                    <Input 
                      value={newEventTitle} 
                      onChange={(e) => setNewEventTitle(e.target.value)}
                      placeholder="Etkinlik başlığı"
                    />
                  </div>
                  <div>
                    <Label>Miktar</Label>
                    <Input 
                      type="number"
                      value={newEventAmount} 
                      onChange={(e) => setNewEventAmount(e.target.value)}
                      placeholder="Miktar"
                    />
                  </div>
                  <div>
                    <Label>Tip</Label>
                    <Select value={newEventType} onValueChange={(value) => setNewEventType(value as 'income' | 'expense')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Gelir</SelectItem>
                        <SelectItem value="expense">Gider</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddEvent} className="w-full">
                    Ekle
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
          <div className="p-1 sm:p-4 h-full overflow-y-auto">
            {/* Stats Bar */}
            <div className="mb-2 sm:mb-4 p-2 sm:p-3 bg-muted/30 rounded-lg">
              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                <div>
                  <div className="text-xs text-muted-foreground">Gelir</div>
                  <div className="text-xs sm:text-sm font-medium text-green-600 flex items-center justify-center gap-1">
                    <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3" />
                    ₺{monthStats.totalIncome.toLocaleString('tr-TR')}
                  </div>
                  <div className="text-xs text-muted-foreground">{monthStats.incomeCount} işlem</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Gider</div>
                  <div className="text-xs sm:text-sm font-medium text-red-600 flex items-center justify-center gap-1">
                    <TrendingDown className="h-2 w-2 sm:h-3 sm:w-3" />
                    ₺{monthStats.totalExpense.toLocaleString('tr-TR')}
                  </div>
                  <div className="text-xs text-muted-foreground">{monthStats.expenseCount} işlem</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Net</div>
                  <div className={`text-xs sm:text-sm font-medium flex items-center justify-center gap-1 ${
                    balance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <BarChart3 className="h-2 w-2 sm:h-3 sm:w-3" />
                    ₺{balance.toLocaleString('tr-TR')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {balance >= 0 ? 'Kâr' : 'Zarar'}
                  </div>
                </div>
              </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                  onClick={() => {
                    if (viewMode === 'week') {
                      setViewWeek(subWeeks(viewWeek, 1))
                    } else {
                      setViewMonth(subMonths(viewMonth, 1))
                    }
                  }}
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 sm:h-8 sm:w-8 p-0"
                  onClick={() => {
                    if (viewMode === 'week') {
                      setViewWeek(addWeeks(viewWeek, 1))
                    } else {
                      setViewMonth(addMonths(viewMonth, 1))
                    }
                  }}
                >
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 sm:h-8 text-xs sm:text-sm px-2 sm:px-3"
                  onClick={() => {
                    const today = new Date()
                    setViewMonth(today)
                    setViewWeek(today)
                  }}
                >
                  <span className="hidden sm:inline">Bugün</span>
                  <span className="sm:hidden">•</span>
                </Button>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'income' | 'expense' | 'payment' | 'card')}>
                  <SelectTrigger className="w-20 sm:w-32 h-6 sm:h-8 text-xs">
                    <Filter className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tümü</SelectItem>
                    <SelectItem value="income">Gelir</SelectItem>
                    <SelectItem value="expense">Gider</SelectItem>
                    <SelectItem value="payment">Ödeme</SelectItem>
                    <SelectItem value="card">Kart</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'month' | 'week' | 'list')}>
              <TabsList className="grid w-full grid-cols-3 h-8 sm:h-10">
                <TabsTrigger value="month" className="text-xs sm:text-sm">Ay</TabsTrigger>
                <TabsTrigger value="week" className="text-xs sm:text-sm">Hafta</TabsTrigger>
                <TabsTrigger value="list" className="text-xs sm:text-sm">Liste</TabsTrigger>
              </TabsList>

              <TabsContent value="month" className="mt-2 sm:mt-4">
                {/* Calendar Grid */}
                <div className="border rounded-lg p-1 sm:p-3">
                  <div className="grid grid-cols-7 gap-1 text-xs text-center mb-1 sm:mb-2">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                      <div key={day} className="font-medium text-muted-foreground p-1">
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.charAt(0)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1">
                    {generateCalendarDays().map((dayObj, index) => {
                      const date = dayObj.date
                      const isToday = isSameDay(date, new Date())
                      const isSelected = selectedDate && isSameDay(date, selectedDate)
                      const dayEvents = filteredHighlightedDates.filter(h => isSameDay(new Date(h.date), date))
                      const hasIncome = dayEvents.some(e => e.type === 'income')
                      const hasExpense = dayEvents.some(e => e.type === 'expense')
                      const hasPayment = dayEvents.some(e => e.type === 'payment')
                      const hasCardEvent = dayEvents.some(e => e.type === 'card-statement' || e.type === 'card-due')

                      return (
                        <Button
                          key={index}
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-8 w-8 p-0 text-xs relative",
                            !dayObj.isCurrentMonth && "text-muted-foreground/30",
                            isToday && "bg-primary text-primary-foreground",
                            isSelected && "ring-2 ring-ring",
                            dayEvents.length > 0 && "font-semibold"
                          )}
                          onClick={() => setSelectedDate(date)}
                        >
                          {date.getDate()}
                          {/* Event indicators */}
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                            {hasIncome && (
                              <div className="w-1 h-1 bg-green-500 rounded-full" />
                            )}
                            {hasExpense && (
                              <div className="w-1 h-1 bg-red-500 rounded-full" />
                            )}
                            {hasPayment && (
                              <div className="w-1 h-1 bg-blue-500 rounded-full" />
                            )}
                            {hasCardEvent && (
                              <div className="w-1 h-1 bg-purple-500 rounded-full" />
                            )}
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                </div>
                
                {/* Legend */}
                <div className="mt-3 p-2 bg-muted/30 rounded text-xs">
                  <div className="font-medium mb-1">Efsane:</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"/> Gelir</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"/> Gider</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"/> Ödeme</span>
                    <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"/> Kart İşlemi</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="week" className="mt-4">
                {/* Week Header */}
                <div className="mb-4 text-center">
                  <h3 className="text-sm font-medium">
                    {format(startOfWeek(viewWeek, { weekStartsOn: 1 }), 'dd MMM', { locale: tr })} - {' '}
                    {format(endOfWeek(viewWeek, { weekStartsOn: 1 }), 'dd MMM yyyy', { locale: tr })}
                  </h3>
                </div>

                {/* Week Grid */}
                <div className="border rounded-lg p-3">
                  <div className="grid grid-cols-7 gap-2">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((dayName, index) => {
                      const weekDays = generateWeekDays()
                      const dayDate = weekDays[index]
                      const isToday = isSameDay(dayDate, new Date())
                      const isSelected = selectedDate && isSameDay(dayDate, selectedDate)
                      const dayEvents = filteredHighlightedDates.filter(h => isSameDay(new Date(h.date), dayDate))

                      return (
                        <div key={index} className="text-center">
                          {/* Day Header */}
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            {dayName}
                          </div>
                          <Button
                            variant="ghost"
                            className={cn(
                              "w-full h-8 text-xs mb-2",
                              isToday && "bg-primary text-primary-foreground",
                              isSelected && "ring-2 ring-ring"
                            )}
                            onClick={() => setSelectedDate(dayDate)}
                          >
                            {dayDate.getDate()}
                          </Button>
                          
                          {/* Day Events */}
                          <div className="space-y-1 min-h-[120px]">
                            {dayEvents.map((event, eventIndex) => {
                              let eventStyle = "border-gray-200 bg-gray-50 text-gray-700"
                              if (event.type === 'income') {
                                eventStyle = 'border-green-200 bg-green-50 text-green-700'
                              } else if (event.type === 'expense') {
                                eventStyle = 'border-red-200 bg-red-50 text-red-700'
                              } else if (event.type === 'payment') {
                                eventStyle = 'border-blue-200 bg-blue-50 text-blue-700'
                              } else if (event.type === 'card-statement' || event.type === 'card-due') {
                                eventStyle = 'border-purple-200 bg-purple-50 text-purple-700'
                              }
                              
                              return (
                                <div 
                                  key={eventIndex}
                                  className={cn(
                                    "p-1 rounded text-xs border cursor-pointer hover:shadow-sm transition-shadow",
                                    eventStyle
                                  )}
                                  onClick={() => setSelectedDate(dayDate)}
                                >
                                  <div className="font-medium truncate">
                                    {event.description || 'İşlem'}
                                  </div>
                                  {typeof event.amount === 'number' && (
                                    <div className="font-semibold">
                                      {event.type === 'income' ? '+' : ''}
                                      ₺{event.amount.toLocaleString('tr-TR')}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Week Summary */}
                <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                  <h4 className="font-medium text-sm mb-2">Hafta Özeti</h4>
                  <div className="grid grid-cols-3 gap-4 text-center text-xs">
                    {(() => {
                      const weekEvents = getWeekEvents()
                      const weekStats = weekEvents.reduce((acc, event) => {
                        if (event.type === 'income') {
                          acc.income += typeof event.amount === 'number' ? event.amount : 0
                          acc.incomeCount++
                        } else {
                          acc.expense += typeof event.amount === 'number' ? event.amount : 0
                          acc.expenseCount++
                        }
                        return acc
                      }, { income: 0, expense: 0, incomeCount: 0, expenseCount: 0 })
                      
                      const weekBalance = weekStats.income - weekStats.expense
                      
                      return (
                        <>
                          <div>
                            <div className="text-muted-foreground">Gelir</div>
                            <div className="font-medium text-green-600">
                              ₺{weekStats.income.toLocaleString('tr-TR')}
                            </div>
                            <div className="text-muted-foreground">{weekStats.incomeCount} işlem</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Gider</div>
                            <div className="font-medium text-red-600">
                              ₺{weekStats.expense.toLocaleString('tr-TR')}
                            </div>
                            <div className="text-muted-foreground">{weekStats.expenseCount} işlem</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Net</div>
                            <div className={`font-medium ${weekBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              ₺{weekBalance.toLocaleString('tr-TR')}
                            </div>
                            <div className="text-muted-foreground">
                              {weekBalance >= 0 ? 'Kâr' : 'Zarar'}
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="list" className="mt-4">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredHighlightedDates
                    .filter(event => {
                      const eventDate = new Date(event.date)
                      return eventDate.getMonth() === viewMonth.getMonth() && 
                             eventDate.getFullYear() === viewMonth.getFullYear()
                    })
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((event, index) => {
                      let eventStyle = "border-gray-200 bg-gray-50"
                      let badgeVariant: "default" | "destructive" | "secondary" | "outline" = "outline"
                      let badgeText = "İşlem"
                      
                      if (event.type === 'income') {
                        eventStyle = 'border-green-200 bg-green-50'
                        badgeVariant = 'default'
                        badgeText = 'Gelir'
                      } else if (event.type === 'expense') {
                        eventStyle = 'border-red-200 bg-red-50'
                        badgeVariant = 'destructive'
                        badgeText = 'Gider'
                      } else if (event.type === 'payment') {
                        eventStyle = 'border-blue-200 bg-blue-50'
                        badgeVariant = 'secondary'
                        badgeText = 'Ödeme'
                      } else if (event.type === 'card-statement') {
                        eventStyle = 'border-purple-200 bg-purple-50'
                        badgeVariant = 'outline'
                        badgeText = 'Ekstre'
                      } else if (event.type === 'card-due') {
                        eventStyle = 'border-purple-200 bg-purple-50'
                        badgeVariant = 'outline'
                        badgeText = 'Son Ödeme'
                      }
                      
                      return (
                        <div 
                          key={index} 
                          className={cn(
                            "p-2 rounded text-xs border cursor-pointer hover:bg-muted/50",
                            eventStyle
                          )}
                          onClick={() => setSelectedDate(new Date(event.date))}
                        >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={badgeVariant} 
                              className="text-xs"
                            >
                              {badgeText}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(event.date), 'dd MMM', { locale: tr })}
                            </span>
                          </div>
                          {typeof event.amount === 'number' && (
                            <span className={cn(
                              "font-semibold text-xs",
                              event.type === 'income' ? 'text-green-600' : 
                              event.type === 'expense' ? 'text-red-600' : 
                              event.type === 'payment' ? 'text-blue-600' : 'text-purple-600'
                            )}>
                              ₺{event.amount.toLocaleString('tr-TR')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {event.description || 'İşlem'}
                        </div>
                      </div>
                      )
                    })}
                </div>
              </TabsContent>
            </Tabs>

            {/* Selected Date Details */}
            {selectedDate && (
              <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                <h4 className="font-medium text-sm mb-2">
                  {format(selectedDate, 'dd MMMM yyyy, EEEE', { locale: tr })}
                </h4>
                
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {filteredHighlightedDates
                    .filter(event => isSameDay(new Date(event.date), selectedDate))
                    .map((event, index) => (
                      <div 
                        key={index} 
                        className="p-2 bg-background rounded text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant={
                            event.type === 'income' ? 'default' : 
                            event.type === 'expense' ? 'destructive' : 
                            event.type === 'payment' ? 'secondary' : 'outline'
                          } className="text-xs">
                            {event.type === 'income' ? 'Gelir' : 
                             event.type === 'expense' ? 'Gider' : 
                             event.type === 'payment' ? 'Ödeme' : 
                             event.type === 'card-statement' ? 'Ekstre' : 'Son Ödeme'}
                          </Badge>
                          {typeof event.amount === 'number' && (
                            <span className="font-medium">
                              ₺{event.amount.toLocaleString('tr-TR')}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground">
                          {event.description || 'İşlem'}
                        </div>
                      </div>
                    ))}
                  {filteredHighlightedDates.filter(event => isSameDay(new Date(event.date), selectedDate)).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-2">
                      Bu tarihte işlem bulunmuyor
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Simplified Resize Handles - Only right and bottom */}
        {/* Right edge */}
        <div 
          className="absolute right-0 top-1 bottom-1 w-1 cursor-e-resize hover:bg-primary/20"
          onMouseDown={(e) => {
            resizingRef.current = true
            resizeStartRef.current = {
              w: size.w,
              h: size.h,
              x: e.clientX,
              y: e.clientY,
              direction: 'e'
            }
            e.preventDefault()
          }}
        />
        
        {/* Bottom edge */}
        <div 
          className="absolute bottom-0 left-1 right-1 h-1 cursor-s-resize hover:bg-primary/20"
          onMouseDown={(e) => {
            resizingRef.current = true
            resizeStartRef.current = {
              w: size.w,
              h: size.h,
              x: e.clientX,
              y: e.clientY,
              direction: 's'
            }
            e.preventDefault()
          }}
        />
        
        {/* Bottom-right corner (main resize handle) */}
        <div 
          className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-muted/50 hover:bg-primary/50"
          onMouseDown={(e) => {
            resizingRef.current = true
            resizeStartRef.current = {
              w: size.w,
              h: size.h,
              x: e.clientX,
              y: e.clientY,
              direction: 'se'
            }
            e.preventDefault()
          }}
        />
      </Card>
    </div>
  )
}
