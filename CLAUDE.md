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

**Identity System (Phase 4):**
- `profiles` - ONE record per human (name, email, phone, optional user_id link to auth)
- `organization_memberships` - Role in org (owner/admin/leader/viewer/student/guardian) + campus_id for scoping
- `group_memberships` - Participation in groups (leader/member role)
- `student_profiles` - Student-specific extension (grade, school, parents)
- `parent_student_links` - Family relationships (links guardian profiles to student profiles)

Key principle: ONE profile per person, multiple memberships define roles. An admin who is also a group member uses the SAME profile.

**Roles in organization_memberships:**
| Role | Description |
|------|-------------|
| owner | Org owner with billing access |
| admin | Full admin access (within campus scope if campus_id is set) |
| leader | Can manage their groups and check-in |
| viewer | Read-only access to dashboards |
| student | Students who check in and participate |
| guardian | Non-attending parents who receive communications and view linked children |

Core:
- `organizations`, `organization_invitations` (invitations now have profile_id for claiming)
- `check_ins` - References profile_id
- `student_game_stats`, `student_achievements`, `game_transactions` - Reference profile_id
- `curriculum_weeks`, `ai_recommendations`, `interactions` - Reference profile_id

Groups System:
- `campuses` - Multi-campus support (scopes org_memberships and groups)
- `groups` - Student groups (MS Boys, HS Girls, etc.) with optional campus_id
- `group_meeting_times` - Meeting schedule per group

SMS System:
- `sms_messages` - Individual SMS messages (inbound/outbound)
- `sms_sessions` - Active routing sessions (phone → org mapping)
- `sms_waiting_room` - Unknown contacts awaiting org code
- `sms_broadcasts` - Broadcast campaigns (message, targeting, status)
- `sms_broadcast_recipients` - Individual broadcast recipients with delivery status

**Legacy tables (deprecated, will be removed):**
- `students` - Replaced by profiles + student_profiles
- `organization_members` - Replaced by organization_memberships
- `group_members`, `group_leaders` - Replaced by group_memberships

RPC Functions:
- `search_student_for_checkin(term)` - Searches profiles + student_profiles by phone/name (includes leaders with group_membership)
- `register_student_and_checkin(...)` - Creates profile → student_profile → org_membership → check_in → guardian profiles
- `checkin_student(profile_id)` - Idempotent daily check-in
- `get_student_group_streak(profile_id, group_id)` - Per-group streak calculation
- `get_user_organizations(user_id)` - User's orgs via profile → organization_memberships
- `get_student_game_profile(profile_id)` - Gamification profile
- `get_all_organizations()` - Super admin: list all orgs
- `create_organization(name, owner_email, slug, timezone)` - Super admin: create new org
- `is_super_admin(user_id)` - Check if user is super admin
- `get_organization_members(org_id)` - Returns organization_memberships + profiles
- `get_my_org_profile(org_id)` - Current user's profile in an org
- `accept_pending_invitations(user_id, email, display_name)` - Creates profile + organization_membership

People & Guardian Functions:
- `get_organization_people(org_id, role_filter, campus_id, include_archived)` - Unified people list for Students/Team/Parents tabs
- `get_organization_parents(org_id)` - Returns valid guardians with their linked children (excludes phantom guardians)
- `get_parent_children(parent_profile_id, org_id)` - Get children linked to a guardian
- `get_student_parents(student_profile_id, org_id)` - Get parents linked to a student
- `get_student_siblings(student_id)` - Returns siblings via shared valid parents (prevents phantom matches)
- `link_parent_to_student(...)` - Create parent-student link
- `unlink_parent_from_student(...)` - Remove parent-student link
- `create_guardian_profiles_from_student(...)` - Auto-create guardian profiles from student_profiles data
- `invite_guardian_to_claim(...)` - Create invitation for guardian to claim profile
- `accept_invitation_and_claim_profile(...)` - Claim existing profile via invitation

Validation Helper Functions:
- `is_valid_phone(phone)` - Returns true if phone is not empty, not all zeros, and has 7+ digits
- `is_valid_email(email)` - Returns true if email has valid format and is not a placeholder (unknown@unknown.com, etc.)

