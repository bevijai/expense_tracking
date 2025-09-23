import { MemberBalance, Settlement } from '@/types/app'

export function calculateSettlements(balances: MemberBalance[]): Settlement[] {
  const settlements: Settlement[] = []
  
  // Create arrays of debtors and creditors
  const debtors = balances.filter(b => b.balance < 0).map(b => ({ 
    user_id: b.user_id, 
    email: b.user_email, 
    amount: -b.balance 
  }))
  const creditors = balances.filter(b => b.balance > 0).map(b => ({ 
    user_id: b.user_id, 
    email: b.user_email, 
    amount: b.balance 
  }))

  // Sort by amount (largest first) for greedy algorithm
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  let i = 0, j = 0

  while (i < debtors.length && j < creditors.length) {
    const debt = debtors[i].amount
    const credit = creditors[j].amount
    const payment = Math.min(debt, credit)

    if (payment > 0.01) { // Only add settlements for amounts > 1 cent
      settlements.push({
        from: debtors[i].email,
        to: creditors[j].email,
        amount: Math.round(payment * 100) / 100
      })
    }

    debtors[i].amount -= payment
    creditors[j].amount -= payment

    if (debtors[i].amount <= 0.01) i++
    if (creditors[j].amount <= 0.01) j++
  }

  return settlements
}

export function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}