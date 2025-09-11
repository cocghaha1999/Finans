"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Calendar as CalendarIcon, 
  X, 
  Minimize2, 
  Maximize2, 
  Plus,
  Filter,
  BarChart3,
  Calendar,
  CalendarDays,
  Clock,
  Edit3,
  Trash2,
  Settings,
  MapPin,
  ImageIcon,
  ExternalLink,
  TrendingUp,
  DollarSign
} from "lucide-react"
import { Calendar as UICalendar } from "@/components/ui/calendar"
import { auth } from "@/lib/firebase"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays } from "date-fns"
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
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month")
  const [filter, setFilter] = useState<string>("all")

  const dragRef = useRef<HTMLDivElement | null>(null)
  const resizingRef = useRef(false)
  const resizeStartRef = useRef({ w: 0, h: 0, x: 0, y: 0 })
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  const userId = auth?.currentUser?.uid || ""

  // Filter events based on selected filter
  const filteredEvents = highlightedDates.filter(event => {
    if (filter === "all") return true
    return event.type === filter
  })

  // Get events for selected day
  const selectedDayEvents = selectedDate 
    ? filteredEvents.filter(event => 
        isSameDay(event.date, selectedDate)
      )
    : []

  // Drag functionality
  const startDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    draggingRef.current = true
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    document.body.style.userSelect = "none"
    e.preventDefault()
  }

  // Resize functionality  
  const startResize = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    resizingRef.current = true
    resizeStartRef.current = { w: size.w, h: size.h, x: e.clientX, y: e.clientY }
    document.body.style.userSelect = "none"
    document.body.style.cursor = "se-resize"
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        const nx = e.clientX - offsetRef.current.x
        const ny = e.clientY - offsetRef.current.y
        const maxX = Math.max(0, window.innerWidth - size.w - 8)
        const maxY = Math.max(0, window.innerHeight - 40)
        setPos({ x: Math.min(Math.max(0, nx), maxX), y: Math.min(Math.max(0, ny), maxY) })
      }
      if (resizingRef.current) {
        const dx = e.clientX - resizeStartRef.current.x
        const dy = e.clientY - resizeStartRef.current.y
        const newW = Math.max(300, resizeStartRef.current.w + dx)
        const newH = Math.max(400, resizeStartRef.current.h + dy)
        setSize({ w: newW, h: newH })
      }
    }

    const onUp = () => {
      draggingRef.current = false
      resizingRef.current = false
      document.body.style.userSelect = ""
      document.body.style.cursor = ""
    }

    if (draggingRef.current || resizingRef.current) {
      window.addEventListener("mousemove", onMove)
      window.addEventListener("mouseup", onUp)
    }

    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [size.w, size.h])

  // Media handling
  const STORAGE_KEY = "calendar-media"
  const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""

  const loadMedia = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      return map[dateKey] || null
    } catch {
      return null
    }
  }

  const saveMedia = (dataUrl: string | null) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      if (dataUrl) map[dateKey] = dataUrl
      else delete map[dateKey]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch {}
  }

  useEffect(() => {
    setMediaUrl(loadMedia())
  }, [dateKey, isCalendarOpen])

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const onPickImage = () => fileInputRef.current?.click()
  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result || "")
      setMediaUrl(url)
      saveMedia(url)
    }
    reader.readAsDataURL(file)
    e.currentTarget.value = ""
  }
  const onRemoveImage = () => {
    setMediaUrl(null)
    saveMedia(null)
  }

  // Calendar modifiers
  const dayModifiers = filteredEvents.reduce(
    (acc: Record<HighlightedDate["type"], Date[]>, highlightedDate: HighlightedDate) => {
      const type = highlightedDate.type
      if (!acc[type]) {
        acc[type] = []
      }
      acc[type].push(highlightedDate.date)
      return acc
    },
    {} as Record<HighlightedDate["type"], Date[]>
  )

  const dayModifiersClassNames = {
    income: "day-income",
    expense: "day-expense", 
    payment: "day-payment",
    "card-statement": "day-card-statement",
    "card-due": "day-card-due",
    newlyAdded: "day-new"
  }

  if (!isCalendarOpen) return null

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 60, width: size.w }} className="select-none">
      <Card className="border-border/60 bg-card/95 backdrop-blur relative" style={{ width: size.w }}>
        {/* Header */}
        <div ref={dragRef} onMouseDown={startDrag} className="flex items-center justify-between cursor-grab active:cursor-grabbing px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarIcon className="h-4 w-4" /> İşlem Takvimi
            <Badge variant="outline" className="ml-1">{filteredEvents.length}</Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setMinimized((m) => !m)} title={minimized ? "Genişlet" : "Küçült"}>
              {minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={closeCalendar} title="Kapat">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Enhanced toolbar with view modes and filters */}
        {!minimized && (
          <div className="border-b border-border/40 bg-muted/20">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as typeof viewMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 m-2">
                <TabsTrigger value="month" className="text-xs">Ay</TabsTrigger>
                <TabsTrigger value="week" className="text-xs">Hafta</TabsTrigger>
                <TabsTrigger value="day" className="text-xs">Gün</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-2">
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue placeholder="Filtrele" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tümü</SelectItem>
                      <SelectItem value="expense">Giderler</SelectItem>
                      <SelectItem value="income">Gelirler</SelectItem>
                      <SelectItem value="payment">Ödemeler</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 text-xs">
                        <Plus className="h-3 w-3 mr-1" />
                        Etkinlik
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Yeni Etkinlik Ekle</DialogTitle>
                        <DialogDescription>
                          Takvime yeni bir etkinlik veya hatırlatma ekleyin.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="event-title">Başlık</Label>
                          <Input id="event-title" placeholder="Etkinlik başlığı" />
                        </div>
                        <div>
                          <Label htmlFor="event-date">Tarih</Label>
                          <Input id="event-date" type="date" />
                        </div>
                        <div>
                          <Label htmlFor="event-type">Tip</Label>
                          <Select defaultValue="expense">
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="expense">Gider</SelectItem>
                              <SelectItem value="income">Gelir</SelectItem>
                              <SelectItem value="payment">Ödeme</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="event-amount">Tutar (opsiyonel)</Label>
                          <Input id="event-amount" type="number" placeholder="0.00" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full">
                          Etkinlik Ekle
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Fotoğraf Ekle" onClick={onPickImage}>
                    <ImageIcon className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="İstatistikler">
                    <BarChart3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Tabs>
          </div>
        )}

        {!minimized && (
          <div className="p-3" style={{ width: size.w, height: size.h - 120 }}>
            {/* Calendar styles */}
            <style>{`
              .day-income, .day-expense, .day-payment, .day-card-statement, .day-card-due {
                position: relative;
              }
              .day-new { border: 1px solid hsl(var(--primary)); }

              .rdp-day:not(.rdp-day_selected) {
                &.day-income, &.day-expense, &.day-payment, &.day-card-statement, &.day-card-due {
                  border: none;
                }
              }

              .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
                background-color: var(--primary) !important;
                color: var(--primary-foreground) !important;
                opacity: 1 !important;
              }
              
              .day-underline-marker {
                position: absolute;
                bottom: 5px;
                left: 25%;
                right: 25%;
                height: 3px;
                border-radius: 2px;
              }
            `}</style>
            
            {viewMode === "month" && (
              <UICalendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
                locale={tr}
                month={viewMonth}
                onMonthChange={setViewMonth}
                modifiers={dayModifiers}
                modifiersClassNames={dayModifiersClassNames}
              />
            )}
            
            {/* Enhanced Statistics Panel */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-medium">Toplam Gelir</span>
                </div>
                <div className="text-sm font-semibold">
                  ₺{filteredEvents.filter(d => d.type === 'income').reduce((sum, event) => sum + (event.amount || 0), 0)}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-medium">Toplam Gider</span>
                </div>
                <div className="text-sm font-semibold">
                  ₺{filteredEvents.filter(d => d.type === 'expense').reduce((sum, event) => sum + (event.amount || 0), 0)}
                </div>
              </div>
            </div>

            {/* Legend */}
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--destructive))]"/> Gider</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-4))]"/> Ödeme</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-5))]"/> Ekstre</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-1))]"/> Son Ödeme</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[hsl(var(--chart-2))]"/> Gelir</span>
            </div>

            {/* Enhanced Event Details Panel */}
            <div className="mt-4 bg-muted/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-sm">
                  {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: tr }) : "Tarih Seçin"}
                </h4>
                {selectedDate && selectedDayEvents.length > 0 && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 text-xs">
                        <Edit3 className="h-3 w-3 mr-1" />
                        Düzenle
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Günü Düzenle</DialogTitle>
                        <DialogDescription>
                          {selectedDate ? format(selectedDate, "dd MMMM yyyy", { locale: tr }) : ""} tarihindeki etkinlikleri düzenleyin.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          Bu tarihte {selectedDayEvents.length} etkinlik var.
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" size="sm">
                          Değişiklikleri Kaydet
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedDayEvents.length > 0 ? (
                  selectedDayEvents.map((event: HighlightedDate, i: number) => (
                    <div
                      key={i}
                      className={cn("flex justify-between items-center p-2 rounded-md transition-colors", {
                        "bg-green-500/10 text-green-700 dark:bg-green-500/20 dark:text-green-400": event.type === "income",
                        "bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-400": event.type === "expense",
                        "bg-blue-500/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400": event.type === "payment",
                        "bg-purple-500/10 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400":
                          event.type === "card-statement",
                        "bg-orange-500/10 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400": event.type === "card-due",
                      })}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">{event.description}</div>
                        {event.amount && (
                          <div className="text-xs opacity-75">₺{event.amount}</div>
                        )}
                      </div>
                      <Button size="icon" variant="ghost" className="h-6 w-6 opacity-50 hover:opacity-100">
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">Bu tarihte işlem yok.</p>
                    <p className="text-xs text-muted-foreground mt-1">Yeni etkinlik eklemek için yukarıdaki butonu kullanın.</p>
                  </div>
                )}
              </div>

              {/* Media preview/actions */}
              <div className="mt-4">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                {mediaUrl ? (
                  <div className="rounded-md border border-border/60 p-2 flex items-center gap-3 bg-muted/30">
                    <a href={mediaUrl} target="_blank" rel="noreferrer" className="shrink-0">
                      <img src={mediaUrl} alt="Gün Fotoğrafı" className="w-16 h-16 object-cover rounded" />
                    </a>
                    <div className="flex flex-col gap-2 ml-auto">
                      <Button size="sm" variant="outline" onClick={() => window.open(mediaUrl!, "_blank")}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Aç
                      </Button>
                      <Button size="sm" variant="destructive" onClick={onRemoveImage}>
                        <Trash2 className="h-3 w-3 mr-1" /> Kaldır
                      </Button>
                    </div>
                  </div>
                ) : selectedDate ? (
                  <div className="text-center py-2">
                    <Button size="sm" variant="outline" onClick={onPickImage} className="text-xs">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Fotoğraf Ekle
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Resize handle */}
            <div
              onMouseDown={startResize}
              title="Yeniden boyutlandır"
              className="absolute right-1 bottom-1 h-4 w-4 cursor-se-resize opacity-50 hover:opacity-100"
            >
              <svg width="100%" height="100%" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 1L1 15" stroke="hsl(var(--foreground))" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
