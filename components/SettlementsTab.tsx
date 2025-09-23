'use client'

import { useMemo } from 'react'
import { MemberBalance } from '@/types/app'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { calculateSettlements, formatCurrency } from '@/lib/utils/settlements'
import { ArrowRight, CheckCircle, DollarSign } from 'lucide-react'

interface SettlementsTabProps {
  memberBalances: MemberBalance[]
  currency: string
  pendingCount?: number
  isOwner?: boolean
}

export function SettlementsTab({ memberBalances, currency, pendingCount = 0, isOwner = false }: SettlementsTabProps) {
  const settlements = useMemo(() => {
    return calculateSettlements(memberBalances)
  }, [memberBalances])

  const totalDebt = useMemo(() => {
    return memberBalances
      .filter(b => b.balance < 0)
      .reduce((sum, b) => sum + Math.abs(b.balance), 0)
  }, [memberBalances])

  const totalCredit = useMemo(() => {
    return memberBalances
      .filter(b => b.balance > 0)
      .reduce((sum, b) => sum + b.balance, 0)
  }, [memberBalances])

  return (
    <div className="space-y-6">
      {/* Owner tip: pending expenses not included */}
      {isOwner && pendingCount > 0 && (
        <Card>
          <CardContent className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-sm text-yellow-800">
              You have <span className="font-semibold">{pendingCount}</span> pending expense{pendingCount !== 1 ? 's' : ''}. Approve them in the Expenses tab to include in balances and settlements.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total to Settle</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalDebt, currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <ArrowRight className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Transactions</p>
                <p className="text-2xl font-bold text-blue-600">{settlements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-gray-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <p className="text-2xl font-bold text-gray-600">
                  {settlements.length === 0 ? 'Settled' : 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settlements */}
      {settlements.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Recommended Settlements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settlements.map((settlement, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 border rounded-lg bg-blue-50"
                >
                  <div className="flex items-center flex-1">
                    <div className="flex-1">
                      <span className="font-medium">{settlement.from}</span>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-600 mx-4" />
                    <div className="flex-1 text-right">
                      <span className="font-medium">{settlement.to}</span>
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(settlement.amount, currency)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h4 className="font-medium text-yellow-800 mb-2">💡 Settlement Tips</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• These settlements minimize the number of transactions needed</li>
                <li>• Complete settlements in any order that works for your group</li>
                <li>• Mark expenses as approved once payments are made</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">All Settled Up!</h3>
            <p className="text-gray-600">
              {memberBalances.length > 0 
                ? "Everyone's expenses are balanced. No settlements needed!"
                : "Add some expenses to see settlement calculations."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Balance Details */}
      {memberBalances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Member Balances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {memberBalances.map((member) => (
                <div
                  key={member.user_id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    member.balance > 0 
                      ? 'bg-green-50 border border-green-200' 
                      : member.balance < 0 
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <span className="font-medium">{member.user_email}</span>
                  <div className="text-right">
                    <div className={`font-semibold ${
                      member.balance > 0 
                        ? 'text-green-600' 
                        : member.balance < 0 
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}>
                      {member.balance > 0 && '+'}
                      {formatCurrency(member.balance, currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.balance > 0 
                        ? 'Should receive' 
                        : member.balance < 0 
                          ? 'Owes to group'
                          : 'Even'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}