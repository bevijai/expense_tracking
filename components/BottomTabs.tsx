"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarRange, Wallet2, NotebookText, Users } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

interface Tab {
	label: string
	href: string
	icon: React.ReactNode
}

const tabs: Tab[] = [
	{ label: 'Home', href: '/dashboard', icon: <Home className="h-5 w-5" /> },
	{ label: 'Itinerary', href: '/itinerary', icon: <CalendarRange className="h-5 w-5" /> },
	{ label: 'Expenses', href: '/rooms', icon: <Wallet2 className="h-5 w-5" /> },
	{ label: 'Journal', href: '/journal', icon: <NotebookText className="h-5 w-5" /> },
	{ label: 'Group', href: '/group', icon: <Users className="h-5 w-5" /> },
]

export function BottomTabs() {
	const pathname = usePathname()
	const { user } = useAuth()

	// Hide on auth/setup pages or if not logged in
	if (!user) return null
	if (pathname?.startsWith('/login') || pathname?.startsWith('/setup')) return null

	return (
		<nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 shadow-lg shadow-black/5">
			<ul className="flex justify-around items-stretch h-16 px-2">
				{tabs.map(tab => {
					const active = pathname === tab.href || pathname?.startsWith(tab.href + '/')
					return (
						<li key={tab.href} className="flex-1">
							<Link
								href={tab.href}
								className={
									'group flex flex-col items-center justify-center gap-1 h-full text-xs font-medium transition-all ' +
									(active
										? 'text-blue-600 relative after:absolute after:-bottom-0.5 after:h-1.5 after:w-1.5 after:rounded-full after:bg-blue-600'
										: 'text-gray-500 hover:text-gray-800')
								}
							>
								<span
									className={
										'transition-colors ' +
										(active ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-800')
									}
								>
									{tab.icon}
								</span>
								<span className="leading-none">{tab.label}</span>
							</Link>
						</li>
					)
				})}
			</ul>
			<div className="h-[env(safe-area-inset-bottom)]" />
		</nav>
	)
}
