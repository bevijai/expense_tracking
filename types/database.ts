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
      itinerary_days: {
        Row: {
          id: string
          room_id: string
          date: string // ISO date (YYYY-MM-DD)
          created_at: string
        }
        Insert: {
          id?: string
          room_id: string
          date: string
          created_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          date?: string
          created_at?: string
        }
      }
      itinerary_items: {
        Row: {
          id: string
          day_id: string
          time?: string | null // HH:MM
          title: string
          notes?: string | null
          location?: string | null
          created_at: string
        }
        Insert: {
          id?: string
          day_id: string
          time?: string | null
          title: string
          notes?: string | null
          location?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          day_id?: string
          time?: string | null
          title?: string
          notes?: string | null
          location?: string | null
          created_at?: string
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