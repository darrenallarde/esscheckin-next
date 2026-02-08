# Mistakes Log (Detailed)

Detailed post-mortems for bugs caused by Claude. CLAUDE.md has the summary table — this file has the full context so patterns don't repeat.

---

## Feb 6: Cross-org data leak — ESS students in Amarp's pastoral queue

**Severity:** CRITICAL (multi-tenant isolation failure)

**What happened:** `useAIRecommendations()` hook had no `organizationId` parameter. It queried `ai_recommendations` without `.eq("organization_id", ...)`, returning pastoral care data for ALL orgs. Amarp staff saw ESS students on their home page pastoral queue.

**Two failures:**

1. **Client-side:** Hook missing org_id parameter and filter
2. **Database:** `ai_recommendations` table had no RLS policies — no safety net

**Fix (commit `992c049`):** Added `organizationId` param to hook + `.eq("organization_id", organizationId)` filter.

**Rule:** Every hook must accept `organizationId` and filter by it. Every table needs RLS as defense-in-depth.

---

## Feb 4: RPC column rename broke all admin features

**What happened:** `get_user_organizations` RPC was modified to return `role` instead of `user_role`. `OrganizationContext.tsx` expected `user_role` to determine admin permissions. Result: `userRole` was `null`, all admin features (settings, org tools, group leader management) disappeared.

**Fix:** Reverted column name back to `user_role`.

**Rule:** Before modifying any RPC, grep all consumers in `src/` and match column names exactly.

---

## Feb 5: Referenced non-existent column `created_at` on `devotional_engagements`

**What happened:** Wrote SQL referencing `de.created_at` which doesn't exist on `devotional_engagements`. The table uses `opened_at`, `reflected_at`, `prayed_at`, `journaled_at` instead.

**Rule:** Always check table schema via `mcp__supabase__list_tables` before writing SQL.

---

## Feb 5: Stored Twilio's "queued" status instead of "sent"

**What happened:** Twilio returns `status: "queued"` on initial API response (before actual delivery). We stored this directly. Users saw messages stuck in "queued" state because we have no Twilio status callback webhook configured.

**Fix:** Store `"sent"` on successful Twilio API response since we can't track actual delivery status without a webhook.

**Rule:** Understand third-party status value lifecycles before storing them.

---

## Feb 5: Session restore showed "Welcome, there"

**What happened:** Fresh login hydrated the user's display name correctly. But session restore (page refresh / returning user) took a different code path that didn't look up the profile name. Users always saw "Welcome, there" instead of "Welcome, Darren".

**Fix:** Added profile lookup on session restore path.

**Rule:** Test session restore separately from fresh login — they're different code paths.

---

## Feb 5: Invitation email had wrong branding

**What happened:** Invitation email template used Seedling branding (green, old logo) instead of SheepDoggo branding (purple, current logo). Was copy-pasted from an older template without updating styles.

**Fix:** Updated email template to match OTP email design (SheepDoggo purple, correct logo).

**Rule:** Check all email/notification templates for branding consistency when restyling.

---

## Feb 7: Recommended `/cleanup` skill without reading its definition

**What happened:** In `/guide`, confidently recommended `/cleanup` for a feature removal task based solely on the skill name. After actually reading the SKILL.md, `/cleanup` is for lint-style cleanup (console.logs, `any` types, unused imports) — completely wrong for intentional feature deletion.

**Rule:** NEVER recommend a skill/command without first reading its SKILL.md definition. Infer nothing from names alone.

---

## Feb 7: Recommended `/ship` before applying migration

**What happened:** Wrote a migration SQL file as Phase 1 of a 4-phase implementation. After completing all phases and the build passing, recommended `/ship` as the next step. The migration had never been applied to staging or production — every new RPC, table, and column the frontend depends on didn't exist yet. User had to correct me to run `/db-migrate` first.

**Rule:** If you wrote a migration file, ALWAYS recommend `/db-migrate` as the immediate next step. Frontend code is useless without the database changes it depends on. Migration → test → ship, never skip the first step.
