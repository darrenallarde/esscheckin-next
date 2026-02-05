-- =============================================================================
-- FIX get_organization_people OR-JOINs
-- =============================================================================
-- Problem: LEFT JOIN student_game_stats ... ON profile_id = p.id OR student_id = p.id
-- causes duplicate rows when both columns are set. Same issue in check_ins subqueries
-- which double-count when both profile_id and student_id match.
--
-- Fix:
-- 1. Backfill any orphaned rows (profile_id IS NULL but student_id IS NOT NULL)
-- 2. Change JOINs to use profile_id only
-- =============================================================================

-- Step 1: Backfill orphaned student_game_stats rows
UPDATE student_game_stats
SET profile_id = student_id
WHERE profile_id IS NULL AND student_id IS NOT NULL;

-- Step 2: Backfill orphaned check_ins rows
UPDATE check_ins
SET profile_id = student_id
WHERE profile_id IS NULL AND student_id IS NOT NULL;

-- Step 3: Drop and recreate get_organization_people with profile_id-only JOINs
DROP FUNCTION IF EXISTS public.get_organization_people(UUID, TEXT[], UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.get_organization_people(
  p_org_id UUID,
  p_role_filter TEXT[] DEFAULT NULL,
  p_campus_id UUID DEFAULT NULL,
  p_include_archived BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  role TEXT,
  status TEXT,
  campus_id UUID,
  campus_name TEXT,
  display_name TEXT,
  is_claimed BOOLEAN,
  is_parent BOOLEAN,
  linked_children_count BIGINT,
  grade TEXT,
  gender TEXT,
  high_school TEXT,
  last_check_in TIMESTAMPTZ,
  total_check_ins BIGINT,
  total_points INTEGER,
  current_rank TEXT,
  needs_triage BOOLEAN,
  group_ids UUID[],
  group_names TEXT[],
  group_roles TEXT[],
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone_number,
    om.role,
    om.status,
    om.campus_id,
    c.name AS campus_name,
    om.display_name,
    (p.user_id IS NOT NULL) AS is_claimed,
    EXISTS (SELECT 1 FROM parent_student_links psl WHERE psl.parent_profile_id = p.id) AS is_parent,
    (SELECT COUNT(*) FROM parent_student_links psl WHERE psl.parent_profile_id = p.id) AS linked_children_count,
    sp.grade,
    sp.gender,
    sp.high_school,
    (
      SELECT MAX(ci.checked_in_at)
      FROM check_ins ci
      WHERE ci.profile_id = p.id
    ) AS last_check_in,
    (
      SELECT COUNT(*)
      FROM check_ins ci
      WHERE ci.profile_id = p.id
    ) AS total_check_ins,
    COALESCE(sgs.total_points, 0)::INTEGER AS total_points,
    COALESCE(sgs.current_rank, 'Newcomer') AS current_rank,
    om.needs_triage,
    COALESCE(
      (SELECT array_agg(gm.group_id ORDER BY g.name)
       FROM group_memberships gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.profile_id = p.id),
      ARRAY[]::UUID[]
    ) AS group_ids,
    COALESCE(
      (SELECT array_agg(g.name ORDER BY g.name)
       FROM group_memberships gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.profile_id = p.id),
      ARRAY[]::TEXT[]
    ) AS group_names,
    COALESCE(
      (SELECT array_agg(gm.role ORDER BY g.name)
       FROM group_memberships gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.profile_id = p.id),
      ARRAY[]::TEXT[]
    ) AS group_roles,
    om.created_at
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  LEFT JOIN student_game_stats sgs ON sgs.profile_id = p.id
  LEFT JOIN campuses c ON c.id = om.campus_id
  WHERE om.organization_id = p_org_id
    AND (p_role_filter IS NULL OR om.role = ANY(p_role_filter))
    AND (p_campus_id IS NULL OR om.campus_id IS NULL OR om.campus_id = p_campus_id)
    AND (p_include_archived OR om.status != 'archived')
  ORDER BY p.first_name, p.last_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_people(UUID, TEXT[], UUID, BOOLEAN) TO authenticated;
