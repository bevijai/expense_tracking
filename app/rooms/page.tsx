'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { RoomWithDetails } from '@/types/app'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { CreateRoomDialog } from '@/components/CreateRoomDialog'
import { JoinRoomDialog } from '@/components/JoinRoomDialog'
import { formatCurrency } from '@/lib/utils/settlements'
import { Loader2, Users, DollarSign, Plus, LogOut, Crown, UserPlus } from 'lucide-react'

export default function Rooms() {
  const [rooms, setRooms] = useState<RoomWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [joinDialogOpen, setJoinDialogOpen] = useState(false)
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientSupabaseClient()

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    fetchRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, router])

  const fetchRooms = async () => {
    if (!user) return

    try {
      setLoading(true)

      type RoomRow = Database['public']['Tables']['rooms']['Row'] & {
        room_members?: { user_id: string }[]
        expenses?: { amount: number; status: 'pending' | 'approved' | 'rejected' }[]
      }

      // 1) Rooms owned by the user
      const ownedResp = await supabase
        .from('rooms')
        .select(`
          *,
          room_members(user_id),
          expenses(amount, status)
        `)
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      if (ownedResp.error) throw ownedResp.error
      const ownedRooms = (ownedResp.data ?? []) as RoomRow[]

      // 2) Room IDs where the user is a member
      const memberLinksResp = await supabase
        .from('room_members')
        .select('room_id')
        .eq('user_id', user.id)

      if (memberLinksResp.error) throw memberLinksResp.error
      const memberLinks = (memberLinksResp.data ?? []) as { room_id: string }[]
      const memberRoomIds = memberLinks.map((r) => r.room_id)

      // 3) Rooms where user is a member (if any)
      let memberRoomsData: RoomRow[] = []
      if (memberRoomIds.length > 0) {
        const memberRoomsResp = await supabase
          .from('rooms')
          .select(`
            *,
            room_members(user_id),
            expenses(amount, status)
          `)
          .in('id', memberRoomIds)
          .order('created_at', { ascending: false })

        if (memberRoomsResp.error) throw memberRoomsResp.error
        memberRoomsData = (memberRoomsResp.data ?? []) as RoomRow[]
      }

      // 4) Combine and de-duplicate by id
      const combinedMap = new Map<string, RoomRow>()
      for (const r of ownedRooms) combinedMap.set(r.id, r)
      for (const r of memberRoomsData) combinedMap.set(r.id, r)
      const userRooms: RoomRow[] = Array.from(combinedMap.values())

      const enrichedRooms: RoomWithDetails[] = userRooms.map((room) => {
        const memberCount = room.room_members?.length || 0
        const approvedExpenses = (room.expenses ?? []).filter((e) => e.status === 'approved') as { amount: number; status: 'pending' | 'approved' | 'rejected' }[]
        const totalExpenses = approvedExpenses.reduce((sum: number, e) => sum + Number(e.amount), 0)
        const isOwner = room.owner_id === user.id

        return {
          ...room,
          member_count: memberCount,
          total_expenses: totalExpenses,
          is_owner: isOwner,
          is_member: !isOwner,
        }
      })

      setRooms(enrichedRooms)
    } catch (error: any) {
      console.error('Error fetching rooms:', error)
      toast({
        title: 'Error loading rooms',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({
        title: 'Error signing out',
        description: error.message,
        variant: 'destructive',
      })
    } else {
      router.push('/login')
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }
  // When not loading and not authenticated, effect will redirect; render nothing to avoid flicker
  if (!user) return null

  const ownedRooms = rooms.filter(room => room.is_owner)
  const memberRooms = rooms.filter(room => room.is_member)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Trip Rooms</h1>
            <p className="text-gray-600 mt-1">Welcome back, {user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mb-8">
          <Button onClick={() => setCreateDialogOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            Create Room
          </Button>
          <Button variant="outline" onClick={() => setJoinDialogOpen(true)} className="flex-1 sm:flex-none">
            <UserPlus className="h-4 w-4 mr-2" />
            Join Room
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading rooms...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Owned Rooms */}
            {ownedRooms.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Crown className="h-5 w-5 mr-2 text-yellow-600" />
                  Your Rooms
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {ownedRooms.map((room) => (
                    <Link key={room.id} href={`/rooms/${room.id}`} className="block">
                      <Card
                        className="cursor-pointer hover:shadow-md transition-shadow bg-white"
                      >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{room.name}</CardTitle>
                          <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50">
                            Owner
                          </Badge>
                        </div>
                        <CardDescription className="space-y-1">
                          <div>Currency: {room.currency}</div>
                          {(room.destination || room.start_date || room.end_date) && (
                            <div className="text-xs text-gray-600">
                              {room.destination ? `${room.destination} • ` : ''}
                              {room.start_date ? new Date(room.start_date).toLocaleDateString() : ''}
                              {room.start_date || room.end_date ? ' - ' : ''}
                              {room.end_date ? new Date(room.end_date).toLocaleDateString() : ''}
                            </div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            {room.member_count} member{room.member_count !== 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center text-green-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(room.total_expenses || 0, room.currency)}
                          </div>
                        </div>
                      </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Member Rooms */}
            {memberRooms.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-blue-600" />
                  Rooms You've Joined
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {memberRooms.map((room) => (
                    <Link key={room.id} href={`/rooms/${room.id}`} className="block">
                      <Card
                        className="cursor-pointer hover:shadow-md transition-shadow bg-white"
                      >
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{room.name}</CardTitle>
                          <Badge variant="outline" className="text-blue-700 border-blue-300 bg-blue-50">
                            Member
                          </Badge>
                        </div>
                        <CardDescription className="space-y-1">
                          <div>Currency: {room.currency}</div>
                          {(room.destination || room.start_date || room.end_date) && (
                            <div className="text-xs text-gray-600">
                              {room.destination ? `${room.destination} • ` : ''}
                              {room.start_date ? new Date(room.start_date).toLocaleDateString() : ''}
                              {room.start_date || room.end_date ? ' - ' : ''}
                              {room.end_date ? new Date(room.end_date).toLocaleDateString() : ''}
                            </div>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            {room.member_count} member{room.member_count !== 1 ? 's' : ''}
                          </div>
                          <div className="flex items-center text-green-600">
                            <DollarSign className="h-4 w-4 mr-1" />
                            {formatCurrency(room.total_expenses || 0, room.currency)}
                          </div>
                        </div>
                      </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {rooms.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms yet</h3>
                <p className="text-gray-600 mb-6">Create your first room to start tracking expenses with friends</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Room
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dialogs */}
        <CreateRoomDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={fetchRooms}
        />
        <JoinRoomDialog
          open={joinDialogOpen}
          onOpenChange={setJoinDialogOpen}
          onSuccess={fetchRooms}
        />
      </div>
    </div>
  )
}