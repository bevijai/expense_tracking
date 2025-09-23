import './globals.css'
import type { Metadata } from 'next'

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
      <body>{children}</body>
    </html>
  )
}