"use client";

import React, { useEffect, useState } from 'react';
import { listItinerary, addDay, addItem, deleteItem, deleteDay, addDaysRange } from '@/lib/itinerary';
import { useAuth } from '@/lib/hooks/useAuth';
import { Loader2, Plus, Trash2, RefreshCw, CalendarPlus, Wand2 } from 'lucide-react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { COUNTRIES } from '@/types/app';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface DayBundle { day: { id: string; date: string }; items: Array<{ id: string; day_id: string; time: string | null; title: string; notes?: string | null; location?: string | null }>; }

export default function ItineraryPage() {
  const { user, loading } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [data, setData] = useState<DayBundle[]>([]);
  const [fetching, setFetching] = useState(false);
  const [addingDay, setAddingDay] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [aiCountry, setAiCountry] = useState('');
  const [aiDays, setAiDays] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Detect rooms
  useEffect(() => {
    if (loading || !user || roomId) return; let cancelled = false; (async () => {
      const supabase = createClientSupabaseClient();
      const uid = user.id;
      const { data: memberRows } = await supabase.from('room_members').select('room_id, rooms!inner(id,name)').eq('user_id', uid).limit(8);
      const list: Array<{ id: string; name: string }> = [];
      memberRows?.forEach((r: any) => r.rooms && list.push({ id: r.rooms.id, name: r.rooms.name }));
      if (!cancelled && list.length) { setRooms(list); setRoomId(list[0].id); return; }
      const { data: owned } = await supabase.from('rooms').select('id,name').eq('owner_id', uid).limit(8);
      if (!cancelled && owned && owned.length) { setRooms(owned); setRoomId(owned[0].id); }
    })(); return () => { cancelled = true; };
  }, [user, loading, roomId]);

  async function refresh() {
    if (!roomId) return; setFetching(true); setError(null);
    try { const rows = await listItinerary(roomId); setData(rows as DayBundle[]); }
    catch (e: any) { setError(e.message); }
    finally { setFetching(false); }
  }
  useEffect(() => { refresh(); }, [roomId]);

  async function handleAddDay() {
    if (!roomId) return; setAddingDay(true);
    try { const today = new Date().toISOString().split('T')[0]; await addDay(roomId, today); await refresh(); }
    catch (e: any) { setError(e.message); }
    finally { setAddingDay(false); }
  }
  async function handleAddItem(dayId: string) { try { await addItem(dayId, { title: 'New Activity', time: null }); await refresh(); } catch (e: any) { setError(e.message); } }
  async function handleDeleteItem(id: string) { try { await deleteItem(id); await refresh(); } catch (e: any) { setError(e.message); } }
  async function handleDeleteDay(id: string) { if (!confirm('Delete this day and all items?')) return; try { await deleteDay(id); await refresh(); } catch (e: any) { setError(e.message); } }

  async function handleBulkAdd() {
    if (!roomId || !rangeStart || !rangeEnd) return; setBulkAdding(true);
    try { await addDaysRange(roomId, rangeStart, rangeEnd); setRangeStart(''); setRangeEnd(''); await refresh(); }
    catch (e: any) { setError(e.message); }
    finally { setBulkAdding(false); }
  }

  async function handleGenerateAI() {
    if (!roomId || !aiCountry || aiDays < 1) return; setAiLoading(true); setAiSuggestion(null); setError(null);
    try {
      const res = await fetch('/api/ai/itinerary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ roomId, country: aiCountry, days: aiDays }) });
      const json = await res.json(); if (!res.ok) throw new Error(json.error || 'AI generation failed');
      const today = new Date(); const end = new Date(today.getTime() + (aiDays - 1) * 86400000);
      await addDaysRange(roomId, today.toISOString().split('T')[0], end.toISOString().split('T')[0]);
      await refresh(); setAiSuggestion(`Skeleton days created for ${aiCountry}. Expand a day to start adding activities.`);
    } catch (e: any) { setError(e.message); }
    finally { setAiLoading(false); }
  }

  if (!user && !loading) {
    return <div className="p-6 text-sm text-gray-600">Sign in to view your itinerary.</div>;
  }

  return (
    <div className="space-y-6 py-4 md:py-6">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gradient-brand">Itinerary</h1>
          <p className="text-sm text-muted-foreground mt-1">Plan, refine and collaborate on your trip day by day.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <label className="text-gray-600">Room</label>
            <select className="border rounded px-2 py-1 bg-white" value={roomId || ''} disabled={!rooms.length} onChange={e => setRoomId(e.target.value || null)}>
              {rooms.length === 0 && <option value="">None</option>}
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={() => { setRoomId(null); setRooms([]); }} title="Re-detect" className="p-1 rounded border bg-white hover:bg-gray-50"><RefreshCw className="h-4 w-4" /></button>
          </div>
          <button onClick={refresh} disabled={!roomId || fetching} className="px-3 py-1 rounded border bg-white flex items-center gap-1 text-sm">{fetching && <Loader2 className="h-4 w-4 animate-spin" />}Reload</button>
          <button onClick={handleAddDay} disabled={!roomId || addingDay} className="px-3 py-1 rounded bg-blue-600 text-white flex items-center gap-1 text-sm">{addingDay && <Loader2 className="h-4 w-4 animate-spin" />}<Plus className="h-4 w-4" />Day</button>
        </div>
      </header>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded">{error}</div>}
      {!roomId && <div className="text-sm text-gray-600">Join or create a room to start planning.</div>}

      {roomId && (
        <section className="space-y-6">
          {/* Bulk Range */}
          <div className="glass-surface rounded border border-white/40 p-4 flex flex-col gap-3">
            <h2 className="font-semibold text-sm flex items-center gap-2"><CalendarPlus className="h-4 w-4" />Add Multiple Days</h2>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="flex flex-col gap-1 text-xs flex-1">
                <label className="font-medium">Start</label>
                <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white" />
              </div>
              <div className="flex flex-col gap-1 text-xs flex-1">
                <label className="font-medium">End</label>
                <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white" />
              </div>
              <button onClick={handleBulkAdd} disabled={bulkAdding || !rangeStart || !rangeEnd} className="px-3 py-2 rounded bg-emerald-600 text-white text-sm flex items-center gap-2 min-w-[140px] justify-center">{bulkAdding && <Loader2 className="h-4 w-4 animate-spin" />}Add Range</button>
            </div>
            <p className="text-[11px] text-muted-foreground">Dates already present are skipped automatically.</p>
          </div>

          {/* AI Assist */}
            <div className="glass-surface rounded border border-white/40 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-sm flex items-center gap-2"><Wand2 className="h-4 w-4" />AI Skeleton</h2>
                <span className="text-[10px] uppercase tracking-wide bg-amber-200/60 text-amber-800 px-2 py-[2px] rounded">Beta</span>
              </div>
              <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
                <div className="flex flex-col gap-1 text-xs flex-1 min-w-[180px]">
                  <label className="font-medium">Country</label>
                  <select value={aiCountry} onChange={e => setAiCountry(e.target.value)} className="border rounded px-2 py-1 text-sm bg-white">
                    <option value="">Select…</option>
                    {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1 text-xs w-28">
                  <label className="font-medium">Days</label>
                  <input type="number" min={1} max={30} value={aiDays} onChange={e => setAiDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))} className="border rounded px-2 py-1 text-sm bg-white" />
                </div>
                <button onClick={handleGenerateAI} disabled={aiLoading || !aiCountry || !roomId} className="px-3 py-2 rounded bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm flex items-center gap-2 min-w-[150px] justify-center">
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}Generate
                </button>
              </div>
              {aiSuggestion && <div className="text-xs text-green-600 bg-green-50 border border-green-100 px-3 py-2 rounded">{aiSuggestion}</div>}
              <p className="text-[11px] text-muted-foreground">Creates empty day slots for a quick scaffold. Activity suggestions coming soon.</p>
            </div>

          {/* Days Accordion */}
          <div className="rounded-lg border bg-white/70 backdrop-blur-sm shadow-sm overflow-hidden">
            <div className="px-4 py-2 border-b flex items-center justify-between bg-white/60">
              <h2 className="font-semibold text-sm">Days ({data.length})</h2>
              <button onClick={handleAddDay} disabled={!roomId || addingDay} className="text-xs px-2 py-1 rounded bg-blue-600 text-white flex items-center gap-1">{addingDay && <Loader2 className="h-3 w-3 animate-spin" />}<Plus className="h-3 w-3" />Day</button>
            </div>
            {fetching && <div className="p-4 text-xs flex items-center gap-2 text-gray-600"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
            {!fetching && data.length === 0 && <div className="p-4 text-xs text-gray-600">No days yet. Add one or generate a range.</div>}
            {data.length > 0 && (
              <Accordion type="multiple" className="divide-y">
                {data.map(bundle => (
                  <AccordionItem key={bundle.day.id} value={bundle.day.id} className="bg-white/60 backdrop-blur-sm">
                    <AccordionTrigger className="px-4 py-2 text-sm font-medium flex justify-between">
                      <span>{bundle.day.date}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => handleAddItem(bundle.day.id)} className="text-[11px] px-2 py-1 rounded bg-emerald-600 text-white flex items-center gap-1"><Plus className="h-3 w-3" />Item</button>
                        <button onClick={() => handleDeleteDay(bundle.day.id)} className="text-[11px] px-2 py-1 rounded bg-red-600 text-white flex items-center gap-1"><Trash2 className="h-3 w-3" />Day</button>
                      </div>
                      <ul className="space-y-2">
                        {bundle.items.map(it => (
                          <li key={it.id} className="flex items-center justify-between text-xs bg-white rounded border px-3 py-2 shadow-sm">
                            <div className="flex-1">
                              {it.time && <span className="text-gray-500 mr-2">{it.time}</span>}
                              <span className="font-medium">{it.title}</span>
                            </div>
                            <button onClick={() => handleDeleteItem(it.id)} className="text-red-600 hover:text-red-700"><Trash2 className="h-3 w-3" /></button>
                          </li>
                        ))}
                        {bundle.items.length === 0 && <li className="text-[11px] text-gray-500">No items yet.</li>}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
