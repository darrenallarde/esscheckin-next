# Seedling Product Roadmap

> **Context**: See `PRODUCT_VISION.md` for the comprehensive product vision.

---

# PRIORITY -1: CRITICAL - Fix Check-in Reliability (01/29/2026 Incident)

## Problem Statement

On 01/28/2026, the check-in iPad failed at a live event:
- OTP button did nothing when tapped (no submission, no error)
- Check-in page required login, blocking the entire flow
- No way to debug on iPad Safari (no console access)
- Result: Could not check students in at all

## Root Cause Analysis

The real issue isn't OTP reliability - it's that **check-in requires authentication at all**.
When auth fails, the entire check-in flow is blocked with no fallback.

## Solution: Public Check-in Architecture

### 1. Fully Public Check-in Page (`/c/[org-slug]`)

**URL Structure:**
- `/c/echo-students` → Public check-in for Echo Students org
- No login required for students OR for the iPad
- Works even if admin isn't logged in

**RLS Strategy:**
- Create `anon`-accessible RPC functions for check-in operations
- `search_student_for_checkin_public(org_slug, search_term)` - SECURITY DEFINER
- `checkin_student_public(org_slug, student_id)` - SECURITY DEFINER
- These bypass RLS but are scoped to specific org by slug

**Files to Create/Modify:**
- `src/app/(public)/c/[org]/page.tsx` - New public check-in page
- `src/components/checkin/PublicCheckInForm.tsx` - Check-in form without auth
- Database: New RPC functions with SECURITY DEFINER

### 2. Device Tracking

**Implementation:**
- Store `deviceId` in localStorage on first setup
- On first visit: Show device naming modal
- Remember selection for future sessions
- Include `device_id` in check-in records for analytics

**Device Setup UI:**
```
"Name this device:"
[ Front Door iPad ]
[ Side Entrance iPad ]
[ Overflow Room iPad ]
[ + Custom Name ]
```

**Database Changes:**
- Add `devices` table: `id, organization_id, name, created_at`
- Add `device_id` column to `check_ins` table

### 3. Sentry Error Tracking ✅ INSTALLED

**Setup Complete:**
- `@sentry/nextjs` installed
- `sentry.server.config.ts` - Server errors
- `sentry.edge.config.ts` - Edge runtime errors
- `sentry.client.config.ts` - Client/browser errors with Session Replay
- `next.config.mjs` - withSentryConfig wrapper
- `src/instrumentation.ts` - Hooks server/edge configs

**What We Capture:**
- All unhandled exceptions
- Failed API calls
- User context (org, station, but NOT student PII)
- Breadcrumbs for user actions leading to error
- Session Replay on errors (see exactly what user did)

### 4. Abuse Prevention

**Rate Limiting:**
- Max 100 check-ins per IP per hour
- Max 5 failed searches per minute per IP
- Implement via Supabase Edge Function or middleware

**Admin Review:**
- Flag check-ins from new/unrecognized devices
- Dashboard shows "Flagged Check-ins" for review
- Admin can approve or mark as fraudulent

### 5. OTP Reliability Improvements (for Admin Functions)

Even though check-in won't need auth, admin functions still do. Improve OTP:
- Add loading state with spinner
- Show explicit error messages
- Add retry button on failure
- Log OTP attempts to Sentry
- Consider fallback: magic link email if OTP fails

---

## Implementation Phases

**Phase 1: Public Check-in Page** ✅ COMPLETE
1. ✅ Created SECURITY DEFINER RPC functions:
   - `search_student_for_checkin_public(p_org_slug, p_search_term)`
   - `checkin_student_public(p_org_slug, p_student_id)`
   - `register_student_and_checkin_public(p_org_slug, ...)`
2. ✅ Built `PublicCheckInForm` and `PublicNewStudentForm` components
3. ✅ Updated `/[org]/checkin` page to use public functions
4. ✅ Added RLS policy for anon to read active orgs (was causing 404)
5. ✅ Tested on iPad Safari - WORKS!

**Phase 2: Sentry Integration** ✅ COMPLETE
1. ✅ Install and configure Sentry
2. ✅ Add client-side config with Session Replay
3. ✅ Sentry MCP connected for real-time debugging
4. ✅ Test error capture - confirmed working

**Phase 2.5: Email/SMTP** ✅ COMPLETE (01/29/2026)
1. ✅ Configured Resend as custom SMTP provider
2. ✅ Removed Supabase built-in email (had 30/hour project limit)
3. ✅ Domain verified: sheepdoggo.ai
4. ✅ No more rate limit issues

**Phase 3: Device Tracking** ✅ COMPLETE (01/29/2026)
1. ✅ Created devices table with RLS policies
2. ✅ Added DeviceSetupModal with suggested names
3. ✅ Store in localStorage + check_ins.device_id
4. ✅ Device name in footer (tappable to change)
5. ✅ Tracks last_seen_at for analytics

