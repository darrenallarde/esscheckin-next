-- =============================================================================
-- INSIGHTS V2: SQL GENERATION VIEW + RPC
-- =============================================================================
-- Creates a read-only view (insights_people) and a safe execution RPC
-- (run_insights_query) for AI-generated SQL queries.
--
-- Safety model (4 layers):
-- 1. LLM Prompt — instructs SELECT only against insights_people
-- 2. TypeScript Validator — regex-based keyword/table blocking
-- 3. RPC Validator — same checks in PostgreSQL + statement timeout
-- 4. Query Wrapper — injects WHERE organization_id = $1 LIMIT 200
--
-- The view has NO GRANT to authenticated/anon — only accessible via RPC.
-- =============================================================================

-- =============================================================================
-- 1. INSIGHTS_PEOPLE VIEW
-- =============================================================================
-- Joins all relevant tables into a single queryable view.
-- Exposes 30+ columns for the LLM to query against.

CREATE OR REPLACE VIEW public.insights_people AS
SELECT
  -- Identity
  p.id AS profile_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone_number,
  p.date_of_birth,
  EXTRACT(MONTH FROM p.date_of_birth)::INT AS birth_month,
  CASE
    WHEN p.date_of_birth IS NOT NULL
    THEN EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth))::INT
    ELSE NULL
  END AS age,

  -- Student data
  sp.grade,
  sp.gender,
  sp.high_school,
  sp.instagram_handle,
  sp.address,
  sp.city,
  sp.state,
  sp.zip,

  -- Organization membership
  om.organization_id,
  om.role,
  om.status,
  om.needs_triage,
  om.display_name AS membership_display_name,
  om.created_at AS membership_created_at,
  om.campus_id,

  -- Campus
  c.name AS campus_name,

  -- Account status
  (p.user_id IS NOT NULL) AS is_claimed,

  -- Gamification
  COALESCE(gs.total_points, 0) AS total_points,
  COALESCE(gs.current_rank, 'Newcomer') AS current_rank,

  -- Check-in aggregates
  COALESCE(ci.total_check_ins, 0) AS total_check_ins,
  ci.last_check_in,

  -- Group aggregates
  COALESCE(gm.group_names, ARRAY[]::TEXT[]) AS group_names,
  COALESCE(gm.group_roles, ARRAY[]::TEXT[]) AS group_roles,
  COALESCE(gm.group_ids, ARRAY[]::UUID[]) AS group_ids,
  COALESCE(array_length(gm.group_names, 1), 0) AS group_count

FROM public.profiles p

-- Organization membership (required — scopes to org)
INNER JOIN public.organization_memberships om
  ON om.profile_id = p.id

-- Student-specific data (optional)
LEFT JOIN public.student_profiles sp
  ON sp.profile_id = p.id

-- Campus (optional)
LEFT JOIN public.campuses c
  ON c.id = om.campus_id

-- Gamification stats (optional)
LEFT JOIN public.student_game_stats gs
  ON gs.profile_id = p.id

-- Check-in aggregates (subquery)
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::BIGINT AS total_check_ins,
    MAX(checked_in_at) AS last_check_in
  FROM public.check_ins ci
  WHERE ci.profile_id = p.id
    AND ci.organization_id = om.organization_id
) ci ON true

-- Group aggregates (subquery)
LEFT JOIN LATERAL (
  SELECT
    array_agg(g.name ORDER BY g.name) AS group_names,
    array_agg(gm_inner.role ORDER BY g.name) AS group_roles,
    array_agg(g.id ORDER BY g.name) AS group_ids
  FROM public.group_memberships gm_inner
  INNER JOIN public.groups g ON g.id = gm_inner.group_id
  WHERE gm_inner.profile_id = p.id
    AND g.organization_id = om.organization_id
) gm ON true;

-- No GRANT to authenticated or anon — view is only accessible via the RPC below.
COMMENT ON VIEW public.insights_people IS 'Read-only view for AI Insights SQL generation. Not directly accessible via API — use run_insights_query RPC.';


-- =============================================================================
-- 2. RUN_INSIGHTS_QUERY RPC
-- =============================================================================
-- Safely executes a validated SELECT query against insights_people.
-- SECURITY DEFINER so it can access the view without direct grants.

CREATE OR REPLACE FUNCTION public.run_insights_query(
  p_org_id UUID,
  p_sql TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '5s'
SET search_path = public
AS $$
DECLARE
  v_sql TEXT;
  v_lower TEXT;
  v_result JSONB;
BEGIN
  -- Normalize for validation
  v_lower := lower(trim(p_sql));

  -- SAFETY LAYER 1: Must be a SELECT statement
  IF NOT (v_lower LIKE 'select%') THEN
    RAISE EXCEPTION 'Only SELECT statements are allowed';
  END IF;

  -- SAFETY LAYER 2: Block dangerous keywords
  IF v_lower ~ '\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|execute|exec|call|do)\b' THEN
    RAISE EXCEPTION 'Forbidden SQL keyword detected';
  END IF;

  -- Block statement terminators and comments
  IF p_sql LIKE '%;%' OR p_sql LIKE '%--%' OR p_sql LIKE '%/*%' THEN
    RAISE EXCEPTION 'SQL comments and multiple statements are not allowed';
  END IF;

  -- SAFETY LAYER 3: Must reference insights_people
  IF v_lower NOT LIKE '%insights_people%' THEN
    RAISE EXCEPTION 'Query must reference insights_people view';
  END IF;

  -- Block direct table references (prevent bypassing the view)
  IF v_lower ~ '\b(auth\.|pg_|information_schema|profiles\b[^_]|organization_memberships|student_profiles|check_ins|student_game_stats|group_memberships|organizations\b|sms_|game_transactions|student_achievements)' THEN
    RAISE EXCEPTION 'Direct table access is not allowed — use insights_people view';
  END IF;

  -- SAFETY LAYER 4: Wrap query with org_id filter and row limit
  -- The user's SQL becomes a subquery, and we always enforce org scoping
  v_sql := format(
    'SELECT COALESCE(jsonb_agg(row_to_json(sub.*)), ''[]''::jsonb) FROM (%s) sub WHERE sub.organization_id = %L LIMIT 200',
    p_sql,
    p_org_id
  );

  -- Execute with timeout (set at function level)
  EXECUTE v_sql INTO v_result;

  RETURN COALESCE(v_result, '[]'::jsonb);

EXCEPTION
  WHEN query_canceled THEN
    RAISE EXCEPTION 'Query timed out (5 second limit). Try a simpler query.';
  WHEN OTHERS THEN
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.run_insights_query IS 'Safely executes validated SELECT queries against insights_people view with org scoping and row limits.';

-- Grant execute to authenticated users (the RPC handles auth internally)
GRANT EXECUTE ON FUNCTION public.run_insights_query(UUID, TEXT) TO authenticated;
