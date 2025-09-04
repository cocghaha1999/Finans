"use client"

import { useState } from 'react'
import { EnhancedHeader } from "@/components/enhanced-header"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"
import ClientHeaderGate from "@/app/route-header-gate"
import { CalendarFloat } from "@/components/calendar-float"
import { NotesFloat } from "@/components/notes-float"

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  return (
    <>
      <ClientHeaderGate>
        <EnhancedHeader 
          onNotesOpen={() => setNotesOpen(true)}
          onCalendarOpen={() => setCalendarOpen(true)}
        />
      </ClientHeaderGate>
      
      {/* Main content with mobile-aware padding */}
      <main className="min-h-screen pb-20 md:pb-0">
        {children}
      </main>
      
      {/* Mobile bottom navigation */}
      <MobileBottomNav />
      
      {/* Floating components */}
      <CalendarFloat />
      <NotesFloat 
        open={notesOpen} 
        onClose={() => setNotesOpen(false)} 
      />
    </>
  )
}
