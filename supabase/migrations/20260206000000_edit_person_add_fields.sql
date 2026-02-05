-- =============================================================================
-- Add missing fields to get_organization_people + update_person_profile
-- =============================================================================
-- Fixes TWO issues:
--
-- 1. Belonging Spectrum shows all students as "Missing"
--    Root cause: get_organization_people doesn't return belonging_status,
--    check_ins_last_4_weeks, or check_ins_last_8_weeks. The hook defaults
--    null belonging_status to "Missing".
--
-- 2. Edit Person modal missing fields
--    - date_of_birth, address, city, state, zip not returned by RPC
--    - instagram_handle not returned or editable
--    - update_person_profile doesn't accept date_of_birth or instagram_handle
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 1: Extend get_organization_people with missing columns
-- ─────────────────────────────────────────────────────────────────────────────

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
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  instagram_handle TEXT,
  last_check_in TIMESTAMPTZ,
  total_check_ins BIGINT,
  check_ins_last_4_weeks BIGINT,
  check_ins_last_8_weeks BIGINT,
  belonging_status TEXT,
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
    p.date_of_birth,
    sp.address,
    sp.city,
    sp.state,
    sp.zip,
    sp.instagram_handle,
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
    (
      SELECT COUNT(*)
      FROM check_ins ci
      WHERE ci.profile_id = p.id
        AND ci.checked_in_at >= (NOW() - INTERVAL '28 days')
    ) AS check_ins_last_4_weeks,
    (
      SELECT COUNT(*)
      FROM check_ins ci
      WHERE ci.profile_id = p.id
        AND ci.checked_in_at >= (NOW() - INTERVAL '56 days')
    ) AS check_ins_last_8_weeks,
    -- Compute belonging_status server-side
    CASE
      WHEN NOT EXISTS (SELECT 1 FROM check_ins ci WHERE ci.profile_id = p.id)
        THEN 'Missing'
      WHEN (
        (SELECT COUNT(*) FROM check_ins ci WHERE ci.profile_id = p.id) >= 10
        AND (NOW() - (SELECT MAX(ci.checked_in_at) FROM check_ins ci WHERE ci.profile_id = p.id)) <= INTERVAL '7 days'
      ) THEN 'Ultra-Core'
      WHEN (
        (SELECT COUNT(*) FROM check_ins ci WHERE ci.profile_id = p.id) >= 5
        AND (NOW() - (SELECT MAX(ci.checked_in_at) FROM check_ins ci WHERE ci.profile_id = p.id)) <= INTERVAL '14 days'
      ) THEN 'Core'
      WHEN (NOW() - (SELECT MAX(ci.checked_in_at) FROM check_ins ci WHERE ci.profile_id = p.id)) <= INTERVAL '21 days'
        THEN 'Connected'
      WHEN (NOW() - (SELECT MAX(ci.checked_in_at) FROM check_ins ci WHERE ci.profile_id = p.id)) <= INTERVAL '45 days'
        THEN 'On the Fringe'
      ELSE 'Missing'
    END AS belonging_status,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- Part 2: Extend update_person_profile with date_of_birth + instagram_handle
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_person_profile(
  p_org_id UUID,
  p_profile_id UUID,
  -- Profile fields
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  -- Student profile fields
  p_grade TEXT DEFAULT NULL,
  p_high_school TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_zip TEXT DEFAULT NULL,
  p_instagram_handle TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_admin BOOLEAN;
  v_has_student_profile BOOLEAN;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Not authenticated'::TEXT;
    RETURN;
  END IF;

  -- Check if user is admin of the organization
  SELECT EXISTS (
    SELECT 1 FROM organization_memberships om
    JOIN profiles p ON p.id = om.profile_id
    WHERE om.organization_id = p_org_id
    AND p.user_id = v_user_id
    AND om.role IN ('owner', 'admin')
    AND om.status = 'active'
  ) OR auth_is_super_admin(v_user_id)
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    RETURN QUERY SELECT FALSE, 'Permission denied: admin access required'::TEXT;
    RETURN;
  END IF;

  -- Check if profile belongs to this organization
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE organization_id = p_org_id
    AND profile_id = p_profile_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'Person not found in this organization'::TEXT;
    RETURN;
  END IF;

  -- Update profiles table
  UPDATE profiles
  SET
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    email = CASE WHEN p_email IS NOT NULL THEN NULLIF(TRIM(p_email), '') ELSE email END,
    phone_number = CASE WHEN p_phone_number IS NOT NULL THEN NULLIF(TRIM(p_phone_number), '') ELSE phone_number END,
    date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
    updated_at = NOW()
  WHERE id = p_profile_id;

  -- Check if person has a student profile
  SELECT EXISTS (
    SELECT 1 FROM student_profiles WHERE profile_id = p_profile_id
  ) INTO v_has_student_profile;

  -- Update student_profiles if exists and student fields provided
  IF v_has_student_profile THEN
    UPDATE student_profiles
    SET
      grade = COALESCE(p_grade, grade),
      high_school = CASE WHEN p_high_school IS NOT NULL THEN NULLIF(TRIM(p_high_school), '') ELSE high_school END,
      gender = CASE WHEN p_gender IS NOT NULL THEN NULLIF(TRIM(p_gender), '') ELSE gender END,
      address = CASE WHEN p_address IS NOT NULL THEN NULLIF(TRIM(p_address), '') ELSE address END,
      city = CASE WHEN p_city IS NOT NULL THEN NULLIF(TRIM(p_city), '') ELSE city END,
      state = CASE WHEN p_state IS NOT NULL THEN NULLIF(TRIM(p_state), '') ELSE state END,
      zip = CASE WHEN p_zip IS NOT NULL THEN NULLIF(TRIM(p_zip), '') ELSE zip END,
      instagram_handle = CASE WHEN p_instagram_handle IS NOT NULL THEN NULLIF(TRIM(p_instagram_handle), '') ELSE instagram_handle END,
      updated_at = NOW()
    WHERE profile_id = p_profile_id;
  END IF;

  RETURN QUERY SELECT TRUE, 'Profile updated successfully'::TEXT;
END;
$$;
