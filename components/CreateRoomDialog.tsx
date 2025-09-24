'use client'

import { useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useAuth } from '@/lib/hooks/useAuth'
import { CURRENCIES, COUNTRIES } from '@/types/app'
import { addDaysRange } from '@/lib/itinerary'
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
  const [country, setCountry] = useState('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [generateDays, setGenerateDays] = useState(false)
  const [manualCurrencyChanged, setManualCurrencyChanged] = useState(false)
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
        destination: destination.trim() || country || null,
        start_date: startDate || null,
        end_date: endDate || null,
      }

      const { data: created, error } = await supabase
        .from('rooms')
        .insert(payload)
        .select('id, start_date, end_date')
        .single()

      if (error) throw error

      // Optionally seed itinerary days
      if (generateDays && created?.start_date && created?.end_date) {
        try {
          await addDaysRange(created.id, created.start_date as string, created.end_date as string)
        } catch (e) {
          console.warn('Failed to seed itinerary days:', e)
        }
      }

      toast({
        title: 'Room created!',
        description: `${name} has been created successfully.`,
      })

      setName('')
    setCurrency('USD')
  setDestination('')
    setCountry('')
  setStartDate('')
  setEndDate('')
    setGenerateDays(false)
    setManualCurrencyChanged(false)
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div>
              <Label htmlFor="country">Country (optional)</Label>
              <select
                id="country"
                value={country}
                disabled={loading}
                onChange={(e) => {
                  const val = e.target.value
                  setCountry(val)
                  if (!manualCurrencyChanged) {
                    // Simple currency inference map
                    const map: Record<string,string> = { 'United States':'USD','United Kingdom':'GBP','France':'EUR','Spain':'EUR','Italy':'EUR','Germany':'EUR','Japan':'JPY','Thailand':'THB','Singapore':'SGD','Australia':'AUD','Canada':'CAD','Brazil':'BRL' }
                    if (map[val]) setCurrency(map[val])
                  }
                }}
                className="w-full border rounded px-2 py-2 bg-white"
              >
                <option value="">Select country</option>
                {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
              </select>
            </div>
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

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Select value={currency} onValueChange={(val) => { setCurrency(val); setManualCurrencyChanged(true) }}>
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
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <input type="checkbox" id="generate-days" disabled={loading || !startDate || !endDate} checked={generateDays} onChange={e => setGenerateDays(e.target.checked)} />
              <label htmlFor="generate-days" className="cursor-pointer">Generate itinerary days for date range</label>
            </div>
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