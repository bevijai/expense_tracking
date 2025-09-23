'use client'

import { useState } from 'react'
import { ExpenseWithUser, Room } from '@/types/app'
import { createClientSupabaseClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { AddExpenseDialog } from '@/components/AddExpenseDialog'
import { formatCurrency } from '@/lib/utils/settlements'
import { Plus, Check, X, Clock, Loader2 } from 'lucide-react'

interface ExpensesTabProps {
  expenses: ExpenseWithUser[]
  room: Room
  isOwner: boolean
  onExpensesUpdate: () => void
}

export function ExpensesTab({ expenses, room, isOwner, onExpensesUpdate }: ExpensesTabProps) {
  const [addExpenseOpen, setAddExpenseOpen] = useState(false)
  const [updatingExpense, setUpdatingExpense] = useState<string | null>(null)
  const { user } = useAuth()
  const { toast } = useToast()
  const supabase = createClientSupabaseClient()

  const handleUpdateExpenseStatus = async (expenseId: string, status: 'approved' | 'rejected') => {
    if (!isOwner) return

    setUpdatingExpense(expenseId)

    try {
      const { error } = await (supabase as any)
        .from('expenses')
        .update({ status })
        .eq('id', expenseId)

      if (error) throw error

      toast({
        title: `Expense ${status}`,
        description: `The expense has been ${status}.`,
      })

      onExpensesUpdate()
    } catch (error: any) {
      toast({
        title: `Error ${status === 'approved' ? 'approving' : 'rejecting'} expense`,
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setUpdatingExpense(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="h-4 w-4" />
      case 'rejected':
        return <X className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">Pending</Badge>
    }
  }

  const pendingExpenses = expenses.filter(e => e.status === 'pending')
  const approvedExpenses = expenses.filter(e => e.status === 'approved')
  const rejectedExpenses = expenses.filter(e => e.status === 'rejected')

  const toBase = (e: any) => {
    const rate = e.currency && e.currency !== room.currency ? (e.fx_rate || 0) : 1
    return Number(e.amount) * (rate || 1)
  }

  return (
    <div className="space-y-6">
      {/* Add Expense Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Expenses</h2>
        <Button onClick={() => setAddExpenseOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Pending Expenses */}
      {pendingExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2 text-orange-600" />
              Pending Approval ({pendingExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex justify-between items-center p-4 border rounded-lg bg-orange-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{expense.description}</h4>
                      <span className="font-semibold text-lg">
                        {formatCurrency(toBase(expense), room.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>By: {expense.user_email}</span>
                      <span>{new Date(expense.created_at).toLocaleDateString()}</span>
                      {getStatusBadge(expense.status)}
                    </div>
                  </div>

                  {isOwner && (
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateExpenseStatus(expense.id, 'approved')}
                        disabled={updatingExpense === expense.id}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        {updatingExpense === expense.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateExpenseStatus(expense.id, 'rejected')}
                        disabled={updatingExpense === expense.id}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        {updatingExpense === expense.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <X className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Expenses */}
      {approvedExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Check className="h-5 w-5 mr-2 text-green-600" />
              Approved Expenses ({approvedExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {approvedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex justify-between items-center p-3 border rounded-lg bg-green-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{expense.description}</h4>
                      <span className="font-semibold">
                        {formatCurrency(toBase(expense), room.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>By: {expense.user_email}</span>
                      <span>{new Date(expense.created_at).toLocaleDateString()}</span>
                      {getStatusBadge(expense.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejected Expenses */}
      {rejectedExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <X className="h-5 w-5 mr-2 text-red-600" />
              Rejected Expenses ({rejectedExpenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {rejectedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex justify-between items-center p-3 border rounded-lg bg-red-50 opacity-75"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{expense.description}</h4>
                      <span className="font-semibold line-through">
                        {formatCurrency(expense.amount, room.currency)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                      <span>By: {expense.user_email}</span>
                      <span>{new Date(expense.created_at).toLocaleDateString()}</span>
                      {getStatusBadge(expense.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {expenses.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses yet</h3>
            <p className="text-gray-600 mb-4">Add your first expense to start tracking group spending</p>
            <Button onClick={() => setAddExpenseOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Expense
            </Button>
          </CardContent>
        </Card>
      )}

      <AddExpenseDialog
        open={addExpenseOpen}
        onOpenChange={setAddExpenseOpen}
        room={room}
        onSuccess={onExpensesUpdate}
      />
    </div>
  )
}