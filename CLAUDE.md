# SheepDoggo (ESS Check-in)

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

| Topic | File | Key Contents |
|-------|------|-------------|
| Architecture | `docs/architecture.md` | Multi-tenancy, data flow, UI patterns, SMS routing, Insights V2 |
| Database Schema | `docs/database.md` | Full schema (17+ tables), RLS policies, belonging status |
| API Reference | `docs/api-reference.md` | 30+ RPCs, API routes, edge functions |
| Security | `docs/security.md` | RLS helpers, bot prevention, check-in modes |
| Integrations | `docs/integrations.md` | Twilio, Resend, Anthropic, Supabase config |
| Analytics | `docs/AMPLITUDE.md` | Event taxonomy, naming rules, property schemas |
| AI System | `docs/ai-recommendations.md` | Prompt design, recommendation schema |
| Auth Patterns | `docs/claude/auth-patterns.md` | Phone OTP, Email OTP, Username/Password, middleware, sessions |
| Migrations | `docs/claude/migrations.md` | Create/apply migrations, staging-first workflow, pitfalls |
| ChMS Integration | `docs/claude/chms-integration.md` | 3-provider adapter architecture, sync engine, edge functions |
| Mistakes | `docs/mistakes.md` | Bug post-mortems with prevention rules |
| Deployment | `docs/deployment.md` | Vercel, Supabase CLI, env vars |
| Testing | `docs/claude/testing.md` | Vitest, Playwright, TDD workflow, mocking |
| ChMS Status | `docs/CHMS_INTEGRATION_STATUS.md` | Deployment status, test credentials |

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
2. **`devotional_engagements` has NO `created_at`.** Use `opened_at`, `reflected_at`, `prayed_at`, `journaled_at`.
3. **Legacy tables exist but are deprecated.** `students`, `organization_members`, `group_members`, `group_leaders` — use `profiles`/`organization_memberships`/`group_memberships` instead.
4. **Insights queries only touch `insights_people` view** via `run_insights_query` RPC. 4-layer safety: LLM prompt → TS validator → PG RPC → no direct GRANT.
5. **SMS routing requires org code first.** No auto-routing by phone number. See `docs/architecture.md` for the full routing flow.

## Testing

- Unit tests: `npm run test:run` (Vitest). Always write tests BEFORE implementation.
- E2E tests: `npm run test:e2e` (Playwright). Cover critical user flows.
- Async Server Components: test via Playwright E2E, NOT Vitest.
- Manual: test on dev server, test session restore separately, test mobile/iPad.
- Reference: `docs/claude/testing.md`

## Git & Deploy

- Push `main` → Vercel auto-deploys from `darrenallarde/esscheckin-next`.
- Env vars: `.env.local` for local, Vercel dashboard for production. `SUPABASE_SERVICE_ROLE_KEY` required for edge functions.
- Edge functions deploy via Supabase CLI.
- Kill ports 3000-3003 before starting dev server.

## Mistakes Log

<!-- Short summaries only. Full post-mortems: docs/mistakes.md -->
| Date | Mistake | Rule # |
|------|---------|--------|
| Feb 6 | No org_id filter on `useAIRecommendations` — cross-org data leak | #1 |
| Feb 4 | RPC returned `role` not `user_role` — admin features disappeared | #3 |
| Feb 5 | SQL referenced `de.created_at` — doesn't exist on `devotional_engagements` | #2 |
| Feb 5 | Stored Twilio `"queued"` instead of `"sent"` | #2 |
| Feb 5 | Session restore didn't hydrate user name | Test both paths |
| Feb 5 | Wrong email branding (Seedling/green vs SheepDoggo/purple) | Check templates |

Full details: `docs/mistakes.md`
