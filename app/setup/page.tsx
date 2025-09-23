'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createDatabaseTables } from '@/lib/create-tables'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react'

export default function Setup() {
  const [loading, setLoading] = useState(false)
  const [setupComplete, setSetupComplete] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const handleSetupDatabase = async () => {
    setLoading(true)
    
    try {
      const result = await createDatabaseTables()
      
      if (result.success) {
        setSetupComplete(true)
        toast({
          title: 'Database setup complete!',
          description: result.message,
        })
      } else {
        throw new Error(result.error || 'Setup failed')
      }
    } catch (error: any) {
      console.error('Setup error:', error)
      toast({
        title: 'Setup failed',
        description: error.message || 'Please try the manual setup instructions below.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const manualSetupSQL = `-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  owner_id UUID NOT NULL,
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

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

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
  );`

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="container mx-auto max-w-4xl py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Database Setup</h1>
          <p className="text-gray-600">Set up your Supabase database to start using Trip Expenses</p>
        </div>

        <div className="grid gap-6">
          {/* Automatic Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-600" />
                Automatic Setup
              </CardTitle>
              <CardDescription>
                Try to automatically create the required database tables
              </CardDescription>
            </CardHeader>
            <CardContent>
              {setupComplete ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">Setup Complete!</h3>
                  <p className="text-green-600 mb-4">Your database is ready to use.</p>
                  <Button onClick={() => router.push('/login')}>
                    Go to Login
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Button 
                    onClick={handleSetupDatabase} 
                    disabled={loading}
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting up database...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Setup Database
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                Manual Setup (If Automatic Fails)
              </CardTitle>
              <CardDescription>
                Copy and paste this SQL into your Supabase SQL Editor
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="mb-2">1. Go to your <a href="https://vrrmreuhisrhewwaycgb.supabase.co" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Supabase Dashboard</a></p>
                  <p className="mb-2">2. Navigate to "SQL Editor"</p>
                  <p className="mb-4">3. Copy and paste the SQL below, then click "Run"</p>
                </div>
                
                <div className="relative">
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm max-h-96 overflow-y-auto">
                    <code>{manualSetupSQL}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(manualSetupSQL)
                      toast({
                        title: 'Copied!',
                        description: 'SQL script copied to clipboard',
                      })
                    }}
                  >
                    Copy SQL
                  </Button>
                </div>
                
                <div className="text-center pt-4">
                  <Button 
                    variant="outline"
                    onClick={() => router.push('/login')}
                  >
                    I've completed the manual setup
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}