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

---

## Feb 7: Committed feature work directly to main instead of worktree branch

**Severity:** HIGH (bypassed entire branch/PR review workflow)

**What happened:** User ran `/worktree-start` which created `feature/copilot-v2` branch and a worktree at `~/echo/esscheckin-next-copilot-v2`. The previous session was working in that worktree. When the session ran out of context and was continued, the new session started in `~/echo/esscheckin-next` (the main worktree) instead of the copilot-v2 worktree. The session continuation system does NOT preserve working directory.

The git status at the top of the continued session clearly showed `Current branch: main`, but Claude didn't catch this and proceeded to commit the entire Co-Pilot V2 feature (API rewrite, hook rewrite, component rewrite, migration, 128 tests) directly to main — bypassing the feature branch, skipping the PR, and auto-deploying to production without review.

**Two failures:**

1. **System:** Session continuation drops you into the repo root, not the worktree you were working in
2. **Claude:** Did not verify the branch matched the expected worktree before committing. The signal was right there in the git status header.

**Fix:** Added startup rule to CLAUDE.md — at session start, always check `git worktree list` and verify you're on the correct branch. If worktrees exist and you're on main, STOP and ask.

**Rule:** NEVER commit to main when worktrees exist without explicitly confirming with the user. At every session start, check `git worktree list`. If active worktrees exist, verify you're in the right one before writing any code.

---

## Feb 7: Rewrote RPC with assumed table/column names — 5 errors in one migration

**Severity:** HIGH (broke production game for all players)

**What happened:** Rewrote `submit_game_answer` RPC with new scoring logic. Instead of querying the actual database schema first, assumed table and column names from memory. Every assumption was wrong:

| Assumed                   | Actual                           |
| ------------------------- | -------------------------------- |
| `game_session_answers`    | `game_rounds`                    |
| `session_id`              | `game_session_id`                |
| `answer`                  | `submitted_answer`               |
| `rank`                    | `answer_rank`                    |
| `created_at`              | `started_at`                     |
| `auth.uid()` = profile_id | `profiles.id` via user_id lookup |

Each error produced a different runtime error in production, discovered one at a time as users played. Took 4 sequential hotfix migrations to fully resolve instead of 1 correct one.

**Root cause:** Didn't run `SELECT column_name FROM information_schema.columns WHERE table_name = 'game_rounds'` before writing. The rule existed in CLAUDE.md but was not followed.

**Rule (strengthened):** Before writing ANY RPC that touches a table, run the schema query FIRST. Not after the first error. Not "I think I remember." Actually query the database. Every time. No exceptions.

---

## Feb 7: Phone number format mismatch — link_phone_to_profile couldn't find existing users

**Severity:** MEDIUM (existing leaders couldn't sign into game)

**What happened:** `link_phone_to_profile` RPC normalized phone input to `+16503465544` format but only matched against that and the raw input. Existing profiles had phone numbers stored as `6503465544` (10 raw digits, no prefix). The WHERE clause had no fallback to raw-digit matching.

Similarly, `create_phone_profile` tried to INSERT `organization_id` into `profiles` — a column that doesn't exist. Organization membership lives in `organization_memberships`.

**Root cause:** Same as above — assumed data format and column existence without checking. Phone numbers in `profiles.phone_number` can be stored in any format depending on how they were originally imported.

**Rules:**

1. When matching user-provided data against stored data, check what format the stored data is actually in — don't assume it matches your normalization.
2. When writing INSERT/UPDATE statements, verify the target table's columns first.
3. Phone number matching should be fuzzy: check normalized (+1xxx), raw digits (xxx), and original input.

---

## Feb 7: RPC rewrite silently dropped a previous bugfix — miss-no-insert regression

**Severity:** HIGH (blocked player mid-game on production)

**What happened:** The `hilo_miss_no_insert` migration fixed `submit_game_answer` so misses (answer not on the list) would NOT insert into `game_rounds`, allowing the player to retry. This worked. Later, `hilo_400_answers_scoring` rewrote the entire `submit_game_answer` RPC to add 400-answer support and new scoring. The rewrite used `CREATE OR REPLACE FUNCTION` — which replaces the **entire function body**. The miss-no-insert logic was not carried forward. Misses started inserting rows again.

When a player missed on round 3 and retried, the second call hit the unique constraint `game_rounds_game_session_id_round_number_key` because a row for that round already existed from the miss.

**Why it wasn't caught:**

- Unit tests cover the client-side state machine, not the server-side RPC
- The idempotency check (added in the same rewrite) would have returned the stale miss result, masking the duplicate — but under race conditions (rapid retry), the SELECT-then-INSERT pattern fails
- No integration test exercises "miss → retry → hit" against the actual database

**Fix:** Wrapped INSERT and score UPDATE in `IF v_on_list THEN ... END IF;`. Deleted orphaned miss rows from production.

**Rule (NEW — Database Rules #7):** `CREATE OR REPLACE FUNCTION` replaces the ENTIRE body. Before rewriting any RPC, read the current source from the database (`SELECT prosrc FROM pg_proc WHERE proname = '...'`) and diff against your new version. Carry forward ALL existing fixes. Migration files are not the source of truth — direct RPC applications and hotfixes may not have corresponding files.