SMS Broadcast Functions:
- `get_broadcast_recipients(org_id, target_type, group_ids[], include_leaders, include_members)` - Get recipients based on targeting criteria
- `create_broadcast(org_id, message, target_type, group_ids[], include_leaders, include_members)` - Create broadcast and populate recipients
- `get_organization_broadcasts(org_id)` - List all broadcasts for an org
- `get_broadcast_details(broadcast_id)` - Get broadcast with recipient details
- `update_broadcast_status(broadcast_id, status, sent_count, failed_count)` - Update broadcast status (service_role only)

### RPC Function Modification Rules (CRITICAL - PREVENTS REGRESSIONS)

**Changing an RPC function's return columns can silently break the frontend.**

On Feb 4, 2026, the `get_user_organizations` function was modified to return `role` instead of `user_role`. The frontend expected `user_role` to determine admin permissions. Result: **ALL admin features disappeared** (Organization settings, Org Tools, group leader management) because `userRole` was `null`.

**BEFORE modifying ANY RPC function:**

1. **Search for ALL usages in the codebase:**
   ```bash
   grep -r "function_name" src/
   ```

2. **Check the expected return columns in TypeScript:**
   - Look for the type definition or inline type in hooks/contexts
   - Example: `OrganizationContext.tsx` line 102 expects `user_role`, not `role`

3. **Match column names EXACTLY:**
   - If frontend expects `user_role`, return `user_role` (not `role`)
   - If frontend expects `display_name`, return `display_name` (not `displayName`)

4. **Test the affected features after migration:**
   - Don't just test that the RPC returns data
   - Test that the UI features that depend on the data still work

**Critical RPC functions and their consumers:**

| Function | Consumer | Critical Columns |
|----------|----------|------------------|
| `get_user_organizations` | `OrganizationContext.tsx` | `user_role`, `display_name`, `theme_id`, `checkin_style`, `short_code`, `org_number` |
| `get_organization_people` | `use-people.ts` | `profile_id`, `first_name`, `last_name`, `role`, `status` |
| `search_student_for_checkin` | `use-student-search.ts` | `profile_id`, `first_name`, `last_name`, `phone_number` |

**If you're unsure about column names, READ THE FRONTEND CODE FIRST.**

### RLS Architecture (IMPORTANT)

**All RLS policies use SECURITY DEFINER helper functions to prevent infinite recursion.**

Helper functions (bypass RLS):
- `auth_is_super_admin(user_id)` - Check if user has super_admin role
- `auth_user_org_ids(user_id)` - Get org IDs user belongs to (legacy)
- `auth_profile_org_ids(user_id)` - Get org IDs via profiles system (preferred)
- `auth_has_org_role(org_id, roles[])` - Check if user has specific role in org
- `auth_can_manage_parent_links(parent_id, student_id, user_id)` - Check if user can manage parent-student links

**Reference file:** `supabase/rls-policies.sql` - canonical policy definitions

**When creating new RLS policies:**
1. NEVER call a table directly in a policy if that table has its own RLS
2. Use the helper functions above instead
3. If you need a new permission check, create a SECURITY DEFINER function for it

### SMS Routing Flow (receive-sms edge function)

**New contacts MUST text an org code to connect. No auto-routing by phone number.**

```
STEP 0: Check pending switch confirmation (YES/NO response)
STEP 1: Check for commands (HELP, EXIT, SWITCH)
STEP 2: Check if message is an org code → Connect to org
STEP 3: Check for recent conversation (24-hour window) → Auto-route reply
STEP 4: Check for active session → Route to that org
STEP 5: [REMOVED] - No auto-routing based on phone number matching
STEP 6: Unknown contact → Waiting room → Requires org code
```

**Security rationale (Feb 2026):** Previously STEP 5 auto-matched phone numbers to existing profiles and connected them to orgs. This was removed because:
1. Someone could accidentally text the wrong organization
2. A stranger's phone could be routed to a ministry without verification
3. New contacts must intentionally provide an org code first

The 24-hour reply window (STEP 3) is kept for convenience - once connected via code, replies auto-route without re-entering the code.

### SMS Broadcasts

Broadcasts are **separate from the Messages inbox**. They have their own UI at `/[org]/broadcasts`.

- `target_type`: "all" (all groups) or "groups" (specific groups)
- `include_leaders` / `include_members`: Filter by role in group_memberships
- Recipients are populated when broadcast is created
- Edge function `send-broadcast` sends with 1 msg/sec rate limiting (Twilio long code limit)

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
