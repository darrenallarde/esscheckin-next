# ESS Check-in Next.js

A student check-in application for Echo Students built with Next.js 14 and Supabase.

## Project History

- **Original**: `darrenallarde/esscheckin` - Vite + React app (legacy)
- **Current**: `darrenallarde/esscheckin-next` - Next.js 14 migration (this repo)
- **Deployed to**: Vercel (needs to be connected to this repo)

The migration from Vite to Next.js was done to leverage App Router, server components, and better SEO.

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
- All migrations should be applied here

**Staging Project**: `vilpdnwkfsmvqsiktqdf` (testing only - do not use for production work)

### Database Tables (as of Jan 2026)

Core:
- `organizations`, `organization_members`, `organization_invitations`
- `students`, `check_ins`
- `student_game_stats`, `student_achievements`, `game_transactions`
- `curriculum_weeks`, `ai_recommendations`, `interactions`

Groups System (Phase 3):
- `campuses` - Future multi-campus support
- `groups` - Student groups (MS Boys, HS Girls, etc.)
- `group_meeting_times` - Meeting schedule per group
- `group_leaders` - Leaders assigned to groups
- `group_members` - Students in groups

RPC Functions:
- `get_student_group_streak(student_id, group_id)` - Per-group streak calculation
- `get_user_organizations(user_id)` - User's org memberships
- `get_student_game_profile(student_id)` - Gamification profile

## Project Structure

```
src/
├── app/
│   ├── (public)/           # Public routes
│   │   ├── auth/           # Auth pages and callback
│   │   ├── setup/          # Initial setup wizard
│   │   └── page.tsx        # Landing/check-in page (JRPG themed)
│   └── (protected)/        # Authenticated routes
│       ├── dashboard/      # Main dashboard with stats
│       ├── students/       # Group-based student management
│       ├── pastoral/       # Kanban workflow (placeholder)
│       ├── analytics/      # Charts and leaderboards
│       ├── curriculum/     # Weekly content
│       └── settings/       # Tabbed settings page
├── components/
│   ├── analytics/          # StatCard, Charts, Leaderboard
│   ├── checkin/            # JRPG check-in flow
│   ├── groups/             # GroupCard, modals
│   ├── layout/             # AppSidebar
│   ├── pastoral/           # PastoralQueue
│   ├── shared/             # StreakMeter, DrillDownModal
│   └── ui/                 # shadcn/ui components
├── hooks/
│   └── queries/            # React Query hooks
├── lib/supabase/           # Supabase clients
├── utils/                  # gamificationDB, bibleVerses
└── types/
```

## Navigation Structure

```
Dashboard → /dashboard (stats, trend chart, leaderboard, pastoral queue)
Students  → /students (group cards with drill-down)
Pastoral  → /pastoral (Kanban workflow - Phase 4)
Analytics → /analytics (all charts consolidated)
Curriculum → /curriculum (Phase 5)
Settings  → /settings (tabbed: Account, Team, Import)
```

## Implementation Status

### Completed
- [x] Phase 1: Dashboard refresh (stat cards, trend chart, leaderboard, pastoral queue)
- [x] Phase 2: Analytics page (attendance charts, engagement funnel, achievements)
- [x] Phase 3: Groups system (database + UI for group management)

### Pending
- [ ] Phase 4: Pastoral Kanban workflow
- [ ] Phase 5: Curriculum management & polish

## Environment Variables

Required in `.env.local` (and Vercel):
```
NEXT_PUBLIC_SUPABASE_URL=https://hhjvsvezinrbxeropeyl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Development

```bash
npm run dev    # Start dev server at localhost:3000
npm run build  # Build for production
npm run lint   # Run ESLint
```

## Deployment

1. Push to `main` branch on GitHub
2. Vercel auto-deploys from `darrenallarde/esscheckin-next`
3. Ensure env vars are set in Vercel project settings
