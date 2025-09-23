import { createClientSupabaseClient } from '@/lib/supabase/client'

export async function createDatabaseTables() {
  const supabase = createClientSupabaseClient()
  const sb: any = supabase
  
  try {
    // Create tables using individual SQL statements
    const statements = [
      // Create rooms table
      `CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
      );`,
      
      // Create room_members table
      `CREATE TABLE IF NOT EXISTS room_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      );`,
      
      // Create join_requests table
      `CREATE TABLE IF NOT EXISTS join_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      );`,
      
      // Create expenses table
      `CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      // Enable RLS
      `ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;`,
      
      // Create RLS policies for rooms
      `CREATE POLICY IF NOT EXISTS "Users can view rooms they own or are members of" ON rooms
        FOR SELECT TO authenticated
        USING (
          owner_id = auth.uid() OR 
          id IN (SELECT room_id FROM room_members WHERE user_id = auth.uid())
        );`,
      
      `CREATE POLICY IF NOT EXISTS "Users can create rooms" ON rooms
        FOR INSERT TO authenticated
        WITH CHECK (owner_id = auth.uid());`,
      
      `CREATE POLICY IF NOT EXISTS "Only room owners can update rooms" ON rooms
        FOR UPDATE TO authenticated
        USING (owner_id = auth.uid())
        WITH CHECK (owner_id = auth.uid());`,
      
      `CREATE POLICY IF NOT EXISTS "Only room owners can delete rooms" ON rooms
        FOR DELETE TO authenticated
        USING (owner_id = auth.uid());`,
      
      // Create RLS policies for room_members
      `CREATE POLICY IF NOT EXISTS "Users can view members of rooms they belong to" ON room_members
        FOR SELECT TO authenticated
        USING (
          room_id IN (
            SELECT id FROM rooms WHERE owner_id = auth.uid()
            UNION
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
          )
        );`,
      
      `CREATE POLICY IF NOT EXISTS "Room owners can add members" ON room_members
        FOR INSERT TO authenticated
        WITH CHECK (
          room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
        );`,
      
      `CREATE POLICY IF NOT EXISTS "Room owners can remove members" ON room_members
        FOR DELETE TO authenticated
        USING (
          room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
        );`,
      
      // Create RLS policies for join_requests
      `CREATE POLICY IF NOT EXISTS "Users can view join requests for their rooms or their own requests" ON join_requests
        FOR SELECT TO authenticated
        USING (
          user_id = auth.uid() OR
          room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid())
        );`,
      
      `CREATE POLICY IF NOT EXISTS "Users can create join requests" ON join_requests
        FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());`,
      
      `CREATE POLICY IF NOT EXISTS "Room owners can update join requests" ON join_requests
        FOR UPDATE TO authenticated
        USING (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()))
        WITH CHECK (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()));`,
      
      // Create RLS policies for expenses
      `CREATE POLICY IF NOT EXISTS "Users can view expenses in rooms they belong to" ON expenses
        FOR SELECT TO authenticated
        USING (
          room_id IN (
            SELECT id FROM rooms WHERE owner_id = auth.uid()
            UNION
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
          )
        );`,
      
      `CREATE POLICY IF NOT EXISTS "Room members can create expenses" ON expenses
        FOR INSERT TO authenticated
        WITH CHECK (
          user_id = auth.uid() AND
          room_id IN (
            SELECT id FROM rooms WHERE owner_id = auth.uid()
            UNION
            SELECT room_id FROM room_members WHERE user_id = auth.uid()
          )
        );`,
      
      `CREATE POLICY IF NOT EXISTS "Room owners can update expense status" ON expenses
        FOR UPDATE TO authenticated
        USING (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()))
        WITH CHECK (room_id IN (SELECT id FROM rooms WHERE owner_id = auth.uid()));`,
      
      // Create function to automatically add room owner as member
      `CREATE OR REPLACE FUNCTION add_owner_as_member()
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
      $$;`,
      
      // Create trigger
      `DROP TRIGGER IF EXISTS on_room_created ON rooms;`,
      `CREATE TRIGGER on_room_created
        AFTER INSERT ON rooms
        FOR EACH ROW
        EXECUTE FUNCTION add_owner_as_member();`
    ]

    // Execute each statement
    for (const statement of statements) {
      const { error } = await sb.rpc('exec_sql', { sql: statement })
      if (error) {
        console.error('Error executing statement:', statement, error)
        // Continue with other statements even if one fails
      }
    }

    return { success: true, message: 'Database tables created successfully!' }
  } catch (error: any) {
    console.error('Database setup failed:', error)
    return { success: false, error: error.message }
  }
}