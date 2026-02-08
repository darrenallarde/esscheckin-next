# SheepDoggo (ESS Check-in)

## SESSION STARTUP — MANDATORY BEFORE ANY WORK

**Do this BEFORE reading files, writing code, or running any commands.**

1. Read `~/.claude/projects/-home-darrenallarde-echo-esscheckin-next/memory/recollection.md` — this is your save file from the last session or pre-compaction checkpoint. It tells you where you were, what branch you were on, and what you were doing.
2. Run `git worktree list` and `git branch --show-current`.
3. **If worktrees exist AND you're on `main`:** STOP. You are almost certainly in the wrong place. Context compaction resets your working directory to the repo root. Ask the user which worktree to work in, then `cd` into it.
4. **If on a feature branch:** Confirm with the user: "I'm on `feature/X` — is that correct?"
5. **Only after confirming your location:** proceed with work.
6. **Update `recollection.md`** at natural checkpoints: after commits, after completing a skill, after reading a batch of files, before any long operation. This is your insurance against compaction.

**Why this exists:** On Feb 7, context compaction silently moved a session from a `feature/copilot-v2` worktree back to `main`. The entire Co-Pilot V2 feature was committed directly to main, bypassing the feature branch and PR review. This protocol prevents that from ever happening again.

---

Youth ministry check-in + engagement platform. Next.js 14 (App Router), Supabase (PostgreSQL + Auth + Edge Functions), shadcn/ui, TanStack Query, Tailwind CSS.

## Architecture

```
src/app/(public)/         # No auth: check-in kiosk, devotionals, landing
src/app/(protected)/[org] # Auth required: home, people, insights, settings...
src/components/           # By feature: checkin/, home/, insights/, settings/...
src/hooks/queries/        # React Query hooks (use-*.ts)
src/hooks/mutations/      # Mutation hooks
src/lib/supabase/         # Supabase clients (browser, server, middleware)
src/lib/chms/             # ChMS integration adapters (Rock, PCO, CCB)
supabase/functions/       # Edge functions (send-sms, send-otp-sms, chms-sync...)
```

## Deep References

| Topic            | File                              | Key Contents                                                    |
| ---------------- | --------------------------------- | --------------------------------------------------------------- |
| Architecture     | `docs/architecture.md`            | Multi-tenancy, data flow, UI patterns, SMS routing, Insights V2 |
| Database Schema  | `docs/database.md`                | Full schema (17+ tables), RLS policies, belonging status        |
| API Reference    | `docs/api-reference.md`           | 30+ RPCs, API routes, edge functions                            |
| Security         | `docs/security.md`                | RLS helpers, bot prevention, check-in modes                     |
| Integrations     | `docs/integrations.md`            | Twilio, Resend, Anthropic, Supabase config                      |
| Analytics        | `docs/AMPLITUDE.md`               | Event taxonomy, naming rules, property schemas                  |
| AI System        | `docs/ai-recommendations.md`      | Prompt design, recommendation schema                            |
| Auth Patterns    | `docs/claude/auth-patterns.md`    | Phone OTP, Email OTP, Username/Password, middleware, sessions   |
| Migrations       | `docs/claude/migrations.md`       | Create/apply migrations, staging-first workflow, pitfalls       |
| ChMS Integration | `docs/claude/chms-integration.md` | 3-provider adapter architecture, sync engine, edge functions    |
| Mistakes         | `docs/mistakes.md`                | Bug post-mortems with prevention rules                          |
| Deployment       | `docs/deployment.md`              | Vercel, Supabase CLI, env vars                                  |
| Testing          | `docs/claude/testing.md`          | Vitest, Playwright, TDD workflow, mocking                       |
| ChMS Status      | `docs/CHMS_INTEGRATION_STATUS.md` | Deployment status, test credentials                             |

## Code Standards

