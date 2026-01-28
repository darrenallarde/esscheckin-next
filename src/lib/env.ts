export const env = {
  appEnv: process.env.NEXT_PUBLIC_APP_ENV as 'staging' | 'production',
  isStaging: process.env.NEXT_PUBLIC_APP_ENV === 'staging',
  isProduction: process.env.NEXT_PUBLIC_APP_ENV === 'production',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
} as const;
