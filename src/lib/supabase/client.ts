"use client";

/**
 * Supabase Browser Client
 *
 * ENVIRONMENT: Uses PRODUCTION Supabase (hhjvsvezinrbxeropeyl)
 *
 * Required environment variables:
 *   - NEXT_PUBLIC_SUPABASE_URL: https://hhjvsvezinrbxeropeyl.supabase.co
 *   - NEXT_PUBLIC_SUPABASE_ANON_KEY: JWT anon key (starts with eyJhbGci...)
 *
 * These are set in:
 *   - .env.local (local development)
 *   - Vercel Environment Variables (production/preview)
 *
 * IMPORTANT: There are TWO Supabase projects:
 *   - PRODUCTION: hhjvsvezinrbxeropeyl (real student data - USE THIS)
 *   - STAGING:    vilpdnwkfsmvqsiktqdf (testing only - DO NOT USE)
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    console.error('Missing Supabase credentials:', {
      hasUrl: !!url,
      hasKey: !!anonKey
    });
    throw new Error('Missing Supabase environment variables. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  return createBrowserClient(url, anonKey);
}
