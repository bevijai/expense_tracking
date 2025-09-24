import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database'

type ItineraryDay = Database['public']['Tables']['itinerary_days']['Row']
type ItineraryItem = Database['public']['Tables']['itinerary_items']['Row']

export async function listItinerary(roomId: string) {
  const { data: rawDays, error } = await supabase
    .from('itinerary_days')
    .select('*')
    .eq('room_id', roomId)
    .order('date', { ascending: true })

  if (error) throw error

  const days = (rawDays as ItineraryDay[] | null) || []
  if (days.length === 0) return []

  const dayIds = days.map(d => d.id)
  const { data: rawItems, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('*')
    .in('day_id', dayIds)
    .order('time', { ascending: true })

  if (itemsError) throw itemsError

  const items = (rawItems as ItineraryItem[] | null) || []
  const grouped: Record<string, ItineraryItem[]> = {}
  items.forEach(it => {
    grouped[it.day_id] = grouped[it.day_id] || []
    grouped[it.day_id].push(it)
  })

  return days.map(d => ({ day: d, items: grouped[d.id] || [] }))
}

export async function addDay(roomId: string, date: string) {
  const { data, error } = await supabase
    .from('itinerary_days')
    .insert({ room_id: roomId, date })
    .select('*')
    .single()
  if (error) throw error
  return data as ItineraryDay
}

export async function addItem(dayId: string, values: Partial<Omit<ItineraryItem,'id'|'day_id'|'created_at'>>) {
  const { data, error } = await supabase
    .from('itinerary_items')
    .insert({
      day_id: dayId,
      title: values.title || 'Untitled',
      time: values.time || null,
      notes: values.notes || null,
      location: values.location || null
    })
    .select('*')
    .single()
  if (error) throw error
  return data as ItineraryItem
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from('itinerary_items').delete().eq('id', id)
  if (error) throw error
}

export async function deleteDay(id: string) {
  // Cascade: delete items first
  const { error: itemsError } = await supabase.from('itinerary_items').delete().eq('day_id', id)
  if (itemsError) throw itemsError
  const { error } = await supabase.from('itinerary_days').delete().eq('id', id)
  if (error) throw error
}

// Bulk add a range of days (inclusive). Guards against adding duplicates.
export async function addDaysRange(roomId: string, startDate: string, endDate: string) {
  const start = new Date(startDate + 'T00:00:00Z')
  const end = new Date(endDate + 'T00:00:00Z')
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error('Invalid start or end date')
  if (start > end) throw new Error('Start date must be before or equal to end date')
  // Hard safety limit
  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1
  if (diffDays > 60) throw new Error('Range too large (max 60 days)')

  const { data: existing, error: existingErr } = await supabase
    .from('itinerary_days')
    .select('date')
    .eq('room_id', roomId)
  if (existingErr) throw existingErr
  const existingSet = new Set((existing || []).map(d => d.date))

  const rows: { room_id: string; date: string }[] = []
  for (let i = 0; i < diffDays; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    const iso = d.toISOString().split('T')[0]
    if (!existingSet.has(iso)) rows.push({ room_id: roomId, date: iso })
  }
  if (rows.length === 0) return { inserted: 0 }
  const { error: insertErr } = await supabase
    .from('itinerary_days')
    .insert(rows)
  if (insertErr) throw insertErr
  return { inserted: rows.length }
}