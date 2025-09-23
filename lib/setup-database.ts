import { createClientSupabaseClient } from '@/lib/supabase/client'

export async function setupDatabase() {
  const supabase = createClientSupabaseClient()
  
  try {
    // Database setup SQL - executed as individual statements for better compatibility
    const statements = [
      // Enable UUID extension
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
      
      // Create rooms table
      `CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        owner_id UUID NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,
      
      // Create room_members table
      `CREATE TABLE IF NOT EXISTS room_members (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      );`,
      
      // Create join_requests table
      `CREATE TABLE IF NOT EXISTS join_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        requested_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      );`,
      
      // Create expenses table
      `CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL,
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );`,
    ]

    // Execute each statement
    for (const statement of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        console.error('Error executing statement:', statement, error)
        throw error
      }
    }

    // Enable RLS
    const rlsStatements = [
      `ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;`,
    ]

    for (const statement of rlsStatements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        console.error('Error enabling RLS:', statement, error)
        // Continue even if RLS fails - it might already be enabled
      }
    }

    return { success: true, message: 'Database setup completed successfully!' }
  } catch (error) {
    console.error('Database setup failed:', error)
    return { success: false, error: error.message }
  }
}