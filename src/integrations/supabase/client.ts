// Uses config file that ships with the build
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { ACTIVE_CONFIG } from '@/config/supabase.config';

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(
  ACTIVE_CONFIG.url,
  ACTIVE_CONFIG.anonKey,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);