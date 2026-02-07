---
name: db-check
description: Audit database health
user-invocable: true
---

# /db-check — Audit database health

**Safety preamble:** For ANY destructive or risky operation, explain what/why/risks/undo and wait for explicit approval.

Run a database health check using Supabase MCP tools:

1. **List tables:** Use `mcp__supabase__list_tables` to get the current schema.
2. **Check RLS:** For each table, verify RLS is enabled. Flag any tables without RLS policies.
3. **Check primary keys:** Flag any tables missing primary keys.
4. **Check pending migrations:** Use `mcp__supabase__list_migrations` to see migration status.
5. **Run advisors:** Use `mcp__supabase__get_advisors` to get Supabase's built-in recommendations.
6. **Report:** Summarize findings in a clear table format:
   - Tables without RLS
   - Tables without PKs
   - Pending/failed migrations
   - Advisor recommendations

Run against staging by default. Add "production" to `$ARGUMENTS` to check production.
