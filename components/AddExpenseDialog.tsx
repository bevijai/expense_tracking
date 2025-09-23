'use client'

import { useState } from 'react'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Room, CURRENCIES } from '@/types/app'
import type { Database } from '@/types/database'
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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

interface AddExpenseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  room: Room
  onSuccess: () => void
}

export function AddExpenseDialog({ open, onOpenChange, room, onSuccess }: AddExpenseDialogProps) {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expenseCurrency, setExpenseCurrency] = useState<string>('')
  const [fxRate, setFxRate] = useState<string>('1')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !amount.trim() || !description.trim()) return

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const currencyToUse = expenseCurrency || room.currency
      const fxToUse = currencyToUse === room.currency ? 1 : parseFloat(fxRate || '0')
      if (currencyToUse !== room.currency && (!fxToUse || fxToUse <= 0)) {
        toast({ title: 'Invalid FX rate', description: 'Provide a conversion rate to room currency.', variant: 'destructive' })
        return
      }
      const payload: Database['public']['Tables']['expenses']['Insert'] = {
        room_id: room.id,
        user_id: user.id,
        amount: numAmount,
        description: description.trim(),
        currency: currencyToUse,
        fx_rate: fxToUse,
      }

      const { error } = await (supabase as any)
        .from('expenses')
        .insert([payload])

      if (error) throw error

      toast({
        title: 'Expense added!',
        description: 'Your expense has been submitted and is pending approval.',
      })

      setAmount('')
      setDescription('')
  setExpenseCurrency('')
  setFxRate('1')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Error adding expense',
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
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>
            Add a new expense to <strong>{room.name}</strong>. It will be pending until approved by the room owner.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount ({room.currency})</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="exp-currency">Expense Currency</Label>
              <select
                id="exp-currency"
                className="w-full border rounded-md px-3 py-2 disabled:opacity-50"
                value={expenseCurrency}
                onChange={(e) => setExpenseCurrency(e.target.value)}
                disabled={loading}
              >
                <option value="">Same as room ({room.currency})</option>
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.symbol} {c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="fx-rate">FX rate → {room.currency}</Label>
              <Input
                id="fx-rate"
                type="number"
                step="0.0001"
                min="0.0001"
                value={fxRate}
                onChange={(e) => setFxRate(e.target.value)}
                disabled={loading || !expenseCurrency || expenseCurrency === room.currency}
              />
              <p className="text-xs text-gray-500 mt-1">Enter how many {room.currency} for 1 unit of the expense currency.</p>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this expense for?"
              required
              disabled={loading}
              rows={3}
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
            <Button
              type="submit"
              disabled={loading || !amount.trim() || !description.trim() || (!!expenseCurrency && expenseCurrency !== room.currency && (!fxRate || parseFloat(fxRate) <= 0))}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                'Add Expense'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}