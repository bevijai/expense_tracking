'use client'

import { useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useAuth } from '@/lib/hooks/useAuth'
import { CURRENCIES } from '@/types/app'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CreateRoomDialog({ open, onOpenChange, onSuccess }: CreateRoomDialogProps) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [destination, setDestination] = useState('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !name.trim()) return
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      toast({ title: 'Invalid dates', description: 'End date cannot be before start date.', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const payload: Database['public']['Tables']['rooms']['Insert'] = {
        name: name.trim(),
        currency,
        owner_id: user.id,
        destination: destination.trim() || null,
        start_date: startDate || null,
        end_date: endDate || null,
      }

      const { error } = await (supabase as any)
        .from('rooms')
        .insert([payload])

      if (error) throw error

      toast({
        title: 'Room created!',
        description: `${name} has been created successfully.`,
      })

      setName('')
      setCurrency('USD')
  setDestination('')
  setStartDate('')
  setEndDate('')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error creating room',
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
          <DialogTitle>Create New Room</DialogTitle>
          <DialogDescription>
            Create a new trip room to start tracking expenses with your group.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter room name (e.g., Tokyo Trip 2024)"
              required
              disabled={loading}
            />
          </div>

          <div>
            <Label htmlFor="destination">Destination (optional)</Label>
            <Input
              id="destination"
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="City / Country (e.g., Tokyo, Japan)"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-date">Start Date (optional)</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="end-date">End Date (optional)</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.name} ({curr.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}