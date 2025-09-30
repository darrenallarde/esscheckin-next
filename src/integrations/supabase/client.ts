// Modified to use environment variables for local dev vs production
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://hhjvsvezinrbxeropeyl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoanZzdmV6aW5yYnhlcm9wZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTA5ODMsImV4cCI6MjA3NDQyNjk4M30.3PbuFmcryznfZkV071rOYfhixqFubDiB5QF2kwMspSs";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});