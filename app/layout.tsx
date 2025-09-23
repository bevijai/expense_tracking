import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { TopNav } from '@/components/TopNav'

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
      <body className={inter.className}>
        <TopNav />
        {children}
        <Toaster />
      </body>
    </html>
  )
}