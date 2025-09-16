"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { 
  Home, 
  CreditCard, 
  Receipt, 
  Target, 
  Bell,
  BarChart3,
  TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { PageNotificationToggle, getPageName } from "@/components/page-notification-toggle"
import { motion } from "framer-motion"

interface NavItem {
  href: string
  icon: React.ComponentType<any>
  label: string
  badge?: number
}

const navItems: NavItem[] = [
  {
    href: "/",
    icon: Home,
    label: "Ana Sayfa"
  },
  {
    href: "/odemeler",
    icon: Receipt,
    label: "Ödemeler"
  },
  {
    href: "/yatirimlar",
    icon: TrendingUp,
    label: "Yatırımlar"
  },
  {
    href: "/kartlarim",
    icon: CreditCard,
    label: "Kartlar"
  },
  {
    href: "/budgets",
    icon: Target,
    label: "Bütçeler"
  }
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <motion.div 
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 md:hidden"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center justify-around flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <motion.div
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-1 relative",
                    "transition-colors duration-200 rounded-lg",
                    isActive 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="relative">
                    <Icon 
                      className={cn(
                        "h-4 w-4 transition-all duration-200",
                        isActive && "scale-110"
                      )} 
                    />
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    
                    {/* Active indicator */}
                    {isActive && (
                      <motion.div
                        className="absolute -bottom-3 left-1/2 w-1 h-1 bg-primary rounded-full"
                        layoutId="activeIndicator"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        style={{ x: "-50%" }}
                      />
                    )}
                  </div>
                  
                  <span 
                    className={cn(
                      "text-[10px] font-medium mt-1 leading-none",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </motion.div>
              </Link>
            )
          })}
        </div>
        
        {/* Sayfa Bildirim Toggle */}
        <div className="flex items-center justify-center px-2">
          <PageNotificationToggle 
            page={getPageName(pathname)} 
            size="sm" 
            variant="ghost"
          />
        </div>
      </div>
    </motion.div>
  )
}
