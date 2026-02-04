# ESS Check-in Next.js

A student check-in application for Echo Students built with Next.js 14 and Supabase.

## DEBUGGING RULES (MUST FOLLOW)

**When encountering ANY error, follow this sequence. No exceptions.**

### 1. READ THE ACTUAL ERROR FIRST (Escalate, Don't Blast)
Use the **cheapest diagnostic first**, escalate only if needed:

1. **Parse the error message/URL** (~0 tokens) - Often contains table/column name
   - Example: `student_achievements?...organization_id=eq.xxx` tells you the query uses `organization_id`
2. **Check table schema** (`list_tables` ~2k tokens) - Verify column exists
3. **Check logs** (`get_logs` ~12k tokens) - Only if #1 and #2 don't reveal the cause

For frontend errors: Read the full error message, not just the status code
For API errors: Check both client console AND server logs

### 2. VERIFY BEFORE ASSUMING
- **Never assume** staging and production have identical schemas
- **Always check** `mcp__supabase__list_tables` to verify columns exist before writing functions that use them
- **Always check** what data actually exists before assuming it's there

### 3. ONE FIX AT A TIME
- Apply ONE targeted fix based on the actual error
- Test it
- If it doesn't work, check logs again - the error may have changed
- Do NOT stack multiple speculative fixes

### 4. NO PATTERN MATCHING
- Each bug is unique. Do not assume it's "the same issue as before"
- Even if symptoms look similar, verify the root cause through logs

### 5. ADMIT UNCERTAINTY
- If you're not sure what's wrong, say so and investigate
- Do NOT apply fixes hoping they'll work
- Investigation is not wasted time; wrong fixes are

**The 30-second rule:** If checking logs would take 30 seconds and could reveal the exact issue, DO THAT FIRST before writing any migration or code change.

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

**CRITICAL: Always apply migrations to BOTH environments!**

| Environment | Project ID | Purpose |
|-------------|------------|---------|
| **STAGING** | `vilpdnwkfsmvqsiktqdf` | Local dev (`npm run dev`) - test here first |
| **PRODUCTION** | `hhjvsvezinrbxeropeyl` | Vercel deployment - real student data |

### Migration Workflow (MUST FOLLOW)

When applying ANY database migration:
1. **Apply to STAGING first**: `mcp__supabase__apply_migration` with `project_id: vilpdnwkfsmvqsiktqdf`
2. **Test locally** at `localhost:3000`
3. **Then apply to PRODUCTION**: `mcp__supabase__apply_migration` with `project_id: hhjvsvezinrbxeropeyl`

**Never apply to production only. Local development uses staging.**

Dashboards:
- Staging: https://supabase.com/dashboard/project/vilpdnwkfsmvqsiktqdf
- Production: https://supabase.com/dashboard/project/hhjvsvezinrbxeropeyl

### Database Tables (as of Feb 2026)

Core:
- `organizations`, `organization_members`, `organization_invitations`
- `students`, `check_ins`
- `student_game_stats`, `student_achievements`, `game_transactions`
- `curriculum_weeks`, `ai_recommendations`, `interactions`

**Key columns in `organization_members`:**
- `display_name` - Team member's display name for messaging (e.g., "Pastor Mike"). Shown in SMS signatures and conversation threads.

Groups System (Phase 3):
- `campuses` - Future multi-campus support
- `groups` - Student groups (MS Boys, HS Girls, etc.)
- `group_meeting_times` - Meeting schedule per group
- `group_leaders` - Leaders assigned to groups
- `group_members` - Students in groups

RPC Functions:
- `get_student_group_streak(student_id, group_id)` - Per-group streak calculation
- `get_user_organizations(user_id)` - User's org memberships (returns display_name, theme_id, checkin_style)
- `get_student_game_profile(student_id)` - Gamification profile
- `get_all_organizations()` - Super admin: list all orgs
- `create_organization(name, owner_email, slug, timezone)` - Super admin: create new org
- `is_super_admin(user_id)` - Check if user is super admin
- `get_organization_members(org_id)` - Team members with display_name, email, role
- `get_my_org_profile(org_id)` - Current user's profile in an org
- `update_member_display_name(org_id, user_id, display_name)` - Update member's display name
- `accept_pending_invitations(user_id, email, display_name)` - Accept invites with optional display name

