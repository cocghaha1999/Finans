"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { safeJsonParse } from "@/lib/utils"
import {
  Bold,
  Italic,
  Underline,
  Save,
  Trash2,
  GripVertical,
  NotebookPen,
  X,
  Undo2,
  Redo2,
  Search,
  Minimize2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react"
import { auth } from "@/lib/firebase"
import { isFirestoreReady, listNotes, watchNotes, upsertNote, removeNote } from "@/lib/db"
import type { Note } from "@/lib/types"
import { useSync } from "@/lib/sync-manager"

type Props = {
  open: boolean
  onClose: () => void
}

export function NotesFloat({ open, onClose }: Props) {
  const [notes, setNotes] = useState<Note[]>([])
  const [activeId, setActiveId] = useState<string>("")
  const [title, setTitle] = useState("")
  const editorRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = useState({ x: 20, y: 120 })
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 320, h: 400 })
  const resizingRef = useRef(false)
  const resizeStartRef = useRef({ w: 320, h: 400, x: 0, y: 0, direction: '' as 's' | 'e' | 'se' | '' })
  const [minimized, setMinimized] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [tags, setTags] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const [fontSizePreset, setFontSizePreset] = useState<"small" | "medium" | "large">("medium")
  const [showSidebar, setShowSidebar] = useState(true)
  const [editingTitleId, setEditingTitleId] = useState<string>("")
  const [editingTitleVal, setEditingTitleVal] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const userId = auth?.currentUser?.uid || ""
  const useFs = isFirestoreReady() && !!userId
  const { trackChange } = useSync()

  // Load notes
  useEffect(() => {
    if (!open) return
    if (useFs) {
      const unsub = watchNotes(userId, (list) => {
        const mapped = list.map((n) => ({ ...n, updatedAt: n.updatedAt || new Date().toISOString() }))
        setNotes(mapped)
        if (mapped.length && !activeId) {
          setActiveId(mapped[0].id)
          setTitle(mapped[0].title)
      const html = mapped[0].contentHtml || ""
      if (editorRef.current) editorRef.current.innerHTML = html
      setContent(html)
      setTags((mapped[0] as any).tags?.join(", ") || "")
        }
      })
      listNotes(userId).then((list) => {
        if (list.length && !activeId) {
          setActiveId(list[0].id)
          setTitle(list[0].title)
      const html = list[0].contentHtml || ""
      if (editorRef.current) editorRef.current.innerHTML = html
      setContent(html)
      setTags((list[0] as any).tags?.join(", ") || "")
        }
      })
      return () => { if (unsub) unsub() }
    }
    // localStorage fallback
    const raw = localStorage.getItem("notes")
    const arr: Note[] = raw ? safeJsonParse(raw, []) : []
    setNotes(arr)
    if (arr.length && !activeId) {
      setActiveId(arr[0].id)
      setTitle(arr[0].title)
    const html = arr[0].contentHtml || ""
    if (editorRef.current) editorRef.current.innerHTML = html
    setContent(html)
    setTags((arr[0] as any).tags?.join(", ") || "")
    }
  }, [open, useFs])

  const active = useMemo(() => notes.find((n) => n.id === activeId) || null, [notes, activeId])
  const [lastActiveId, setLastActiveId] = useState<string>("")

  useEffect(() => {
    // Sadece gerçekten farklı bir not seçildiğinde içeriği güncelle
    if (active && editorRef.current && open && activeId !== lastActiveId && activeId) {
      // Eğer kullanıcı yazıyorsa ve otomatik kaydetme bekleniyorsa bekle
      if (isSaving) return
      
      setTitle(active.title)
      const html = active.contentHtml || ""
      editorRef.current.innerHTML = html
      setContent(html)
      setTags((active as any).tags?.join(", ") || "")
      setLastActiveId(activeId)
      setHasUnsavedChanges(false)
      setLastSaved(null)
      
      // Yeni nota geçerken focus'u ayarla
      setTimeout(() => {
        editorRef.current?.focus()
      }, 50)
    }
  }, [activeId, active, open, lastActiveId, isSaving])

  const persistLocal = (arr: Note[]) => {
    localStorage.setItem("notes", JSON.stringify(arr))
  }

  const save = async () => {
    if (isSaving) return // Prevent multiple saves
    setIsSaving(true)
    setHasUnsavedChanges(false)
    
    try {
      const html = editorRef.current?.innerHTML || content || ""
      const noteData = {
        id: activeId,
        title: title || "Yeni Not",
        contentHtml: html,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        updatedAt: new Date().toISOString(),
      } as Note

      if (useFs) {
        const id = await upsertNote(userId, noteData)
        if (!activeId && id) {
          setActiveId(id)
          noteData.id = id
        }
        // Track for offline sync
        trackChange('note', activeId ? 'update' : 'create', noteData)
      } else {
        const updated: Note = {
          ...noteData,
          id: activeId || crypto.randomUUID(),
        }
        const arr = activeId ? notes.map((n) => (n.id === activeId ? updated : n)) : [updated, ...notes]
        setNotes(arr)
        setActiveId(updated.id)
        persistLocal(arr)
      }
      setLastSaved(new Date())
      
    } catch (error) {
      console.error('Not kaydetme hatası:', error)
      setHasUnsavedChanges(true) // Mark as unsaved if save failed
    } finally {
      setIsSaving(false)
    }
  }

  const createNote = async () => {
    // Save current note before creating new one
    if (hasUnsavedChanges && !isSaving) {
      await save()
    }

    if (useFs) {
      const id = await upsertNote(userId, {
        id: "",
        title: "Yeni Not",
        contentHtml: "",
        tags: [],
        updatedAt: new Date().toISOString(),
      } as Note)
      if (id) setActiveId(id)
      setTitle("Yeni Not")
      if (editorRef.current) {
        editorRef.current.innerHTML = ""
        // Focus ve cursor'u başa koy
        setTimeout(() => {
          editorRef.current?.focus()
          const range = document.createRange()
          const selection = window.getSelection()
          range.selectNodeContents(editorRef.current!)
          range.collapse(true)
          selection?.removeAllRanges()
          selection?.addRange(range)
        }, 10)
      }
      setContent("")
      setTags("")
      setHasUnsavedChanges(false)
      setLastSaved(null)
    } else {
      const n: Note = { id: crypto.randomUUID(), title: "Yeni Not", contentHtml: "", updatedAt: new Date().toISOString(), tags: [] }
      const arr = [n, ...notes]
      setNotes(arr)
      setActiveId(n.id)
      setTitle(n.title)
      if (editorRef.current) {
        editorRef.current.innerHTML = ""
        // Focus ve cursor'u başa koy
        setTimeout(() => {
          editorRef.current?.focus()
          const range = document.createRange()
          const selection = window.getSelection()
          range.selectNodeContents(editorRef.current!)
          range.collapse(true)
          selection?.removeAllRanges()
          selection?.addRange(range)
        }, 10)
      }
      setContent("")
      setTags("")
      setHasUnsavedChanges(false)
      setLastSaved(null)
      persistLocal(arr)
    }
  }

  const remove = async () => {
    if (!active) return
    if (useFs) await removeNote(userId, active.id)
    const arr = notes.filter((n) => n.id !== active.id)
    setNotes(arr)
    if (arr.length) setActiveId(arr[0].id)
    else setActiveId("")
    persistLocal(arr)
  }

  // formatting actions using document.execCommand fallbacks for simplicity
  const fmt = (cmd: string, val?: string) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
  }

  const applyFontPreset = (preset: "small" | "medium" | "large") => {
    setFontSizePreset(preset)
    const sizeMap: Record<typeof preset, string> = {
      small: "2", // ~13px
      medium: "3", // ~16px
      large: "4", // ~18px
    }
    fmt("fontSize", sizeMap[preset])
  }

  // Drag + Resize logic (stable listeners)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingRef.current) {
        const nx = e.clientX - offsetRef.current.x
        const ny = e.clientY - offsetRef.current.y
        // clamp within viewport
        const maxX = Math.max(0, (window.innerWidth || 0) - size.w - 8)
        const maxY = Math.max(0, (window.innerHeight || 0) - 40)
        setPos({ x: Math.min(Math.max(0, nx), maxX), y: Math.min(Math.max(0, ny), maxY) })
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
            newHeight = Math.max(220, Math.min(800, resizeStartRef.current.h + dy))
            break
          case 'e': // East (right)
            newWidth = Math.max(320, Math.min(900, resizeStartRef.current.w + dx))
            break
          case 'se': // Southeast (bottom-right)
            newWidth = Math.max(320, Math.min(900, resizeStartRef.current.w + dx))
            newHeight = Math.max(220, Math.min(800, resizeStartRef.current.h + dy))
            break
        }
        
        setSize({ w: newWidth, h: newHeight })
        // Position doesn't change for right/bottom only resizing
      }
    }
    const onUp = () => {
      if (draggingRef.current || resizingRef.current) {
        draggingRef.current = false
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
  }, [size.w, size.h])

  const startDrag = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    // don't drag from buttons/inputs
    if ((e.target as HTMLElement).closest("button, input")) return
    draggingRef.current = true
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    document.body.style.userSelect = "none"
    document.body.style.cursor = "grabbing"
    e.preventDefault()
  }

  const startResize = (e: React.MouseEvent, direction: 's' | 'e' | 'se' = 'se') => {
    if (e.button !== 0) return
    resizingRef.current = true
    resizeStartRef.current = { w: size.w, h: size.h, x: e.clientX, y: e.clientY, direction }
    document.body.style.userSelect = "none"
    document.body.style.cursor = `${direction}-resize`
    e.preventDefault()
  }

  const toggleSidebar = () => {
    setShowSidebar((prev) => {
      const next = !prev
      // notebook'u daralt/genişlet: ~220px
      setSize((s) => ({
        w: next ? Math.min(s.w + 220, 900) : Math.max(320, s.w - 220),
        h: s.h,
      }))
      return next
    })
  }

  const startEditTitle = (note: Note) => {
    setEditingTitleId(note.id)
    setEditingTitleVal(note.title || "")
  }

  const commitEditTitle = async (saveEdit: boolean) => {
    const id = editingTitleId
    if (!id) return
    const note = notes.find((n) => n.id === id)
    const newTitle = (editingTitleVal || "").trim()
    setEditingTitleId("")
    if (!saveEdit || !note) return
    if (useFs) {
      await upsertNote(userId, {
        id,
        title: newTitle || "Yeni Not",
        contentHtml: note.contentHtml || "",
        tags: (note as any).tags || [],
        updatedAt: new Date().toISOString(),
      } as Note)
      // optimistic UI update
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title: newTitle || "Yeni Not" } : n)))
    } else {
      const now = new Date().toISOString()
      const arr = notes.map((n) => (n.id === id ? { ...n, title: newTitle || "Yeni Not", updatedAt: now } : n))
      setNotes(arr)
      persistLocal(arr)
    }
    if (activeId === id) setTitle(newTitle || "Yeni Not")
  }

  // Content değişikliklerini takip et (kaydetme yapmadan)
  useEffect(() => {
    if (!open || !activeId) return
    
    // Get current content from editor
    const currentContent = editorRef.current?.innerHTML || content || ""
    
    // Compare to active note; for new notes, treat non-empty content/title/tags as change
    const current = notes.find((n) => n.id === activeId)
    const hasTyped = (title.trim().length > 0) || (tags.trim().length > 0) || currentContent.trim().length > 0
    
    const changed = current
      ? (current.title !== title || 
         (current as any).tags?.join(", ") !== tags || 
         current.contentHtml !== currentContent)
      : hasTyped
    
    setHasUnsavedChanges(changed)
  }, [title, tags, content, activeId, open, notes])

  // Editor content change handler
  const handleEditorInput = () => {
    if (!editorRef.current) return
    
    const newContent = editorRef.current.innerHTML
    
    // Sadece gerçekten içerik değişmişse güncelle
    if (newContent !== content) {
      setContent(newContent)
    }
  }

  // Mobile touch handler for better scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    // Allow touch scrolling on mobile
    e.stopPropagation()
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    // Allow touch scrolling on mobile
    e.stopPropagation()
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return
      
      // Ctrl+S to save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault()
        save()
      }
      
      // Ctrl+N to create new note
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault()
        createNote()
      }
      
      // Ctrl+W to close (with auto-save)
      if (e.ctrlKey && e.key === 'w') {
        e.preventDefault()
        handleClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, hasUnsavedChanges, isSaving])

  // Component unmount sırasında kaydet
  useEffect(() => {
    return () => {
      // Component kapanırken kaydedilmemiş değişiklikler varsa kaydet
      if (hasUnsavedChanges && !isSaving) {
        save()
      }
    }
  }, [hasUnsavedChanges, isSaving])

  // Pencere kapatılırken otomatik kaydet
  const handleClose = async () => {
    if (hasUnsavedChanges && !isSaving) {
      await save()
    }
    onClose()
  }

  if (!open) return null

  return (
    <div 
      style={{ 
        position: "fixed", 
        left: typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : pos.x, 
        top: typeof window !== 'undefined' && window.innerWidth < 640 ? 60 : pos.y, 
        zIndex: 60, 
        width: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100vw - 10px)' : size.w,
        height: typeof window !== 'undefined' && window.innerWidth < 640 ? 'calc(100vh - 140px)' : size.h,
        maxWidth: typeof window !== 'undefined' && window.innerWidth < 640 ? '95vw' : 'none'
      }} 
      className="select-none"
    >
      <Card className="border-border/60 bg-card/95 backdrop-blur relative h-full overflow-hidden" style={{ width: '100%' }}>
        <div ref={dragRef} onMouseDown={startDrag} className="flex items-center justify-between cursor-grab active:cursor-grabbing px-1 sm:px-2 py-1 border-b border-border/50">
          <div className="flex items-center gap-1 text-xs font-semibold overflow-hidden">
            <GripVertical className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" /> 
            <span className="hidden sm:inline">Not Defteri</span>
            <span className="sm:hidden">Not</span>
            {/* Save status indicator */}
            {isSaving && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="hidden sm:inline">Kaydediliyor...</span>
                <span className="sm:hidden">•••</span>
              </div>
            )}
            {hasUnsavedChanges && !isSaving && (
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <div className="w-2 h-2 bg-orange-500 rounded-full" />
                <span className="hidden sm:inline">Kaydedilmemiş değişiklikler (Ctrl+S ile kaydet)</span>
                <span className="sm:hidden">*</span>
              </div>
            )}
            {lastSaved && !hasUnsavedChanges && !isSaving && (
              <div className="text-xs text-green-600">
                <span className="hidden sm:inline">✓ {new Date(lastSaved).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} tarihinde kaydedildi</span>
                <span className="sm:hidden">✓</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 p-0" onClick={() => setMinimized((m) => !m)} title={minimized ? "Genişlet" : "Küçült"}>{minimized ? <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4" /> : <Minimize2 className="h-3 w-3 sm:h-4 sm:w-4" />}</Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 p-0" onClick={createNote} title="Yeni Not"><NotebookPen className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6 sm:h-8 sm:w-8 p-0"
              onClick={save} 
              disabled={isSaving}
              title={isSaving ? "Kaydediliyor..." : "Kaydet"}
            >
              <Save className={`h-3 w-3 sm:h-4 sm:w-4 ${isSaving ? 'animate-pulse' : ''}`} />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 p-0" onClick={remove} title="Sil"><Trash2 className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 p-0" onClick={handleClose} title="Kapat"><X className="h-3 w-3 sm:h-4 sm:w-4" /></Button>
          </div>
        </div>

        {!minimized && (
          <div className="p-1 sm:p-2 h-full overflow-hidden" style={{ width: typeof window !== 'undefined' && window.innerWidth < 640 ? '100%' : size.w }}>
            <div className="grid gap-1 sm:gap-2 h-full" style={{ gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 640 ? "1fr" : (showSidebar ? "220px 1fr" : "1fr") }}>
              {/* Left sidebar: search + note list */}
              {showSidebar && typeof window !== 'undefined' && window.innerWidth >= 640 && (
              <div className="pr-2 border-r border-border/40 overflow-hidden">
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)} placeholder="Notlarda ara..." className="pl-8 text-xs" />
                </div>
                <div className="mb-2">
                  <Input value={tags} onChange={(e) => setTags((e.target as HTMLInputElement).value)} placeholder="Etiketler (virgülle)" className="text-xs" />
                </div>
                <div className="overflow-auto rounded-md flex-1 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}>
                  <ul className="space-y-1">
                    {notes
                      .filter((n) => {
                        if (!searchTerm) return true
                        const q = searchTerm.toLowerCase()
                        return (
                          (n.title || "").toLowerCase().includes(q) ||
                          (n.contentHtml || "").toLowerCase().includes(q) ||
                          ((n as any).tags || []).some((t: string) => (t || "").toLowerCase().includes(q))
                        )
                      })
                      .map((n, idx) => {
                        const isActive = n.id === activeId
                        return (
                          <li key={n.id}>
                            <div
                              onClick={async () => {
                                // Auto-save current note before switching
                                if (hasUnsavedChanges && !isSaving && activeId !== n.id) {
                                  await save()
                                }
                                setActiveId(n.id)
                              }}
                              className={`w-full rounded px-2 py-1 border cursor-pointer ${isActive ? "bg-primary/10 border-primary" : "border-transparent hover:bg-muted/50"}`}
                              onDoubleClick={(e) => { e.stopPropagation(); startEditTitle(n) }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div>
                                  <div className="text-xs text-muted-foreground">Sayfa {idx + 1}</div>
                                  {editingTitleId === n.id ? (
                                    <Input
                                      autoFocus
                                      value={editingTitleVal}
                                      onChange={(e) => setEditingTitleVal((e.target as HTMLInputElement).value)}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); commitEditTitle(true) }
                                        else if (e.key === "Escape") { e.preventDefault(); commitEditTitle(false) }
                                      }}
                                      onBlur={() => commitEditTitle(true)}
                                      className="h-7 mt-0.5"
                                    />
                                  ) : (
                                    <div className="font-medium truncate">{n.title || "(Adsız)"}</div>
                                  )}
                                </div>
                                {editingTitleId !== n.id && (
                                  <Button size="icon" variant="ghost" className="shrink-0" title="Başlığı düzenle"
                                    onClick={(e: ReactMouseEvent<HTMLButtonElement>) => { e.stopPropagation(); startEditTitle(n) }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              {Array.isArray((n as any).tags) && (n as any).tags.length > 0 && (
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                  {(n as any).tags.slice(0, 3).map((t: string) => (
                                    <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">#{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </li>
                        )
                      })}
                  </ul>
                </div>
              </div>
              )}

              {/* Right: title + toolbar + editor */}
              <div className="pl-2">
                <Input value={title} onChange={(e) => setTitle((e.target as HTMLInputElement).value)} placeholder="Başlık" className="mb-2" />
                <div className="flex flex-wrap items-center gap-1 mb-2">
                  <Button size="sm" variant="outline" onClick={toggleSidebar} title={showSidebar ? "Sayfa listesini gizle" : "Sayfa listesini göster"}>
                    {showSidebar ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => fmt("undo")}> <Undo2 className="h-4 w-4" /> </Button>
                  <Button size="sm" variant="outline" onClick={() => fmt("redo")}> <Redo2 className="h-4 w-4" /> </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                  <Button size="sm" variant="outline" onClick={() => fmt("bold")}> <Bold className="h-4 w-4" /> </Button>
                  <Button size="sm" variant="outline" onClick={() => fmt("italic")}> <Italic className="h-4 w-4" /> </Button>
                  <Button size="sm" variant="outline" onClick={() => fmt("underline")}> <Underline className="h-4 w-4" /> </Button>
                  <div className="w-px h-6 bg-border mx-1" />
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant={fontSizePreset === "small" ? "default" : "outline"} onClick={() => applyFontPreset("small")}>Küçük</Button>
                    <Button size="sm" variant={fontSizePreset === "medium" ? "default" : "outline"} onClick={() => applyFontPreset("medium")}>Orta</Button>
                    <Button size="sm" variant={fontSizePreset === "large" ? "default" : "outline"} onClick={() => applyFontPreset("large")}>Büyük</Button>
                  </div>
                  <div className="w-px h-6 bg-border mx-1" />
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="color-text" className="text-xs text-muted-foreground">Yazı</Label>
                      <input id="color-text" type="color" className="h-7 w-7 rounded border border-border" onChange={(e) => fmt("foreColor", (e.target as HTMLInputElement).value)} title="Yazı Rengi" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="color-bg" className="text-xs text-muted-foreground">Arka plan</Label>
                      <input id="color-bg" type="color" className="h-7 w-7 rounded border border-border" onChange={(e) => fmt("backColor", (e.target as HTMLInputElement).value)} title="Arka Plan" />
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={save} disabled={isSaving} className="ml-auto">
                    {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </div>
                <div
                  ref={editorRef}
                  onInput={handleEditorInput}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  className="overflow-auto border border-border/60 rounded-md p-2 bg-background touch-pan-y"
                  style={{ 
                    height: typeof window !== 'undefined' && window.innerWidth < 640 
                      ? 'calc(100vh - 250px)' 
                      : size.h,
                    maxHeight: typeof window !== 'undefined' && window.innerWidth < 640 
                      ? 'calc(100vh - 250px)' 
                      : 'none',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    touchAction: 'pan-y',
                    scrollBehavior: 'smooth'
                  }}
                  contentEditable
                  suppressContentEditableWarning
                />
              </div>
            </div>
          </div>
        )}
        {/* Simplified Resize Handles - Only right and bottom */}
        {!minimized && (
          <>
            {/* Right edge */}
            <div 
              className="absolute right-0 top-1 bottom-1 w-1 cursor-e-resize hover:bg-primary/20"
              onMouseDown={(e) => startResize(e, 'e')}
            />
            
            {/* Bottom edge */}
            <div 
              className="absolute bottom-0 left-1 right-1 h-1 cursor-s-resize hover:bg-primary/20"
              onMouseDown={(e) => startResize(e, 's')}
            />
            
            {/* Bottom-right corner (main resize handle) */}
            <div 
              className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-muted/50 hover:bg-primary/50"
              onMouseDown={(e) => startResize(e, 'se')}
            />
          </>
        )}
      </Card>
    </div>
  )
}
