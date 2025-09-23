// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Database setup SQL
    const setupSQL = `
      -- Enable UUID extension
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      -- Create rooms table
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        owner_id UUID NOT NULL,
        destination TEXT,
        start_date DATE,
        end_date DATE,
        emoji TEXT,
        color TEXT,
        archived_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create room_members table
      CREATE TABLE IF NOT EXISTS room_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      );

      -- Create join_requests table
      CREATE TABLE IF NOT EXISTS join_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      );

      -- Create expenses table
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_room_members_room_id ON room_members(room_id);
      CREATE INDEX IF NOT EXISTS idx_room_members_user_id ON room_members(user_id);
      CREATE INDEX IF NOT EXISTS idx_join_requests_room_id ON join_requests(room_id);
      CREATE INDEX IF NOT EXISTS idx_join_requests_status ON join_requests(status);
      CREATE INDEX IF NOT EXISTS idx_expenses_room_id ON expenses(room_id);
      CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);

      -- Enable Row Level Security
      ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
      ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
      ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

      -- Drop existing policies if they exist
      DROP POLICY IF EXISTS "Users can view rooms they own or are members of" ON rooms;
      DROP POLICY IF EXISTS "Users can create rooms" ON rooms;
      DROP POLICY IF EXISTS "Only room owners can update rooms" ON rooms;
      DROP POLICY IF EXISTS "Only room owners can delete rooms" ON rooms;
      DROP POLICY IF EXISTS "Users can view members of rooms they belong to" ON room_members;
      DROP POLICY IF EXISTS "Room owners can add members" ON room_members;
      DROP POLICY IF EXISTS "Room owners can remove members" ON room_members;
      DROP POLICY IF EXISTS "Users can view join requests for their rooms or their own requests" ON join_requests;
      DROP POLICY IF EXISTS "Users can create join requests" ON join_requests;
      DROP POLICY IF EXISTS "Room owners can update join requests" ON join_requests;
      DROP POLICY IF EXISTS "Users can view expenses in rooms they belong to" ON expenses;
      DROP POLICY IF EXISTS "Room members can create expenses" ON expenses;
      DROP POLICY IF EXISTS "Room owners can update expense status" ON expenses;

      -- RLS Policies for rooms
      CREATE POLICY "Users can view rooms they own or are members of" ON rooms
        FOR SELECT TO authenticated
        USING (
          owner_id = auth.uid() OR 
          id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid())
        );

      CREATE POLICY "Users can create rooms" ON rooms
        FOR INSERT TO authenticated
        WITH CHECK (owner_id = auth.uid());

      CREATE POLICY "Only room owners can update rooms" ON rooms
        FOR UPDATE TO authenticated
        USING (owner_id = auth.uid())
        WITH CHECK (owner_id = auth.uid());

      CREATE POLICY "Only room owners can delete rooms" ON rooms
        FOR DELETE TO authenticated
        USING (owner_id = auth.uid());

      -- RLS Policies for room_members
      CREATE POLICY "Users can view members of rooms they belong to" ON room_members
        FOR SELECT TO authenticated
        USING (
          room_id IN (
            SELECT id FROM rooms WHERE owner_id = auth.uid()
            UNION
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
          )
        );

      CREATE POLICY "Room owners can add members" ON room_members
        FOR INSERT TO authenticated
        WITH CHECK (
          room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
        );

      CREATE POLICY "Room owners can remove members" ON room_members
        FOR DELETE TO authenticated
        USING (
          room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
        );

      -- RLS Policies for join_requests
      CREATE POLICY "Users can view join requests for their rooms or their own requests" ON join_requests
        FOR SELECT TO authenticated
        USING (
          user_id = auth.uid() OR
          room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
        );

      CREATE POLICY "Users can create join requests" ON join_requests
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());

      CREATE POLICY "Room owners can update join requests" ON join_requests
        FOR UPDATE TO authenticated
        USING (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()))
        WITH CHECK (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()));

      -- RLS Policies for expenses
      CREATE POLICY "Users can view expenses in rooms they belong to" ON expenses
        FOR SELECT TO authenticated
        USING (
          room_id IN (
            SELECT id FROM rooms WHERE owner_id = auth.uid()
            UNION
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
          )
        );

      CREATE POLICY "Room members can create expenses" ON expenses
        FOR INSERT TO authenticated
        WITH CHECK (
          user_id = auth.uid() AND
          room_id IN (
            SELECT id FROM rooms WHERE owner_id = auth.uid()
            UNION
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
          )
        );

      CREATE POLICY "Room owners can update expense status" ON expenses
        FOR UPDATE TO authenticated
        USING (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()))
        WITH CHECK (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()));

      -- Function to automatically add room owner as member
      CREATE OR REPLACE FUNCTION add_owner_as_member()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $$
      BEGIN
        INSERT INTO public.room_members (room_id, user_id)
        VALUES (NEW.id, NEW.owner_id)
        ON CONFLICT (room_id, user_id) DO NOTHING;
        RETURN NEW;
      END;
      $$;

      -- Drop existing trigger if it exists
      DROP TRIGGER IF EXISTS on_room_created ON rooms;

      -- Trigger to add owner as member when room is created
      CREATE TRIGGER on_room_created
        AFTER INSERT ON rooms
        FOR EACH ROW
        EXECUTE FUNCTION add_owner_as_member();
    `;

    // Execute the setup SQL
    const { error } = await supabaseClient.rpc('exec_sql', { sql: setupSQL })
    
    if (error) {
      console.error('Database setup error:', error)
      return new Response(
        JSON.stringify({ error: 'Database setup failed', details: error }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ message: 'Database setup completed successfully!' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Setup error:', error)
    return new Response(
      JSON.stringify({ error: 'Setup failed', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})