### RLS Architecture (IMPORTANT)

**All RLS policies use SECURITY DEFINER helper functions to prevent infinite recursion.**

Helper functions (bypass RLS):
- `auth_is_super_admin(user_id)` - Check if user has super_admin role
- `auth_user_org_ids(user_id)` - Get org IDs user belongs to
- `auth_has_org_role(org_id, roles[])` - Check if user has specific role in org

**Reference file:** `supabase/rls-policies.sql` - canonical policy definitions

**When creating new RLS policies:**
1. NEVER call a table directly in a policy if that table has its own RLS
2. Use the helper functions above instead
3. If you need a new permission check, create a SECURITY DEFINER function for it

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

## Quality Checklist: "Ship It Like You Use It"

**Every feature must be complete, not just functional.**

### Before Writing Code

1. **Understand Mission Impact**
   - Who uses this feature?
   - What are they trying to accomplish?
   - What happens if it fails for them?

2. **System Audit**
   - What existing features does this touch?
   - Where else does this data appear in the UI?
   - What other components use this hook/function?

3. **State Inventory**
   - What does SUCCESS look like?
   - What does LOADING look like?
   - What does ERROR look like? (specific errors, not just "error")
   - What does EMPTY look like?

### During Implementation

4. **Feedback Rule** — Every user action MUST have visible feedback
   - Click → something changes (spinner, message, navigation)
   - Error → user sees what went wrong AND what to do
   - Success → user knows it worked
   - Never rely solely on toast() — always add inline feedback for critical errors

5. **No Dead UI**
   - If it looks clickable, it must be clickable
   - If it has a hover state, it must have an onClick
   - If it's not ready, don't show it (or show "coming soon")

### After Implementation

6. **User Testing** (not developer testing)
   - Use the feature on mobile/iPad
   - Try to break it (wrong input, slow network, back button)
   - Try the feature from every entry point

7. **Integration Check**
   - Did this break anything else?
   - Do related features still work?
   - Is the data consistent across views?

### Common Anti-patterns to Avoid

| Problem | Example | Fix |
|---------|---------|-----|
| Silent errors | toast() without Toaster rendered | Add inline error messages |
| Dead UI | hover state without onClick | Wire up handler or remove hover style |
| Missing feedback | form submit with no loading state | Add isLoading state and spinner |
| Unfinished integration | Button exists but does nothing | Implement or hide with "coming soon" |

## Analytics Event Rules (MUST FOLLOW)

**Prevent duplicate events that corrupt analytics data.**

### 1. NEVER Create an Event Without Checking the Registry

Before adding ANY tracking call:
1. **Check `docs/analytics.md` first**
2. If event exists → use the **exact name and properties** listed
3. If event doesn't exist → **add to registry FIRST**, then implement

### 2. Event Naming Convention

- **Format:** `{object}_{action}` in `snake_case`
- **Examples:** `checkin_started`, `sms_sent`, `student_created`
- **NEVER:** camelCase (`checkInStarted`), PascalCase (`CheckinStarted`), kebab-case (`checkin-started`)

### 3. Required Properties (Every Event)

The `analytics.track()` wrapper enforces these automatically:
- `org_id` - Organization UUID (null for public)
- `org_slug` - Organization slug for readable analysis (null for public)
- `user_id` - Who triggered it (null for public actions)
- `timestamp` - ISO 8601 timestamp
- `source` - Where in the app (`kiosk`, `dashboard`, `api`, etc.)

### 4. Before Adding a New Event

1. Search `docs/analytics.md` for similar events
2. Check if existing event could be extended with a new property
3. Add to registry with full documentation
4. THEN implement the tracking call

### 5. No PII in Events

- Never log emails, phone numbers, or names directly
- Use `email_domain` instead of full email
- Use IDs instead of names

## Deployment

1. Push to `main` branch on GitHub
2. Vercel auto-deploys from `darrenallarde/esscheckin-next`
3. Ensure env vars are set in Vercel project settings
