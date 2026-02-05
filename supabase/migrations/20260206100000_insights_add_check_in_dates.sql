-- =============================================================================
-- INSIGHTS: Add recent_check_in_dates column to insights_people view
-- =============================================================================
-- Enables date-specific attendance queries like "who showed up on Feb 4th"
-- by storing an array of check-in dates from the last 90 days.
--
-- The previous view only had last_check_in (most recent) and total_check_ins (count),
-- which couldn't answer "who attended on a specific date" questions.
-- =============================================================================

-- Drop and recreate the view to add the new column
DROP VIEW IF EXISTS public.insights_people;

CREATE VIEW public.insights_people AS
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
  COALESCE(array_length(gm.group_names, 1), 0) AS group_count,

  -- Check-in date array (new - for date-specific attendance queries)
  COALESCE(ci.recent_check_in_dates, ARRAY[]::DATE[]) AS recent_check_in_dates

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
    MAX(checked_in_at) AS last_check_in,
    array_agg(DISTINCT checked_in_at::date ORDER BY checked_in_at::date DESC)
      FILTER (WHERE checked_in_at >= CURRENT_DATE - INTERVAL '90 days')
      AS recent_check_in_dates
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

COMMENT ON VIEW public.insights_people IS 'Read-only view for AI Insights SQL generation. Not directly accessible via API — use run_insights_query RPC.';
