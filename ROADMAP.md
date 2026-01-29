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

### 2. Station/Device Tracking

**Implementation:**
- Store `stationId` in localStorage on first setup
- On first visit: Show station selection modal
- Remember selection for future sessions
- Include `station_id` in check-in records for analytics

**Station Selection UI:**
```
"Which station is this iPad?"
[ Front Door ]
[ Side Entrance ]
[ Overflow Room ]
[ + Add New Station ]
```

**Database Changes:**
- Add `stations` table: `id, organization_id, name, created_at`
- Add `station_id` column to `check_ins` table

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
4. Test thoroughly on iPad Safari

**Phase 2: Sentry Integration** ✅ COMPLETE
1. ✅ Install and configure Sentry
2. ✅ Add client-side config with Session Replay
3. Test error capture

**Phase 3: Station Tracking**
1. Create stations table
2. Add station selection UI
3. Store in localStorage + check_ins table

**Phase 4: Abuse Prevention**
1. Add rate limiting middleware
2. Create flagged check-ins dashboard

**Phase 5: OTP Improvements**
1. Better error handling and feedback
2. Fallback mechanisms

---

## Verification Checklist

- [x] Can access `/echo-students/checkin` without logging in
- [x] Can search for student and check in (no auth)
- [ ] Works on iPad Safari (needs testing)
- [x] Errors appear in Sentry dashboard
- [ ] Station selection persists across sessions
- [ ] Rate limiting blocks excessive requests
- [ ] Admin can still access protected routes with OTP

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

*Roadmap last updated: January 29, 2026*
