'use client'

import { useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { Room, MemberBalance, JoinRequestWithUser } from '@/types/app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils/settlements'
import { Users, Check, X, Crown, Loader2, UserMinus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface MembersTabProps {
  room: Room
  memberBalances: MemberBalance[]
  joinRequests: JoinRequestWithUser[]
  isOwner: boolean
  onUpdate: () => void
}

export function MembersTab({ 
  room, 
  memberBalances, 
  joinRequests, 
  isOwner, 
  onUpdate 
}: MembersTabProps) {
  const [updatingRequest, setUpdatingRequest] = useState<string | null>(null)
  const [removingMember, setRemovingMember] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  const handleJoinRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setUpdatingRequest(requestId)

    try {
      if (action === 'approve') {
        // First, approve the join request
        const { data: request, error: updateError } = await (supabase as any)
          .from('join_requests')
          .update({ status: 'approved' })
          .eq('id', requestId)
          .select()
          .single()

        if (updateError) throw updateError

        // Then add the user as a member
        const { error: memberError } = await (supabase as any)
          .from('room_members')
          .insert([
            {
              room_id: room.id,
              user_id: request.user_id,
            }
          ])

        if (memberError) throw memberError
      } else {
        // Just reject the request
        const { error } = await (supabase as any)
          .from('join_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId)

        if (error) throw error
      }

      toast({
        title: `Request ${action === 'approve' ? 'approved' : 'rejected'}`,
        description: `The join request has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      })

      onUpdate()
    } catch (error: any) {
      toast({
        title: `Error ${action === 'approve' ? 'approving' : 'rejecting'} request`,
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUpdatingRequest(null)
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!isOwner || userId === room.owner_id) return

    setRemovingMember(userId)

    try {
      const { error } = await supabase
        .from('room_members')
        .delete()
        .eq('room_id', room.id)
        .eq('user_id', userId)

      if (error) throw error

      toast({
        title: 'Member removed',
        description: 'The member has been removed from the room.',
      })

      onUpdate()
    } catch (error: any) {
      toast({
        title: 'Error removing member',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setRemovingMember(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Join Requests */}
      {isOwner && joinRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2 text-blue-600" />
              Join Requests ({joinRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex justify-between items-center p-4 border rounded-lg bg-blue-50"
                >
                  <div>
                    <h4 className="font-medium">{request.user_email}</h4>
                    <p className="text-sm text-gray-600">
                      Requested {new Date(request.requested_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleJoinRequest(request.id, 'approve')}
                      disabled={updatingRequest === request.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updatingRequest === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleJoinRequest(request.id, 'reject')}
                      disabled={updatingRequest === request.id}
                      className="border-red-300 text-red-700 hover:bg-red-50"
                    >
                      {updatingRequest === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2 text-green-600" />
            Members ({memberBalances.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {memberBalances.map((member) => {
              const isRoomOwner = member.user_id === room.owner_id
              
              return (
                <div
                  key={member.user_id}
                  className="flex justify-between items-center p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{member.user_email}</h4>
                      {isRoomOwner && (
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                          <Crown className="h-3 w-3 mr-1" />
                          Owner
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm text-gray-600 mt-2">
                      <div>
                        <span className="font-medium">Spent: </span>
                        {formatCurrency(member.total_spent, room.currency)}
                      </div>
                      <div>
                        <span className="font-medium">Share: </span>
                        {formatCurrency(member.share, room.currency)}
                      </div>
                      <div>
                        <span className="font-medium">Balance: </span>
                        <span className={member.balance > 0 ? 'text-green-600' : member.balance < 0 ? 'text-red-600' : 'text-gray-600'}>
                          {formatCurrency(member.balance, room.currency)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remove Member Button (only for owners, not for themselves) */}
                  {isOwner && !isRoomOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-4 border-red-300 text-red-700 hover:bg-red-50"
                          disabled={removingMember === member.user_id}
                        >
                          {removingMember === member.user_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove <strong>{member.user_email}</strong> from this room?
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveMember(member.user_id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remove Member
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      {memberBalances.length === 0 && joinRequests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Just you so far</h3>
            <p className="text-gray-600 mb-4">Share the room ID with others so they can join</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}