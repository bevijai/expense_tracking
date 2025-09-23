"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/useAuth"

const tabs = [
  { label: "Home", href: "/dashboard" },
  { label: "Itinerary", href: "/itinerary" },
  { label: "Expenses", href: "/rooms" },
  { label: "Journal", href: "/journal" },
  { label: "Group", href: "/group" },
]

export function TopNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  // Hide on unauthenticated-critical routes
  const hide = pathname?.startsWith("/login") || pathname?.startsWith("/setup")

  if (hide) return null

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/50">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        <Link href={user ? "/dashboard" : "/"} className="text-sm font-semibold tracking-tight">
          Trip Expenses
        </Link>
        <nav className="flex items-center gap-1">
          {tabs.map((t) => {
            const active = pathname === t.href || pathname?.startsWith(t.href + "/")
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-accent hover:text-foreground"
                )}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
