"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { 
  Menu, 
  Bell, 
  Search, 
  Settings,
  User,
  Wallet,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  Calendar,
  NotebookPen
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BalanceChip } from "./balance-chip"
import { NotificationCenter } from "./notification-center-clean"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { formatTRY } from "@/lib/utils"
import Link from "next/link"

interface EnhancedHeaderProps {
  totalBalance?: number
  notificationCount?: number
  userName?: string
  onNotesOpen?: () => void
  onCalendarOpen?: () => void
}

const pageNames: Record<string, string> = {
  "/": "Ana Sayfa",
  "/kartlarim": "Kartlarım",
  "/odemeler": "Ödemeler", 
  "/budgets": "Bütçe",
  "/notifications": "Bildirimler",
  "/login": "Giriş Yap"
}

export function EnhancedHeader({ 
  totalBalance = 0, 
  notificationCount = 0,
  userName = "Kullanıcı",
  onNotesOpen,
  onCalendarOpen
}: EnhancedHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()

  // Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const currentPageName = pageNames[pathname] || "CostikFinans"
  const isLoginPage = pathname === "/login"

  return (
    <motion.header 
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        isScrolled 
          ? "bg-background/80 backdrop-blur-lg border-b border-border/50 shadow-sm" 
          : "bg-transparent"
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-3">
            {!isLoginPage && (
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="md:hidden"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                  <SheetHeader>
                    <SheetTitle className="text-left">CostikFinans</SheetTitle>
                  </SheetHeader>
                  <MobileSidebarContent 
                    userName={userName}
                    totalBalance={totalBalance}
                    onClose={() => setIsSheetOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            )}

            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold">{currentPageName}</h1>
              {totalBalance > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge 
                    variant="outline" 
                    className="hidden sm:inline-flex font-medium"
                  >
                    {formatTRY(totalBalance)}
                  </Badge>
                </motion.div>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {!isLoginPage && (
              <>
                {/* Balance chip */}
                <BalanceChip />
                
                {/* Search button - hidden on mobile */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="hidden md:inline-flex"
                >
                  <Search className="h-4 w-4" />
                </Button>

                {/* Notifications */}
                <NotificationCenter />

                {/* User menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden md:inline-flex">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Hesabım</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onNotesOpen}>
                      <NotebookPen className="mr-2 h-4 w-4" />
                      Not Defteri
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onCalendarOpen}>
                      <Calendar className="mr-2 h-4 w-4" />
                      Takvim
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      Ayarlar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                      {theme === "light" ? (
                        <Moon className="mr-2 h-4 w-4" />
                      ) : (
                        <Sun className="mr-2 h-4 w-4" />
                      )}
                      Tema Değiştir
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Çıkış Yap
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  )
}

// Mobile sidebar content
function MobileSidebarContent({ 
  userName, 
  totalBalance, 
  onClose 
}: { 
  userName: string
  totalBalance: number
  onClose: () => void 
}) {
  const { theme, setTheme } = useTheme()

  const menuItems = [
    { icon: User, label: "Profil", href: "/profile" },
    { icon: Wallet, label: "Cüzdan", href: "/wallet" },
    { icon: Settings, label: "Ayarlar", href: "/settings" },
  ]

  return (
    <div className="flex flex-col h-full pt-6">
      {/* User info */}
      <div className="px-2 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{userName}</p>
            <p className="text-sm text-muted-foreground">
              {formatTRY(totalBalance)}
            </p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <nav className="flex-1 px-2 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Theme toggle */}
      <div className="px-2 py-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="w-full justify-start"
        >
          {theme === "light" ? (
            <Moon className="mr-2 h-4 w-4" />
          ) : (
            <Sun className="mr-2 h-4 w-4" />
          )}
          Tema Değiştir
        </Button>
      </div>
    </div>
  )
}
