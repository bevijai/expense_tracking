import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  return NextResponse.json({
    ok: true,
    supabaseUrlPresent: Boolean(url),
    anonKeyPresent: Boolean(anon),
  })
}
