import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname === '/ok2') {
    return new NextResponse('OK-mw', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    })
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/ok2'],
}
