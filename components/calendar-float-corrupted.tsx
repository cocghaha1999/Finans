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

import { useCalendar, HighlightedDate } from "@/hooks/use-calendar-simple"
import { cn } from "@/lib/utils"

type ViewMode = "month" | "week" | "day"
type EventCategory = "payment" | "card-statement" | "card-due" | "income" | "expense" | "newlyAdded" | "custom"

const categoryColors = {
  payment: "bg-blue-500",
  "card-statement": "bg-purple-500",  
  "card-due": "bg-red-500",
  income: "bg-green-500",
  expense: "bg-orange-500",
  newlyAdded: "bg-yellow-500",
  custom: "bg-gray-500"
}

const categoryLabels = {
  payment: "Ödeme",
  "card-statement": "Kart Ekstresi",
  "card-due": "Kart Son Ödeme",
  income: "Gelir",
  expense: "Gider", 
  newlyAdded: "Yeni Eklenen",
  custom: "Özel"
}
// removed test seeding helpers

type Props = {
  // open/close is managed via useCalendar
}

export function CalendarFloat({}: Props) {
  const { isCalendarOpen, closeCalendar, highlightedDates } = useCalendar()
  // Calendar settings temporarily disabled
  // const { setIncludeCardMarkers, setFixedPaymentRange } = useCalendar()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [viewMonth, setViewMonth] = useState<Date>(new Date())
  const [pos, setPos] = useState({ x: 100, y: 120 })
  const [size, setSize] = useState({ w: 400, h: 480 })
  const [minimized, setMinimized] = useState(false)
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)

  const dragRef = useRef<HTMLDivElement | null>(null)
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })

  const userId = auth?.currentUser?.uid || ""

  // Ensure helpful defaults so months aren't empty
  useEffect(() => {
    try {
      // Calendar settings temporarily disabled
      // setIncludeCardMarkers(true)
      // setFixedPaymentRange(3, 3)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drag logic
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        const nx = e.clientX - offsetRef.current.x
        const ny = e.clientY - offsetRef.current.y
        const maxX = Math.max(0, window.innerWidth - size.w - 8)
        const maxY = Math.max(0, window.innerHeight - 40)
        setPos({ x: Math.min(Math.max(0, nx), maxX), y: Math.min(Math.max(0, ny), maxY) })
      }
    }
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [size.w])

  const startDrag = (e: React.MouseEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return
    draggingRef.current = true
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"
    e.preventDefault()
  }

  // Resize logic
  const resizingRef = useRef(false)
  const resizeStartRef = useRef({ w: 400, h: 480, x: 0, y: 0 })
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (resizingRef.current) {
        const dx = e.clientX - resizeStartRef.current.x
        const dy = e.clientY - resizeStartRef.current.y
        const nw = Math.max(320, Math.min(900, resizeStartRef.current.w + dx))
        const nh = Math.max(260, Math.min(900, resizeStartRef.current.h + dy))
        setSize({ w: nw, h: nh })
      }
    }
    const onUp = () => {
      if (resizingRef.current) {
        resizingRef.current = false
        document.body.style.userSelect = ""
        document.body.style.cursor = ""
      }
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [])
  const startResize = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    resizingRef.current = true
    resizeStartRef.current = { w: size.w, h: size.h, x: e.clientX, y: e.clientY }
    document.body.style.userSelect = "none"
    document.body.style.cursor = "se-resize"
    e.preventDefault()
  }

  const dayModifiers = highlightedDates.reduce(
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

  // Build a map YYYY-MM-DD -> [types]
  const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  const markersMap = highlightedDates.reduce((m: Record<string, string[]>, e: HighlightedDate) => {
    const k = keyOf(e.date)
    if (!m[k]) m[k] = []
    if (!m[k].includes(e.type)) m[k].push(e.type)
    return m
  }, {})

  const eventsMap = highlightedDates.reduce((m: Record<string, { type: string; description?: string }[]>, e: HighlightedDate) => {
    const k = keyOf(e.date)
    if (!m[k]) m[k] = []
    m[k].push({ type: e.type, description: e.description })
    return m
  }, {})

  const monthHasMarkers = (d: Date) => {
    const prefix = format(d, "yyyy-MM")
    for (const key of Object.keys(markersMap)) {
      if (key.startsWith(prefix)) return true
    }
    return false
  }

  // Kapanıp açıldığında veya veriler geldiğinde, bu ayda işaret yoksa en yakın işaretli aya git
  useEffect(() => {
    if (!isCalendarOpen || highlightedDates.length === 0) return
    if (monthHasMarkers(viewMonth)) return
    // en yakın tarihi bul (bugüne en yakın)
    const today = new Date()
    let best = highlightedDates[0]?.date
    let bestDiff = Math.abs(new Date(best || today).getTime() - today.getTime())
    for (const h of highlightedDates) {
      const diff = Math.abs(h.date.getTime() - today.getTime())
      if (diff < bestDiff) {
        best = h.date
        bestDiff = diff
      }
    }
    if (best) {
      setSelectedDate(best)
      setViewMonth(new Date(best.getFullYear(), best.getMonth(), 1))
    }
  }, [isCalendarOpen, highlightedDates])

  const dayModifiersClassNames = {
    income: "day-income",
    expense: "day-expense",
    payment: "day-payment",
    "card-statement": "day-card-statement",
    "card-due": "day-card-due",
    newlyAdded: "day-new",
  }

  const selectedDayEvents = highlightedDates.filter(
    (event: HighlightedDate) => selectedDate && format(new Date(event.date), "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
  )

  // Media (per-day image) persisted in localStorage keyed by userId + date (yyyy-MM-dd)
  const dateKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null
  const STORAGE_KEY = userId ? `calendarMedia:${userId}` : `calendarMedia:guest`
  const loadMedia = () => {
    try {
      if (!dateKey) return null
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const map = JSON.parse(raw) as Record<string, string>
      return map[dateKey] || null
    } catch {
      return null
    }
  }
  const saveMedia = (dataUrl: string | null) => {
    try {
      if (!dateKey) return
      const raw = localStorage.getItem(STORAGE_KEY)
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {}
      if (dataUrl) map[dateKey] = dataUrl
      else delete map[dateKey]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
    } catch {}
  }
  useEffect(() => {
    setMediaUrl(loadMedia())
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  if (!isCalendarOpen) return null

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 60, width: size.w }} className="select-none">
      <Card className="border-border/60 bg-card/95 backdrop-blur relative" style={{ width: size.w }}>
        <div ref={dragRef} onMouseDown={startDrag} className="flex items-center justify-between cursor-grab active:cursor-grabbing px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <CalendarIcon className="h-4 w-4" /> İşlem Takvimi
            <Badge variant="outline" className="ml-1">{highlightedDates.length}</Badge>
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
            <Tabs defaultValue="month" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-9 m-2">
                <TabsTrigger value="month" className="text-xs">Ay</TabsTrigger>
                <TabsTrigger value="week" className="text-xs">Hafta</TabsTrigger>
                <TabsTrigger value="day" className="text-xs">Gün</TabsTrigger>
              </TabsList>
              
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-2">
                  <Select defaultValue="all">
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
                              <SelectItem value="reminder">Hatırlatma</SelectItem>
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
                  {!monthHasMarkers(viewMonth) && highlightedDates.length > 0 && (
                    <Button size="icon" variant="ghost" className="h-8 w-8" title="İşaretli aya git"
                      onClick={() => {
                        const first = highlightedDates[0]?.date
                        if (first) {
                          setSelectedDate(first)
                          setViewMonth(new Date(first.getFullYear(), first.getMonth(), 1))
                        }
                      }}
                    >
                      <MapPin className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </Tabs>
          </div>
        )}

        {/* Content toolbar (right side icon) */}
        {!minimized && (
          <div className="flex justify-between items-center px-2 py-1 border-b border-border/40">
            <div className="text-xs text-muted-foreground">
              {!monthHasMarkers(viewMonth) && highlightedDates.length > 0 ? (
                <button
                  className="inline-flex items-center gap-1 hover:underline"
                  onClick={() => {
                    const first = highlightedDates[0]?.date
                    if (first) {
                      setSelectedDate(first)
                      setViewMonth(new Date(first.getFullYear(), first.getMonth(), 1))
                    }
                  }}
                >
                  <MapPin className="h-3.5 w-3.5" /> İşaretli aya git
                </button>
              ) : null}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            {/* Test verisi ekle butonu kaldırıldı */}
            <Button size="icon" variant="ghost" title="Fotoğraf Ekle/Göster" onClick={onPickImage}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>
        )}

        {!minimized && (
          <div className="p-2" style={{ width: size.w, height: size.h }}>
            <style>{`
              .day-income, .day-expense, .day-payment, .day-card-statement, .day-card-due {
                position: relative;
              }
              .day-new { border: 1px solid hsl(var(--primary)); }

              /* Disable default modifier borders/rings */
              .rdp-day:not(.rdp-day_selected) {
                &.day-income, &.day-expense, &.day-payment, &.day-card-statement, &.day-card-due {
                  border: none;
                }
              }

              /* Stronger selected day styles */
              .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
                background-color: var(--primary) !important;
                color: var(--primary-foreground) !important;
                opacity: 1 !important;
              }
              .rdp-day_selected .day-underline-marker {
                background: var(--primary-foreground) !important;
              }

              /* Underline marker style */
              .day-underline-marker {
                position: absolute;
                bottom: 5px;
                left: 25%;
                right: 25%;
                height: 3px;
                border-radius: 2px;
              }
            `}</style>
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
            
            {/* Enhanced Statistics Panel */}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span className="font-medium">Toplam Gelir</span>
                </div>
                <div className="text-sm font-semibold">
                  ₺{highlightedDates.filter(d => d.type === 'income').length * 1500}
                </div>
              </div>
              <div className="bg-muted/30 rounded-lg p-2">
                <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-medium">Toplam Gider</span>
                </div>
                <div className="text-sm font-semibold">
                  ₺{highlightedDates.filter(d => d.type === 'expense').length * 250}
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
                {selectedDate && (
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
                        {/* Event list would go here */}
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