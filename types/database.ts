export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          name: string
          currency: string
          owner_id: string
          created_at: string
          destination?: string | null
          start_date?: string | null
          end_date?: string | null
          emoji?: string | null
          color?: string | null
          archived_at?: string | null
        }
        Insert: {
          id?: string
          name: string
          currency?: string
          owner_id: string
          created_at?: string
          destination?: string | null
          start_date?: string | null
          end_date?: string | null
          emoji?: string | null
          color?: string | null
          archived_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          currency?: string
          owner_id?: string
          created_at?: string
          destination?: string | null
          start_date?: string | null
          end_date?: string | null
          emoji?: string | null
          color?: string | null
          archived_at?: string | null
        }
      }
      room_members: {
        Row: {
          id: string
          room_id: string
          user_id: string
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          joined_at?: string
        }
      }
      join_requests: {
        Row: {
          id: string
          room_id: string
          user_id: string
          status: 'pending' | 'approved' | 'rejected'
          requested_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          status?: 'pending' | 'approved' | 'rejected'
          requested_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          status?: 'pending' | 'approved' | 'rejected'
          requested_at?: string
        }
      }
      expenses: {
        Row: {
          id: string
          room_id: string
          user_id: string
          amount: number
          description: string
          status: 'pending' | 'approved' | 'rejected'
          created_at: string
          currency?: string | null
          fx_rate?: number | null
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          amount: number
          description: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          currency?: string | null
          fx_rate?: number | null
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          amount?: number
          description?: string
          status?: 'pending' | 'approved' | 'rejected'
          created_at?: string
          currency?: string | null
          fx_rate?: number | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}