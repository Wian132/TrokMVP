import { createClient } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';

// This client uses the Service Role Key and should only be used in server-side environments
// where the key is secure. It bypasses all RLS policies.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);
