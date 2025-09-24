import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { TopNav } from '@/components/TopNav'
import { BottomTabs } from '@/components/BottomTabs'

// Note: temporary disable metadata to isolate Netlify 500
const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Trip Expenses - Track Shared Expenses',
  description: 'Track and split expenses with friends and family on your trips',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className + ' min-h-screen bg-gradient-to-b from-white to-slate-50 antialiased'}>
        <TopNav />
        <main className="pb-20 md:pb-0 pt-2 md:pt-4 max-w-screen-md mx-auto px-3 md:px-6 w-full">
          {children}
        </main>
        <BottomTabs />
        <Toaster />
      </body>
    </html>
  )
}