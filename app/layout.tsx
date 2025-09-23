import './globals.css'
import type { Metadata } from 'next'

// Note: temporary disable metadata to isolate Netlify 500
export const metadata = {} as Metadata

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