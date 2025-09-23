import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast with a helpful message
if (!url || !anonKey) {
  throw new Error(
    'Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

// One shared browser-safe client
export const supabase = createClient<Database>(url, anonKey);