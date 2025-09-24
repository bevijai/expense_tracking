import { Database } from './database'

export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomMember = Database['public']['Tables']['room_members']['Row']
export type JoinRequest = Database['public']['Tables']['join_requests']['Row']
export type Expense = Database['public']['Tables']['expenses']['Row']

export interface RoomWithDetails extends Room {
  member_count?: number
  total_expenses?: number
  is_owner?: boolean
  is_member?: boolean
}

export interface ExpenseWithUser extends Expense {
  user_email?: string
}

export interface JoinRequestWithUser extends JoinRequest {
  user_email?: string
}

export interface Settlement {
  from: string
  to: string
  amount: number
}

export interface MemberBalance {
  user_id: string
  user_email: string
  total_spent: number
  share: number
  balance: number
}

export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'THB', name: 'Thai Baht', symbol: '฿' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
] as const

export interface CountryOption {
  code: string
  name: string
  continent?: string
}

export const COUNTRIES: CountryOption[] = [
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'DE', name: 'Germany' },
  { code: 'JP', name: 'Japan' },
  { code: 'TH', name: 'Thailand' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'BR', name: 'Brazil' },
]