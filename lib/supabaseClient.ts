import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

// Support both NEXT_PUBLIC_* and non-prefixed names (some hosts scope envs differently for functions)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

// Do not throw at import time in serverless environments; use placeholders if missing.
// Calls will fail at runtime with clear network/auth errors, but the app won't 500 on import.
const safeUrl = url || 'https://placeholder.supabase.co';
const safeKey = anonKey || 'placeholder';

export const supabase = createClient<Database>(safeUrl, safeKey as string);