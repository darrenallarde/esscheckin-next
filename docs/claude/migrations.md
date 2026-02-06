# Migration Workflow

Reference for creating and applying Supabase migrations in SheepDoggo.

## Naming Convention

**Format:** `YYYYMMDD[phase]00000_descriptive_name.sql`

| Example | Pattern |
|---------|---------|
| `20260206400000_chms_integration_tables.sql` | Date + phase 4 + description |
| `20260208100000_add_prayer_request.sql` | Date + phase 1 + description |
| `20260209500000_fix_is_org_admin_member_dual_table.sql` | Date + phase 5 + description |

Phase numbers (`000000`, `100000`, `200000`...) order multiple migrations on the same date.

**Location:** `supabase/migrations/` (69 files as of Feb 2026)

## Staging-First Workflow

1. **Write migration** in `supabase/migrations/`
2. **Apply to staging** (`vilpdnwkfsmvqsiktqdf`) via Supabase SQL Editor or CLI
3. **Test** on dev server (`npm run dev` → localhost:3000) against staging
4. **Apply to production** (`hhjvsvezinrbxeropeyl`) — same SQL
5. **Never production-only** — staging always first

**Apply via SQL Editor:** Supabase Dashboard → SQL Editor → paste migration → Run

**Apply via CLI:**
```bash
supabase db push --project-ref vilpdnwkfsmvqsiktqdf   # staging
supabase db push --project-ref hhjvsvezinrbxeropeyl   # production
```

## SQL Patterns

### Table Creation

```sql
CREATE TABLE IF NOT EXISTS public.table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- columns...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_org ON public.table_name(organization_id);
COMMENT ON TABLE public.table_name IS 'Description';
```

### RPC / Function Creation

```sql
CREATE OR REPLACE FUNCTION public.function_name(
  p_org_id UUID,
  p_param TEXT
)
RETURNS TABLE (column1 UUID, column2 TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auth check first
  IF NOT auth_has_org_role(p_org_id, ARRAY['owner', 'admin']) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY SELECT ...;
END;
$$;

GRANT EXECUTE ON FUNCTION public.function_name TO authenticated;
```

### RLS Policies

```sql
ALTER TABLE public.table_name ENABLE ROW LEVEL SECURITY;

-- NEVER query RLS-protected tables directly in policies — use helpers
CREATE POLICY "table_select" ON public.table_name
  FOR SELECT USING (auth_has_org_role(organization_id, ARRAY['owner', 'admin']));

CREATE POLICY "table_insert" ON public.table_name
  FOR INSERT WITH CHECK (auth_has_org_role(organization_id, ARRAY['owner', 'admin']));

GRANT SELECT, INSERT, UPDATE ON public.table_name TO authenticated;
```

### Views

```sql
-- DROP first (views can't use CREATE OR REPLACE when columns change)
DROP VIEW IF EXISTS public.view_name;
CREATE VIEW public.view_name AS SELECT ...;
COMMENT ON VIEW public.view_name IS 'Description';
```

### Schema Alterations

```sql
ALTER TABLE table_name ADD COLUMN IF NOT EXISTS column_name TEXT;
-- If function signature changes, drop old then create new:
DROP FUNCTION IF EXISTS function_name(old_param_types);
CREATE OR REPLACE FUNCTION function_name(new_params) ...;
```

## Pre-Migration Checklist

1. **Check table schema** — run `mcp__supabase__list_tables` or read migration files. Don't assume columns exist (e.g., `devotional_engagements` has NO `created_at`).
2. **Check RPC consumers** — `grep -r "rpc_name" src/` before changing return columns. Changing a column name silently breaks the UI.
3. **NOT NULL on existing data** — if adding NOT NULL column to table with rows, provide a DEFAULT.
4. **SECURITY DEFINER needs `SET search_path = public`** — prevents search path injection.
5. **Dual-table awareness** — during migration period, helper functions must check BOTH `organization_members` (legacy) AND `organization_memberships` (new).
6. **Always `public.` schema prefix** — explicit schema on all tables, functions, views.
7. **Idempotency** — use `IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE`.

## Common Pitfalls

| Mistake | What Happened | Prevention |
|---------|--------------|-----------|
| RPC column rename | Changed `role` → `user_role`, broke admin features | Grep all consumers before changing return columns |
| Non-existent column | Referenced `de.created_at` on `devotional_engagements` | Always check table schema before writing SQL |
| Missing dual-table check | Auth helper only checked new table, broke legacy users | Helper functions must check BOTH table systems |
| No `SET search_path` | SECURITY DEFINER function without `SET search_path = public` | Always add to every SECURITY DEFINER function |
| Production-only migration | Applied to prod without staging test | Always staging first, test, then production |