**Phase 4: Abuse Prevention**
1. Add rate limiting middleware
2. Create flagged check-ins dashboard

**Phase 5: OTP Improvements** ✅ COMPLETE (01/29/2026)
1. ✅ Added inline status messages (toasts don't render on iPad Safari)
2. ✅ Custom SMTP via Resend (no more Supabase rate limits)
3. ✅ Error messages now visible on all devices

---

## Verification Checklist

- [x] Can access `/ess-ministry/checkin` without logging in
- [x] Can search for student and check in (no auth)
- [x] Works on iPad Safari ✅ (01/29/2026)
- [x] Errors appear in Sentry dashboard
- [x] Admin can login via OTP on iPad Safari ✅ (01/29/2026)
- [x] Device name persists across sessions ✅ (01/29/2026)
- [ ] Rate limiting blocks excessive requests

---

# PRIORITY -0.5: Attendance Cleanup Tool

## Problem Statement

When check-in fails (iPad issues, connectivity, etc.), admins need a way to retroactively record attendance. The 01/28/2026 incident required manually importing from Google Forms CSV - this was clunky and error-prone (name matching issues with "Mary " vs "Mary", "Pardo de Zela" vs "Pardo").

**Need**: An elegant, standalone tool for retroactive check-ins that handles real-world name variations.

## Solution: Settings > Attendance Cleanup

A new page in Settings that allows admins to:
1. Pick a single date/time for the check-in
2. Add students via search (with fuzzy matching) OR quick-add entire groups
3. Review selection and submit
4. See results (created vs skipped duplicates)

## User Flow

```
1. Select Date & Time
   ┌─────────────────────────┐  ┌─────────────────┐
   │ [Calendar] Jan 28, 2026 │  │ [Time] 6:30 PM  │
   └─────────────────────────┘  └─────────────────┘

2. Add Students
   Quick Add by Group:
   [MS Boys (12)] [MS Girls (8)] [HS Boys (15)] [HS Girls (11)]

   Search: [🔍 Search by name or phone...]
   Results appear below, click to add

3. Review Selection
   Selected Students (24):
   [John Pardo de Zela ✕] [Sarah Johnson ✕] [Mike Thompson ✕] ...

   [Preview & Submit]

4. Results
   ✅ 22 students checked in
   ⏭️ 2 skipped (already checked in that day)

   [Check in more students]
```

## Key UX Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Input method | Manual selection (not CSV) | More elegant, handles name issues |
| Date selection | Single date for all | Simpler UX, batch operations |
| Group selection | Adds to current selection | Can mix groups + individuals |
| Duplicates | Skip silently | Don't create errors for honest mistakes |
| Gamification | Award points | Retroactive check-ins should count |

## Database Changes

**Migration: `update_historical_checkin_with_org_id.sql`**

The existing `import_historical_checkin` function is missing `organization_id` parameter. Update required.

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/(protected)/[org]/settings/attendance-cleanup/page.tsx` | Page component |
| `src/components/settings/AttendanceCleanup/AttendanceCleanupForm.tsx` | Main form orchestrator |
| `src/components/settings/AttendanceCleanup/DateTimePicker.tsx` | Date & time selection |
| `src/components/settings/AttendanceCleanup/StudentSearch.tsx` | Search with fuzzy matching |
| `src/components/settings/AttendanceCleanup/GroupQuickSelect.tsx` | Group chips for quick add |
| `src/components/settings/AttendanceCleanup/SelectedStudentsList.tsx` | Selected students with remove |
| `src/components/settings/AttendanceCleanup/SubmissionSummary.tsx` | Results display |
| `src/hooks/queries/use-attendance-cleanup.ts` | Mutation hook for bulk check-ins |

## Implementation Phases

**Phase 1: Database Migration**
1. Create migration with updated `import_historical_checkin` function
2. Apply to STAGING, test, then PRODUCTION

**Phase 2: Navigation & Page Shell**
1. Add settings link with ClipboardCheck icon
2. Create page with permission check (owner/admin only)

**Phase 3: Core Components**
1. DateTimePicker - Calendar popover + time dropdown
2. StudentSearch - Debounced search, click to add
3. SelectedStudentsList - Chips with remove, clear all
4. AttendanceCleanupForm - State management, view transitions

**Phase 4: Group Integration**
1. GroupQuickSelect - Fetch groups, show as badges
2. Click handler fetches members, adds to selection (union)

**Phase 5: Submission & Results**
1. use-attendance-cleanup hook with bulk RPC calls
2. SubmissionSummary with success/skip counts

## Verification Checklist

- [ ] Can access Settings > Attendance Cleanup as admin
- [ ] Date picker only allows past dates (last 90 days)
- [ ] Time dropdown defaults to 6:30 PM
- [ ] Search finds "Pardo de Zela" when searching "Pardo"
- [ ] Click group adds all members to selection
- [ ] Duplicate students not added twice
- [ ] Can remove individual students
- [ ] Clear All requires confirmation
- [ ] Submit creates check-in records
- [ ] Duplicates silently skipped (shown in results)
- [ ] Gamification points awarded
- [ ] Can check in more students after completion

---

# PRIORITY 0: Immediate Tasks

## 0.0 SMS Multi-Org Routing System ✅ COMPLETE

**Status:** Full NPC routing enabled with dedicated Twilio number

- Dedicated Twilio number approved: +1 (833) 408-9244
- INTERIM_MODE disabled - full routing active
- Database schema deployed to staging + production
- Edge function `receive-sms` deployed

## 0.1 Conversation History UI

**Status:** Ready to implement

After SMS routing is complete, build the Messages tab:
- iMessage-style chat bubbles
- Quick templates ("We miss you!", "Praying for you")
- AI message suggestions

---

## 0.2 Belonging Spectrum Visualization

**Status:** Logic EXISTS in SQL - needs prominent UI display

**What exists:**
- `fix-belonging-spectrum-thresholds.sql` - RPC function calculating belonging status
- `QuickActionsTab.tsx` - Shows belonging badges per student

**Belonging Levels:**
| Status | Threshold | Color |
|--------|-----------|-------|
| Ultra-Core | 12+ check-ins in 8 weeks + both Wed & Sun | Purple |
| Core | 6-11 check-ins in 8 weeks | Blue |
| Connected | 2-5 check-ins in 8 weeks | Yellow |
| On the Fringe | 30-60 days since last check-in | Orange |
| Missing | 60+ days since last check-in | Red |

**Action needed:**
1. Create `BelongingSpectrum.tsx` component - 5 horizontal bars
2. Add to Dashboard page (prominent position)
3. Click bar → DrillDownModal with student list

---

## 0.3 Drill-Down Charts

**Status:** DrillDownModal component EXISTS - charts not wired up

**Action needed:**
1. Add `onClick` handlers to EngagementFunnel bars
2. Add hover tooltips showing counts + percentage
3. On click → DrillDownModal with student list
4. Student click → PersonProfileModal

---

## 0.4 Person Profile Modal

**Status:** Component referenced but not built

**Tabs:**
| Tab | Content |
|-----|---------|
| Overview | Name, contact, grade, groups, belonging status |
| Engagement | Streak meter, rank, points, achievements |
| Pastoral | AI recommendations, prayer prompts, outreach history |
| Messages | Conversation thread (from 0.1) |
| Groups | Groups they're in, attendance per group |

---

# PRIORITY 1: People & Groups UX

**Status:** Navigation split is DONE. Remaining work below.

## Overview

| Tab | Purpose |
|-----|---------|
| People | Directory of all individuals, search, profiles |
| Groups | Group management, my groups, groups I lead |

## Remaining Work

### Phase 1: Routes & Navigation ✅ DONE
- Sidebar updated
- /people and /groups routes exist

### Phase 2: Database RPCs
- `get_my_leader_groups(org_id)` - Groups where user is leader
- `get_my_member_groups(org_id)` - Groups where user is member

### Phase 3: People Page Full Build
- `usePeople` hook with pagination/search
- `PeopleTable` + `PeopleFilters` components
- Mobile card view

### Phase 4: Groups Page Enhancement
- "Groups I Lead" section
- "My Groups" section
- GroupSection component

---

# Reference Documents

| Document | Location | Contents |
|----------|----------|----------|
| Product Vision | `PRODUCT_VISION.md` | Soul of the App, Design Principles, Implementation Roadmap |
| Test Plan | `TEST_PLAN.md` | Multi-org SaaS verification, auth testing |
| Project Guide | `CLAUDE.md` | Supabase IDs, debugging rules, RLS architecture |

**Supabase Projects:**
- Staging: `vilpdnwkfsmvqsiktqdf`
- Production: `hhjvsvezinrbxeropeyl`

---

*Roadmap last updated: January 29, 2026 (Evening)*

---

# SESSION CONTEXT (01/29/2026 Evening) ✅ RESOLVED

## Issues Resolved This Session

### 1. OTP Login on iPad Safari ✅ FIXED
- **Root cause:** Supabase built-in SMTP had 30 emails/hour project-wide limit
- **Also:** Toasts don't render on iPad Safari (no visible error feedback)
- **Fix:**
  - Configured Resend as custom SMTP provider
  - Added inline status messages visible on all browsers

### 2. Public Check-in 404 ✅ FIXED
- **Root cause:** RLS blocked anon users from reading `organizations` table
- **Fix:** Added RLS policy `Allow anon to read active orgs for check-in`
- **Production URL:** `https://www.sheepdoggo.ai/ess-ministry/checkin`

### 3. Sentry MCP ✅ CONNECTED
- Added via `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp`
- Authenticated via `/mcp` command
- Organization: `seedling-12`

## Production Info

- Org slug: `ess-ministry`
- Public check-in: `https://www.sheepdoggo.ai/ess-ministry/checkin`
- SMTP: Resend (custom, no rate limits)
