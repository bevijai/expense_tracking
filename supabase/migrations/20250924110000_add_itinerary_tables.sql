-- Itinerary feature tables & policies
-- Safe to run multiple times (uses IF NOT EXISTS / conditional drops)

-- 1. Tables
create table if not exists public.itinerary_days (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  date date not null,
  created_at timestamptz default now(),
  unique(room_id, date)
);

create table if not exists public.itinerary_items (
  id uuid primary key default uuid_generate_v4(),
  day_id uuid not null references public.itinerary_days(id) on delete cascade,
  time text,
  title text not null,
  notes text,
  location text,
  created_at timestamptz default now()
);

-- 2. Indexes (IF NOT EXISTS not supported for indexes on some PG versions, so use DO blocks)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_itinerary_days_room_id ON public.itinerary_days(room_id, date);
  CREATE INDEX IF NOT EXISTS idx_itinerary_items_day_id ON public.itinerary_items(day_id);
END $$;

-- 3. Enable RLS
alter table public.itinerary_days enable row level security;
alter table public.itinerary_items enable row level security;

-- 4. Drop existing policies if re-running
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view itinerary days" ON public.itinerary_days;
  DROP POLICY IF EXISTS "Users can insert itinerary days" ON public.itinerary_days;
  DROP POLICY IF EXISTS "Users can delete itinerary days" ON public.itinerary_days;
  DROP POLICY IF EXISTS "Users can view itinerary items" ON public.itinerary_items;
  DROP POLICY IF EXISTS "Users can insert itinerary items" ON public.itinerary_items;
  DROP POLICY IF EXISTS "Users can delete itinerary items" ON public.itinerary_items;
END $$;

-- 5. Policies
create policy "Users can view itinerary days" on public.itinerary_days
  for select to authenticated
  using (
    room_id in (
      select id from public.rooms where owner_id = auth.uid()
      union
      select room_id from public.room_members where user_id = auth.uid()
    )
  );

create policy "Users can insert itinerary days" on public.itinerary_days
  for insert to authenticated
  with check (
    room_id in (
      select id from public.rooms where owner_id = auth.uid()
      union
      select room_id from public.room_members where user_id = auth.uid()
    )
  );

create policy "Users can delete itinerary days" on public.itinerary_days
  for delete to authenticated
  using (
    room_id in (
      select id from public.rooms where owner_id = auth.uid()
      union
      select room_id from public.room_members where user_id = auth.uid()
    )
  );

create policy "Users can view itinerary items" on public.itinerary_items
  for select to authenticated
  using (
    day_id in (
      select id from public.itinerary_days where room_id in (
        select id from public.rooms where owner_id = auth.uid()
        union
        select room_id from public.room_members where user_id = auth.uid()
      )
    )
  );

create policy "Users can insert itinerary items" on public.itinerary_items
  for insert to authenticated
  with check (
    day_id in (
      select id from public.itinerary_days where room_id in (
        select id from public.rooms where owner_id = auth.uid()
        union
        select room_id from public.room_members where user_id = auth.uid()
      )
    )
  );

create policy "Users can delete itinerary items" on public.itinerary_items
  for delete to authenticated
  using (
    day_id in (
      select id from public.itinerary_days where room_id in (
        select id from public.rooms where owner_id = auth.uid()
        union
        select room_id from public.room_members where user_id = auth.uid()
      )
    )
  );

-- 6. Verification queries (comment out in production migrations)
-- select 'itinerary_days count' as label, count(*) from public.itinerary_days;
-- select 'itinerary_items count' as label, count(*) from public.itinerary_items;
