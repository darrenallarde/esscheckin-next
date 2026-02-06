# /db-migrate — Database migration workflow

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Create and apply a database migration. Argument: `$ARGUMENTS` (description of the change)

## Steps

1. **Describe the change:** Parse `$ARGUMENTS`. If unclear, ask for specifics (table, columns, RPC, RLS policy, etc).
2. **Check current schema:** Use `mcp__supabase__list_tables` to verify current state. Never assume column names exist.
3. **Write migration SQL:** Create the migration file. Follow these rules:
   - Use `CREATE OR REPLACE` for functions/RPCs
   - Use `IF NOT EXISTS` for tables/columns
   - Include rollback comments
   - Every query must respect `organization_id` (multi-tenant rule)
4. **Apply to staging FIRST:** Apply via `mcp__supabase__apply_migration` against staging project (`vilpdnwkfsmvqsiktqdf`).
5. **Test on staging:** Verify the migration worked — run a test query via `mcp__supabase__execute_sql`.
6. **Apply to production:** After staging succeeds and user approves, apply to production (`hhjvsvezinrbxeropeyl`). **Always confirm before production.**

See `docs/claude/migrations.md` for detailed migration patterns and pitfalls.
