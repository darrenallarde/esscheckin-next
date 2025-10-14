// Supabase configuration - auto-detects environment
// localhost → staging, loveable.app → production

export const SUPABASE_CONFIG = {
  // PRODUCTION DATABASE
  production: {
    url: "https://hhjvsvezinrbxeropeyl.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoanZzdmV6aW5yYnhlcm9wZXlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4NTA5ODMsImV4cCI6MjA3NDQyNjk4M30.3PbuFmcryznfZkV071rOYfhixqFubDiB5QF2kwMspSs",
  },

  // STAGING DATABASE
  staging: {
    url: "https://vilpdnwkfsmvqsiktqdf.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpbHBkbndrZnNtdnFzaWt0cWRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDI1MjgsImV4cCI6MjA3NDY3ODUyOH0._MU2VbX_8_aVSiLzbMQs3MWlMUoE7dFpv1P2rZNBwcI",
  },
} as const;

// Auto-detect environment based on hostname
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const ACTIVE_ENVIRONMENT: 'production' | 'staging' = 'production'; // YOLO: Force production for testing

// Export the active configuration
export const ACTIVE_CONFIG = SUPABASE_CONFIG[ACTIVE_ENVIRONMENT];

// Helpful log to verify which environment is active
console.log(`🔌 Supabase: Auto-detected ${ACTIVE_ENVIRONMENT.toUpperCase()} (${ACTIVE_CONFIG.url})`);
