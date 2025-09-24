"use client"

import { useEffect, useState } from 'react'
import { listItinerary, addDay, addItem, deleteItem, deleteDay } from '@/lib/itinerary'
import { useAuth } from '@/lib/hooks/useAuth'
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react'
import { createClientSupabaseClient } from '@/lib/supabase/client'

interface DayBundle {
  day: { id: string; date: string }
  items: Array<{ id: string; day_id: string; time: string | null; title: string; notes?: string | null; location?: string | null }>
}

export default function ItineraryPage() {
  const { user, loading } = useAuth()
  const [roomId, setRoomId] = useState<string | null>(null) // auto-detected or manually entered
  const [detecting, setDetecting] = useState(false)
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([])
  const [data, setData] = useState<DayBundle[]>([])
  const [fetching, setFetching] = useState(false)
  const [addingDay, setAddingDay] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-detect a room for the user: first membership, else first owned
  useEffect(() => {
    if (loading) return
    if (!user) return
    if (roomId) return
    let cancelled = false
    async function detect() {
      setDetecting(true)
      const supabase = createClientSupabaseClient()
      try {
        const uid = user?.id
        if (!uid) { setDetecting(false); return }
        // find memberships
        const { data: memberRows, error: memberErr } = await supabase
          .from('room_members')
          .select('room_id, rooms!inner(id, name)')
          .limit(10)
        if (memberErr) throw memberErr
        const memberRooms: Array<{ id: string; name: string }> = []
        memberRows?.forEach((r: any) => {
          if (r.rooms) memberRooms.push({ id: r.rooms.id, name: r.rooms.name })
        })
        if (!cancelled && memberRooms.length > 0) {
          setRooms(memberRooms)
          setRoomId(memberRooms[0].id)
          return
        }
        // fallback: owned rooms
        const { data: owned, error: ownErr } = await supabase
          .from('rooms')
          .select('id, name')
          .eq('owner_id', uid)
          .limit(10) as unknown as { data: Array<{ id: string; name: string }> | null, error: any }
        if (ownErr) throw ownErr
        if (!cancelled) {
          setRooms(owned || [])
          if (owned && owned.length > 0) setRoomId(owned[0].id)
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setDetecting(false)
      }
    }
    detect()
    return () => { cancelled = true }
  }, [user, loading, roomId])

  async function refresh() {
    if (!roomId) return
    setFetching(true)
    setError(null)
    try {
      const rows = await listItinerary(roomId)
      setData(rows as DayBundle[])
    } catch (e: any) {
      setError(e.message || 'Failed to load itinerary')
    } finally {
      setFetching(false)
    }
  }

  async function handleAddDay() {
    if (!roomId) return
    setAddingDay(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      await addDay(roomId, today)
      await refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setAddingDay(false)
    }
  }

  async function handleAddItem(dayId: string) {
    try {
      await addItem(dayId, { title: 'New Activity', time: null })
      await refresh()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDeleteItem(id: string) {
    try {
      await deleteItem(id)
      await refresh()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDeleteDay(id: string) {
    if (!confirm('Delete this day and all its items?')) return
    try {
      await deleteDay(id)
      await refresh()
    } catch (e: any) {
      setError(e.message)
    }
  }

  useEffect(() => { refresh() }, [roomId])

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Itinerary</h1>
          <div className="flex gap-3 items-center flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <label className="text-gray-600">Room:</label>
              <select
                className="border rounded px-2 py-1 bg-white text-sm"
                disabled={detecting || rooms.length === 0}
                value={roomId || ''}
                onChange={e => setRoomId(e.target.value || null)}
              >
                {rooms.length === 0 && <option value="">{detecting ? 'Detecting…' : 'No rooms'}</option>}
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <button
                onClick={() => { setRoomId(null); setRooms([]); }}
                title="Re-detect rooms"
                className="p-1 rounded border bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            {!roomId && !detecting && <span className="text-xs text-gray-600">Create or join a room first.</span>}
            <button
              onClick={handleAddDay}
              disabled={!roomId || addingDay}
              className="inline-flex items-center gap-1 rounded bg-blue-600 text-white px-3 py-1 text-sm disabled:opacity-50"
            >
              {addingDay && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" /> Day
            </button>
          </div>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        {fetching && <div className="flex items-center gap-2 text-sm text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>}
        {!fetching && data.length === 0 && roomId && (
          <div className="text-sm text-gray-600">No days yet. Add your first day.</div>
        )}
        {!roomId && (
          <div className="rounded border bg-white/60 p-4 text-sm text-gray-700">
            <p className="mb-2 font-medium">No active room</p>
            <p>Join or create a room to start building the itinerary. Use the Rooms tab to add one.</p>
          </div>
        )}
        <div className="space-y-4">
          {data.map(bundle => (
            <div key={bundle.day.id} className="rounded-lg bg-white/70 backdrop-blur border p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold">{bundle.day.date}</h2>
                <div className="flex gap-2">
                  <button onClick={() => handleAddItem(bundle.day.id)} className="text-xs px-2 py-1 rounded bg-emerald-600 text-white flex items-center gap-1"><Plus className="h-3 w-3"/>Item</button>
                  <button onClick={() => handleDeleteDay(bundle.day.id)} className="text-xs px-2 py-1 rounded bg-red-600 text-white flex items-center gap-1"><Trash2 className="h-3 w-3"/>Day</button>
                </div>
              </div>
              <ul className="space-y-1">
                {bundle.items.map(it => (
                  <li key={it.id} className="flex items-center justify-between text-sm bg-white/80 rounded px-2 py-1">
                    <span className="flex-1">
                      {it.time && <span className="text-gray-500 mr-2">{it.time}</span>}
                      {it.title}
                      {it.location && <span className="ml-2 text-xs text-blue-600">@ {it.location}</span>}
                    </span>
                    <button onClick={() => handleDeleteItem(it.id)} className="text-red-600 hover:text-red-800"><Trash2 className="h-4 w-4" /></button>
                  </li>
                ))}
                {bundle.items.length === 0 && <li className="text-xs text-gray-500">No items yet.</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
