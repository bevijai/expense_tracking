'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Room, ExpenseWithUser, JoinRequestWithUser, MemberBalance } from '@/types/app'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { ExpensesTab } from '@/components/ExpensesTab'
import { MembersTab } from '@/components/MembersTab'
import { SettlementsTab } from '@/components/SettlementsTab'
import { AISummarySection } from '@/components/AISummarySection'
import { formatCurrency } from '@/lib/utils/settlements'
import { Loader2, ArrowLeft, Copy, Check, Users, DollarSign, X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CURRENCIES } from '@/types/app'

export default function RoomDetail() {
  const params = useParams() as Record<string, string>
  const id = params?.id as string
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const supabase = createClientSupabaseClient() as any

  const [room, setRoom] = useState<Room | null>(null)
  const [expenses, setExpenses] = useState<ExpenseWithUser[]>([])
  const [joinRequests, setJoinRequests] = useState<JoinRequestWithUser[]>([])
  const [memberBalances, setMemberBalances] = useState<MemberBalance[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [editingCurrency, setEditingCurrency] = useState(false)
  const [newCurrency, setNewCurrency] = useState<string>('')

  const isOwner = room?.owner_id === user?.id

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    const idStr = id
    if (idStr) {
      fetchRoomData()
      
      // Set up real-time subscriptions
      const expensesSubscription = supabase
        .channel('expenses-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'expenses',
            filter: `room_id=eq.${idStr}`
          },
          () => fetchExpenses()
        )
        .subscribe()

      const joinRequestsSubscription = supabase
        .channel('join-requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'join_requests',
            filter: `room_id=eq.${idStr}`
          },
          () => fetchJoinRequests()
        )
        .subscribe()

      return () => {
        expensesSubscription.unsubscribe()
        joinRequestsSubscription.unsubscribe()
      }
    }
  }, [user, authLoading, id, router])

  const fetchRoomData = async () => {
    await Promise.all([
      fetchRoom(),
      fetchExpenses(),
      fetchJoinRequests(),
    ])
    setLoading(false)
  }

  const fetchRoom = async () => {
    try {
  const idStr = id
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', idStr)
        .single()

      if (error) throw error
      setRoom(data)
      setNewCurrency(data.currency)
    } catch (error: any) {
      toast({
        title: 'Error loading room',
        description: error.message,
        variant: 'destructive',
      })
      router.push('/rooms')
    }
  }

  const handleSaveCurrency = async () => {
    if (!room || !newCurrency || newCurrency === room.currency) {
      setEditingCurrency(false)
      return
    }
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ currency: newCurrency })
        .eq('id', room.id)

      if (error) throw error

      setRoom({ ...room, currency: newCurrency })
      setEditingCurrency(false)
      toast({ title: 'Currency updated', description: `Room currency set to ${newCurrency}.` })
    } catch (error: any) {
      toast({ title: 'Failed to update currency', description: error.message ?? 'Unknown error', variant: 'destructive' })
    }
  }

  const fetchExpenses = async () => {
    try {
  const idStr = id
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('room_id', idStr)
        .order('created_at', { ascending: false })

      if (expensesError) throw expensesError

      // Since we don't have a profiles table, we'll get user emails from auth.users
      // This is a workaround - in production you'd want a profiles table
      const expensesWithUsers = await Promise.all(
        expensesData.map(async (expense: any) => {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(expense.user_id)
            return {
              ...expense,
              user_email: userData.user?.email || 'Unknown User'
            }
          } catch {
            return {
              ...expense,
              user_email: 'Unknown User'
            }
          }
        })
      )

      setExpenses(expensesWithUsers)
      calculateBalances(expensesWithUsers)
    } catch (error: any) {
      console.error('Error fetching expenses:', error)
      setExpenses([])
      toast({ title: 'Error loading expenses', description: error.message ?? 'Unknown error', variant: 'destructive' })
    }
  }

  const fetchJoinRequests = async () => {
    if (!isOwner) return

    try {
      const { data: requestsData, error } = await supabase
        .from('join_requests')
        .select('*')
        .eq('room_id', id)
        .eq('status', 'pending')

      if (error) throw error

      // Get user emails for requests
      const requestsWithUsers = await Promise.all(
        requestsData.map(async (request: any) => {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(request.user_id)
            return {
              ...request,
              user_email: userData.user?.email || 'Unknown User'
            }
          } catch {
            return {
              ...request,
              user_email: 'Unknown User'
            }
          }
        })
      )

      setJoinRequests(requestsWithUsers)
    } catch (error: any) {
      console.error('Error fetching join requests:', error)
    }
  }

  const calculateBalances = async (expensesList: ExpenseWithUser[]) => {
    if (!room) return

    try {
      // Get all members
  const idStr = id
      const { data: members, error } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', idStr)

      if (error) throw error

      // Get member emails
      const membersWithEmails = await Promise.all(
        members.map(async (member: any) => {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(member.user_id)
            return {
              user_id: member.user_id,
              email: userData.user?.email || 'Unknown User'
            }
          } catch {
            return {
              user_id: member.user_id,
              email: 'Unknown User'
            }
          }
        })
      )

      const approvedExpenses = expensesList.filter(e => e.status === 'approved')
      // Convert each approved expense amount into the room currency using fx_rate when provided
      const toBaseAmount = (e: any) => {
        const rate = e.currency && e.currency !== room.currency ? (e.fx_rate || 0) : 1
        return Number(e.amount) * (rate || 1)
      }
      const totalExpenses = approvedExpenses.reduce((sum, e) => sum + toBaseAmount(e), 0)
      const sharePerMember = totalExpenses / membersWithEmails.length

      const balances: MemberBalance[] = membersWithEmails.map(member => {
        const userExpenses = approvedExpenses
          .filter(e => e.user_id === member.user_id)
          .reduce((sum, e) => sum + toBaseAmount(e), 0)

        return {
          user_id: member.user_id,
          user_email: member.email,
          total_spent: userExpenses,
          share: sharePerMember,
          balance: userExpenses - sharePerMember
        }
      })

      setMemberBalances(balances)
    } catch (error: any) {
      console.error('Error calculating balances:', error)
    }
  }

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(id as string)
      setCopied(true)
      toast({
        title: 'Room ID copied!',
        description: 'Share this ID with others so they can join your room.',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the Room ID manually.',
        variant: 'destructive',
      })
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    )
  }

  const toBase = (e: any) => {
    const rate = e.currency && e.currency !== room.currency ? (e.fx_rate || 0) : 1
    return Number(e.amount) * (rate || 1)
  }
  const approved = expenses.filter(e => e.status === 'approved')
  const totalExpenses = approved.reduce((sum, e) => sum + toBase(e), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/rooms')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Rooms
            </Button>
            {isOwner && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                Owner
              </Badge>
            )}
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
                <div className="text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Currency:</span>
                  {!isOwner || !editingCurrency ? (
                    <>
                      <span className="font-medium">{room.currency}</span>
                      {isOwner && (
                        <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setEditingCurrency(true)}>
                          Change
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Select value={newCurrency} onValueChange={setNewCurrency}>
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          {CURRENCIES.map((c) => (
                            <SelectItem key={c.code} value={c.code}>
                              {c.symbol} {c.name} ({c.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" className="h-8" onClick={handleSaveCurrency}>
                        <Check className="h-4 w-4 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="outline" className="h-8" onClick={() => { setNewCurrency(room.currency); setEditingCurrency(false) }}>
                        <X className="h-4 w-4 mr-1" /> Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalExpenses, room.currency)}
                </div>
                <p className="text-sm text-gray-600">Total Approved</p>
              </div>
            </div>

            {/* Room Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm text-gray-600">
                  {memberBalances.length} member{memberBalances.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm text-gray-600">
                  {expenses.filter(e => e.status === 'approved').length} approved expense{expenses.filter(e => e.status === 'approved').length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Room ID */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Room ID:</span>
              <code className="text-sm bg-white px-2 py-1 rounded border font-mono flex-1">
                {id}
              </code>
              <Button size="sm" variant="outline" onClick={copyRoomId}>
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="expenses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="expenses">
              Expenses
              {expenses.filter(e => e.status === 'pending').length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-800">
                  {expenses.filter(e => e.status === 'pending').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="members">
              Members
              {joinRequests.length > 0 && isOwner && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                  {joinRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settlements">Settlements</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses">
            <ExpensesTab
              expenses={expenses}
              room={room}
              isOwner={isOwner}
              onExpensesUpdate={fetchExpenses}
            />
          </TabsContent>

          <TabsContent value="members">
            <MembersTab
              room={room}
              memberBalances={memberBalances}
              joinRequests={joinRequests}
              isOwner={isOwner}
              onUpdate={fetchRoomData}
            />
          </TabsContent>

          <TabsContent value="settlements">
            <SettlementsTab
              memberBalances={memberBalances}
              currency={room.currency}
              pendingCount={expenses.filter(e => e.status === 'pending').length}
              isOwner={isOwner}
            />
          </TabsContent>

          <TabsContent value="ai-insights">
            <AISummarySection roomId={id as string} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}