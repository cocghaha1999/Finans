"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const [pos, setPos] = useState({ x: 24, y: 100 })
  const draggingRef = useRef(false)
  const offsetRef = useRef({ x: 0, y: 0 })
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 480, h: 340 })
  const resizingRef = useRef(false)
  const resizeStartRef = useRef({ w: 480, h: 340, x: 0, y: 0 })
  const [minimized, setMinimized] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [tags, setTags] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const saveTimerRef = useRef<number | null>(null)
  const [fontSizePreset, setFontSizePreset] = useState<"small" | "medium" | "large">("medium")
  const [showSidebar, setShowSidebar] = useState(true)
  const [editingTitleId, setEditingTitleId] = useState<string>("")
  const [editingTitleVal, setEditingTitleVal] = useState<string>("")

  const userId = auth?.currentUser?.uid || ""
  const useFs = isFirestoreReady() && !!userId

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
    const arr: Note[] = raw ? JSON.parse(raw) : []
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

  useEffect(() => {
    if (active && editorRef.current && open) {
      setTitle(active.title)
  const html = active.contentHtml || ""
  editorRef.current.innerHTML = html
  setContent(html)
  setTags((active as any).tags?.join(", ") || "")
    }
  }, [activeId])

  const persistLocal = (arr: Note[]) => {
    localStorage.setItem("notes", JSON.stringify(arr))
  }

  const save = async () => {
    const html = editorRef.current?.innerHTML || content || ""
    if (useFs) {
      const id = await upsertNote(userId, {
        id: activeId,
        title: title || "Yeni Not",
        contentHtml: html,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        updatedAt: new Date().toISOString(),
      } as Note)
      if (!activeId && id) setActiveId(id)
    } else {
      const now = new Date().toISOString()
      const updated: Note = {
        id: activeId || crypto.randomUUID(),
        title: title || "Yeni Not",
        contentHtml: html,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        updatedAt: now,
      }
      const arr = activeId ? notes.map((n) => (n.id === activeId ? updated : n)) : [updated, ...notes]
      setNotes(arr)
      setActiveId(updated.id)
      persistLocal(arr)
    }
  }

  const createNote = async () => {
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
      if (editorRef.current) editorRef.current.innerHTML = ""
      setContent("")
      setTags("")
    } else {
      const n: Note = { id: crypto.randomUUID(), title: "Yeni Not", contentHtml: "", updatedAt: new Date().toISOString(), tags: [] }
      const arr = [n, ...notes]
      setNotes(arr)
      setActiveId(n.id)
      setTitle(n.title)
      if (editorRef.current) editorRef.current.innerHTML = ""
      setContent("")
      setTags("")
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
        const nw = Math.max(320, Math.min(900, resizeStartRef.current.w + dx))
        const nh = Math.max(220, Math.min(800, resizeStartRef.current.h + dy))
        setSize({ w: nw, h: nh })
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

  const startResize = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    resizingRef.current = true
    resizeStartRef.current = { w: size.w, h: size.h, x: e.clientX, y: e.clientY }
    document.body.style.userSelect = "none"
    document.body.style.cursor = "se-resize"
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

  // Autosave on changes (debounced)
  useEffect(() => {
    if (!open) return
    // compare to active; for new (no current), treat non-empty content/title/tags as change
    const current = activeId ? notes.find((n) => n.id === activeId) : undefined
    const hasTyped = (title.trim().length > 0) || (tags.trim().length > 0) || ((content || "").trim().length > 0)
    const changed = current
      ? (current.title !== title || (current as any).tags?.join(", ") !== tags || current.contentHtml !== content)
      : hasTyped
    if (!changed) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      save()
    }, 800)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [title, tags, content, activeId, open, notes])

  if (!open) return null

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 60, width: size.w }} className="select-none">
      <Card className="border-border/60 bg-card/95 backdrop-blur relative" style={{ width: size.w }}>
        <div ref={dragRef} onMouseDown={startDrag} className="flex items-center justify-between cursor-grab active:cursor-grabbing px-2 py-1 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm font-semibold"><GripVertical className="h-4 w-4" /> Not Defteri</div>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" onClick={() => setMinimized((m) => !m)} title={minimized ? "Genişlet" : "Küçült"}>{minimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}</Button>
            <Button size="icon" variant="ghost" onClick={createNote} title="Yeni Not"><NotebookPen className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={save} title="Kaydet"><Save className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={remove} title="Sil"><Trash2 className="h-4 w-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onClose} title="Kapat"><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {!minimized && (
          <div className="p-2" style={{ width: size.w }}>
            <div className="grid gap-2" style={{ gridTemplateColumns: showSidebar ? "220px 1fr" : "1fr" }}>
              {/* Left sidebar: search + note list */}
              {showSidebar && (
              <div className="pr-2 border-r border-border/40" style={{ height: size.h }}>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)} placeholder="Notlarda ara..." className="pl-8" />
                </div>
                <div className="mb-2">
                  <Input value={tags} onChange={(e) => setTags((e.target as HTMLInputElement).value)} placeholder="Etiketler (virgülle)" />
                </div>
                <div className="overflow-auto rounded-md" style={{ height: `calc(${size.h}px - 68px)` }}>
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
                              onClick={() => setActiveId(n.id)}
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
                  <Button size="sm" variant="ghost" onClick={save} className="ml-auto">Kaydet</Button>
                </div>
                <div
                  ref={editorRef}
                  onInput={() => setContent(editorRef.current?.innerHTML || "")}
                  className="overflow-auto border border-border/60 rounded-md p-2 bg-background"
                  style={{ height: size.h }}
                  contentEditable
                  suppressContentEditableWarning
                />
              </div>
            </div>
          </div>
        )}
        {/* Resize handle */}
        {!minimized && (
          <div
            onMouseDown={startResize}
            title="Yeniden boyutlandır"
            className="absolute right-1 bottom-1 h-3 w-3 cursor-se-resize"
            style={{ borderRight: "6px solid transparent", borderBottom: "6px solid hsl(var(--border))" }}
          />
        )}
      </Card>
    </div>
  )
}
