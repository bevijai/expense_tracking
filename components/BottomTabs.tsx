"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, Wallet, Images, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/itinerary', label: 'Itinerary', icon: CalendarDays },
  { href: '/rooms', label: 'Expenses', icon: Wallet },
  { href: '/journal', label: 'Journal', icon: Images },
  { href: '/group', label: 'Group', icon: Users },
]

export function BottomTabs() {
  const pathname = usePathname() || ''

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-t">
      <ul className="mx-auto max-w-4xl grid grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="">
              <Link
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center py-2 text-xs transition-colors',
                  active ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Icon className={cn('h-5 w-5 mb-1', active ? 'stroke-[2.5]' : undefined)} />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
