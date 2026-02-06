# /security-check — Security scan

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Scan the codebase for security issues:

1. **Hardcoded secrets:** Search for patterns like API keys, tokens, passwords in source files. Check for:
   - Strings matching `sk_`, `pk_`, `key_`, `token_`, `password`
   - `.env` values accidentally committed
   - Supabase service role keys in client-side code
2. **Missing org_id filters:** Search all Supabase queries (hooks, RPCs, API routes) for missing `organization_id` filters. This is the #1 security rule — every query must filter by org.
3. **RLS gaps:** Check that all tables have RLS enabled (use `mcp__supabase__get_advisors` or `mcp__supabase__execute_sql`).
4. **Injection risks:** Check API routes for unsanitized user input, especially in:
   - SQL queries (should all go through RPCs)
   - `insights` query builder (should be validated)
5. **Auth bypass:** Check middleware and protected routes for proper auth checks.
6. **Report:** Present findings grouped by severity (Critical / Warning / Info).

This is read-only — no changes are made.
