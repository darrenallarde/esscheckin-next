# ESS Check-in Next.js

A student check-in application for Echo Students built with Next.js 14 and Supabase.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **UI**: shadcn/ui + Tailwind CSS + Radix UI
- **Forms**: react-hook-form + zod
- **State**: TanStack Query (React Query)
- **Charts**: Recharts

## Supabase Configuration

**PRODUCTION Project**: `hhjvsvezinrbxeropeyl`
- Dashboard: https://supabase.com/dashboard/project/hhjvsvezinrbxeropeyl
- This is the live database with real student data

**Staging Project**: `vilpdnwkfsmvqsiktqdf` (testing only - do not use for production work)

### MCP Integration

Supabase MCP is configured in `.mcp.json` (gitignored). After restarting Claude Code, you should have access to:
- `list_tables` - List all tables in the database
- `execute_sql` - Run read-only SQL queries
- `get_schemas` - Get table schemas
- `list_projects` - List Supabase projects

To verify MCP is working, run: `claude mcp list`

## Project Structure

```
src/
├── app/
│   ├── (public)/          # Public routes (auth, landing, setup)
│   │   ├── auth/          # Auth pages and callback
│   │   ├── setup/         # Initial setup wizard
│   │   └── page.tsx       # Landing/check-in page
│   └── (protected)/       # Authenticated routes
│       ├── dashboard/     # Main dashboard
│       ├── students/      # Student management
│       ├── attendance/    # Attendance tracking
│       ├── curriculum/    # Curriculum management
│       └── settings/      # Account, team, import settings
├── components/
│   ├── checkin/           # Check-in related components
│   ├── layout/            # App sidebar, navigation
│   └── ui/                # shadcn/ui components
├── hooks/                 # Custom React hooks
├── lib/
│   └── supabase/          # Supabase client (server.ts, client.ts)
├── types/                 # TypeScript types
└── utils/                 # Utility functions (gamification, bible verses)
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon/public key
- `ANTHROPIC_API_KEY` (optional) - For AI pastoral insights

## Development

```bash
npm run dev    # Start dev server
npm run build  # Build for production
npm run lint   # Run ESLint
```

## Current State

- Basic Next.js app with Supabase integration
- Auth flow implemented
- Dashboard with debug info for troubleshooting RLS/org membership
- Check-in form with modifications in progress

## Git Status (as of session start)

- Modified: `.gitignore` (added MCP config to ignore)
- Modified: `src/components/checkin/CheckInForm.tsx`
