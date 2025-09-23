'use client'

import { useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface JoinRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function JoinRoomDialog({ open, onOpenChange, onSuccess }: JoinRoomDialogProps) {
  const [roomId, setRoomId] = useState('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !roomId.trim()) return

    setLoading(true)

    try {
      // First check if room exists
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('id', roomId.trim())
        .single()

      if (roomError || !room) {
        throw new Error('Room not found')
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('room_members')
        .select('id')
        .eq('room_id', roomId.trim())
        .eq('user_id', user.id)
        .single()

      if (existingMember) {
        throw new Error('You are already a member of this room')
      }

      // Check if there's already a pending request
      const { data: existingRequest } = await supabase
        .from('join_requests')
        .select('id, status')
        .eq('room_id', roomId.trim())
        .eq('user_id', user.id)
        .single()

      if (existingRequest) {
        if (existingRequest.status === 'pending') {
          throw new Error('You already have a pending request for this room')
        } else if (existingRequest.status === 'rejected') {
          throw new Error('Your request to join this room was rejected')
        }
      }

      // Create join request
      const { error } = await supabase
        .from('join_requests')
        .insert([
          {
            room_id: roomId.trim(),
            user_id: user.id,
          }
        ])

      if (error) throw error

      toast({
        title: 'Join request sent!',
        description: `Your request to join "${room.name}" has been sent to the room owner.`,
      })

      setRoomId('')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error joining room',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join Room</DialogTitle>
          <DialogDescription>
            Enter the room ID to send a join request to the room owner.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="room-id">Room ID</Label>
            <Input
              id="room-id"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              required
              disabled={loading}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !roomId.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Request...
                </>
              ) : (
                'Send Join Request'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}