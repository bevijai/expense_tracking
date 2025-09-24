import { supabase } from '@/lib/supabaseClient'
import { Database } from '@/types/database'

type ItineraryDay = Database['public']['Tables']['itinerary_days']['Row']
type ItineraryItem = Database['public']['Tables']['itinerary_items']['Row']

export async function listItinerary(roomId: string) {
  const { data: days, error } = await supabase
    .from('itinerary_days')
    .select('*')
    .eq('room_id', roomId)
    .order('date', { ascending: true })

  if (error) throw error

  if (!days || days.length === 0) return []

  const dayIds = days.map(d => d.id)
  const { data: items, error: itemsError } = await supabase
    .from('itinerary_items')
    .select('*')
    .in('day_id', dayIds)
    .order('time', { ascending: true })

  if (itemsError) throw itemsError

  const grouped: Record<string, ItineraryItem[]> = {}
  ;(items || []).forEach(it => {
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
  return data
}

export async function addItem(dayId: string, values: Partial<Omit<ItineraryItem,'id'|'day_id'|'created_at'>>) {
  const { data, error } = await supabase
    .from('itinerary_items')
    .insert({ day_id: dayId, title: values.title || 'Untitled', time: values.time || null, notes: values.notes || null, location: values.location || null })
    .select('*')
    .single()
  if (error) throw error
  return data
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