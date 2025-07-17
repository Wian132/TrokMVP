import { createClient } from '@supabase/supabase-js';

// Use the non-null assertion operator (!) to tell TypeScript that these
// environment variables will definitely be present at runtime.
// This is a clean way to handle this, assuming you have your .env.local file set up.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create the Supabase client instance.
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Use a default export for the client instance. This is a common pattern
// for modules that provide a single, primary export.
export default supabase;