1. **Every query MUST filter by organization_id.** Multi-tenant app. Missing this = cross-org data leak. Every hook accepts `organizationId` and passes `.eq("organization_id", ...)` or RPC `p_org_id`.
2. **Read before writing.** Never modify a file you haven't read. Never write SQL against a table without checking its schema via `mcp__supabase__list_tables`.
3. **RPC column names = frontend expectations.** Changing a return column silently breaks the UI. Before modifying any RPC, `grep -r "function_name" src/` and match columns exactly. See `docs/api-reference.md` for the critical RPC → consumer table.
4. **RLS uses SECURITY DEFINER helpers.** Never reference an RLS-protected table directly inside a policy. Use `auth_is_super_admin()`, `auth_profile_org_ids()`, `auth_has_org_role()`. See `docs/security.md`.
5. **One profile per person.** `profiles` is the identity table. Roles come from `organization_memberships`. Never create duplicate profiles.
6. **Analytics events: check registry first.** Before adding any tracking call, check `docs/AMPLITUDE.md`. Format: `snake_case` (`object_action`). No PII.
7. **Every user action needs visible feedback.** Loading spinners, error messages (inline, not just toast), success confirmation. No dead UI — if it looks clickable, it must work.
8. **Home screen: modal-first.** All person-level actions on `/home` open in vaul Drawers (bottom sheets). No navigation away. Other pages use Dialog modals.
9. **No speculative fixes.** Parse the error → check schema → check logs. One fix at a time. Each bug is unique.

## Database Rules

1. **Migrations go to BOTH environments.** Staging (`vilpdnwkfsmvqsiktqdf`) first, test, then production (`hhjvsvezinrbxeropeyl`). Never production-only.
2. **If you wrote a migration file, recommend `/db-migrate` immediately.** Frontend code is useless without the database changes it depends on. Migration → test → ship. Never skip to `/ship`.
3. **`devotional_engagements` has NO `created_at`.** Use `opened_at`, `reflected_at`, `prayed_at`, `journaled_at`.
4. **Legacy tables exist but are deprecated.** `students`, `organization_members`, `group_members`, `group_leaders` — use `profiles`/`organization_memberships`/`group_memberships` instead.
5. **Insights queries only touch `insights_people` view** via `run_insights_query` RPC. 4-layer safety: LLM prompt → TS validator → PG RPC → no direct GRANT.
6. **SMS routing requires org code first.** No auto-routing by phone number. See `docs/architecture.md` for the full routing flow.

## Testing

- **TDD is mandatory for pure logic.** State machines, scoring, validators, parsers — tests FIRST, code second. Use `/qa` to enforce. See `docs/claude/testing.md` for the decision matrix, patterns, and anti-patterns.
- **Never mock Supabase.** If it touches the network, E2E it or skip the unit test. Mock soup gives false confidence.
- Unit: `npm run test:run` (Vitest). E2E: `npm run test:e2e` (Playwright). Server Components: Playwright only.

## Git & Deploy

- Push `main` → Vercel auto-deploys from `darrenallarde/esscheckin-next`.
- **Never commit to main when worktrees exist.** You should be on a feature branch. `/ship` enforces this.
- Env vars: `.env.local` for local, Vercel dashboard for production. `SUPABASE_SERVICE_ROLE_KEY` required for edge functions.
- Edge functions deploy via Supabase CLI.
- Kill ports 3000-3003 before starting dev server.

## Mistakes Log

<!-- Short summaries only. Full post-mortems: docs/mistakes.md -->

| Date  | Mistake                                                                    | Rule                     |
| ----- | -------------------------------------------------------------------------- | ------------------------ |
| Feb 6 | No org_id filter on `useAIRecommendations` — cross-org data leak           | Code Standards #1        |
| Feb 4 | RPC returned `role` not `user_role` — admin features disappeared           | Code Standards #3        |
| Feb 5 | SQL referenced `de.created_at` — doesn't exist on `devotional_engagements` | Code Standards #2        |
| Feb 5 | Stored Twilio `"queued"` instead of `"sent"`                               | Code Standards #2        |
| Feb 5 | Session restore didn't hydrate user name                                   | Test both paths          |
| Feb 5 | Wrong email branding (Seedling/green vs SheepDoggo/purple)                 | Check templates          |
| Feb 7 | Recommended `/cleanup` skill without reading its definition                | Read SKILL.md first      |
| Feb 7 | Recommended `/ship` before applying migration                              | Database Rules #2        |
| Feb 7 | Committed Co-Pilot V2 to main instead of worktree branch                   | Session Startup Protocol |

Full details: `docs/mistakes.md`
