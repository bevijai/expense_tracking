"use client"

import { useEffect, useState } from 'react'
import { listItinerary, addDay, addItem, deleteItem, deleteDay } from '@/lib/itinerary'
import { useAuth } from '@/lib/hooks/useAuth'
import { Loader2, Plus, Trash2 } from 'lucide-react'

type DayBundle = Awaited<ReturnType<typeof listItinerary>>[number]

export default function ItineraryPage() {
  const { user, loading } = useAuth()
  const [roomId, setRoomId] = useState<string | null>(null) // TODO: tie to selected room (placeholder)
  const [data, setData] = useState<DayBundle[]>([])
  const [fetching, setFetching] = useState(false)
  const [addingDay, setAddingDay] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // TEMP: pick first joined room via API later. For now, skip fetch until roomId set.
  useEffect(() => {
    // Placeholder: in a future enhancement we will allow selecting active room.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async function inferRoom() {
      // For now do nothing; UI will prompt user.
    }
    inferRoom()
  }, [])

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
          <div className="flex gap-2">
            {!roomId && <span className="text-sm text-gray-600">Select a room to manage itinerary (feature coming)</span>}
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
            <p className="mb-2 font-medium">Room selection pending</p>
            <p>We will integrate room-based itinerary selection soon. For now this UI is ready once a room is chosen.</p>
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
