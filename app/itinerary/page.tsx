"use client";

import React, { useEffect, useState } from 'react';
import { listItinerary, addDay, addItem, deleteItem, deleteDay } from '@/lib/itinerary';
import { useAuth } from '@/lib/hooks/useAuth';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase/client';

interface DayBundle {
  day: { id: string; date: string };
  items: Array<{ id: string; day_id: string; time: string | null; title: string }>;
}

export default function ItineraryPage() {
  const { user, loading } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [data, setData] = useState<DayBundle[]>([]);
  const [fetching, setFetching] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detect first available room (member first, then owned)
  useEffect(() => {
    if (loading || !user || roomId) return;
    let cancelled = false;
    (async () => {
      const supabase = createClientSupabaseClient();
      const uid = user.id;
      const { data: memberRows } = await supabase
        .from('room_members')
        .select('room_id, rooms!inner(id,name)')
        .eq('user_id', uid)
        .limit(10);
      const list: Array<{ id: string; name: string }> = [];
      memberRows?.forEach((r: any) => r.rooms && list.push({ id: r.rooms.id, name: r.rooms.name }));
      if (!cancelled && list.length) { setRooms(list); setRoomId(list[0].id); return; }
      const { data: owned } = await supabase.from('rooms').select('id,name').eq('owner_id', uid).limit(10);
      if (!cancelled && owned && owned.length) { setRooms(owned); setRoomId(owned[0].id); }
    })();
    return () => { cancelled = true; };
  }, [user, loading, roomId]);

  async function refresh() {
    if (!roomId) return;
    setFetching(true); setError(null);
    try {
      const rows = await listItinerary(roomId);
      setData(rows as DayBundle[]);
    } catch (e: any) {
      setError(e.message || 'Failed to load itinerary');
    } finally { setFetching(false); }
  }

  useEffect(() => { refresh(); }, [roomId]);

  async function handleAddDay() {
    if (!roomId) return; setAddingDay(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await addDay(roomId, today);
      await refresh();
    } catch (e: any) { setError(e.message); } finally { setAddingDay(false); }
  }
  async function handleAddItem(dayId: string) { try { await addItem(dayId, { title: 'New Activity', time: null }); await refresh(); } catch (e: any) { setError(e.message); } }
  async function handleDeleteItem(id: string) { try { await deleteItem(id); await refresh(); } catch (e: any) { setError(e.message); } }
  async function handleDeleteDay(id: string) { if (!confirm('Delete this day and its items?')) return; try { await deleteDay(id); await refresh(); } catch (e: any) { setError(e.message); } }

  if (!user && !loading) {
    return <div className="p-4 text-sm text-gray-600">Sign in to view your itinerary.</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-sm">Itinerary</span>
          <div className="flex items-center gap-2">
            <label className="text-gray-600">Room:</label>
            <select
              className="border rounded px-2 py-1 bg-white"
              disabled={!rooms.length}
              value={roomId || ''}
              onChange={e => setRoomId(e.target.value || null)}
            >
              {rooms.length === 0 && <option value="">None</option>}
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button
              onClick={() => { setRoomId(null); setRooms([]); }}
              className="p-1 border rounded bg-white"
              title="Re-detect rooms"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={refresh}
              disabled={!roomId || fetching}
              className="px-2 py-1 border rounded bg-white flex items-center gap-1"
            >
              {fetching && <Loader2 className="h-3 w-3 animate-spin" />}Reload
            </button>
            <button
              onClick={handleAddDay}
              disabled={!roomId || addingDay}
              className="px-2 py-1 rounded bg-blue-600 text-white flex items-center gap-1"
            >
              {addingDay && <Loader2 className="h-3 w-3 animate-spin" />}<Plus className="h-3 w-3" />Day
            </button>
          </div>
        </div>
        {error && <div className="text-xs text-red-600">{error}</div>}
        {!roomId && <div className="text-xs text-gray-600">Join or create a room first.</div>}
        {roomId && data.length === 0 && !fetching && <div className="text-xs text-gray-600">No days yet.</div>}
      </div>

      <div className="space-y-3">
        {data.map(bundle => (
          <div key={bundle.day.id} className="border rounded p-3 bg-white space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{bundle.day.date}</span>
              <div className="flex gap-2">
                <button onClick={() => handleAddItem(bundle.day.id)} className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white flex items-center gap-1"><Plus className="h-3 w-3" />Item</button>
                <button onClick={() => handleDeleteDay(bundle.day.id)} className="text-[10px] px-2 py-1 rounded bg-red-600 text-white flex items-center gap-1"><Trash2 className="h-3 w-3" />Day</button>
              </div>
            </div>
            <ul className="space-y-1">
              {bundle.items.map(it => (
                <li key={it.id} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                  <span>{it.title}</span>
                  <button onClick={() => handleDeleteItem(it.id)} className="text-red-600"><Trash2 className="h-3 w-3" /></button>
                </li>
              ))}
              {bundle.items.length === 0 && <li className="text-[10px] text-gray-500">No items.</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
