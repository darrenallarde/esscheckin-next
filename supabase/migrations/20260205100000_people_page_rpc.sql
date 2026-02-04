-- =============================================================================
-- PEOPLE PAGE REDESIGN - RPC FUNCTIONS
-- =============================================================================
-- This migration creates/updates RPC functions for:
--   1. get_organization_people - Unified people fetch for People page
--   2. create_guardian_profiles_from_student - Auto-create guardian profiles
--   3. invite_guardian_to_claim - Create invitation for profile claiming
--   4. accept_invitation_with_profile_claim - Handle profile claiming on accept
--   5. get_parent_children - Get children linked to a parent
--   6. link_parent_to_student - Link existing parent to student
--   7. unlink_parent_from_student - Remove parent-student link
--   8. search_student_for_checkin_by_org - Updated to include leaders
-- =============================================================================

-- =============================================================================
-- 1. GET ORGANIZATION PEOPLE (UNIFIED)
-- =============================================================================
-- Returns ALL org members with unified structure for People page
-- Includes: students, team (owner/admin/leader/viewer), guardians

CREATE OR REPLACE FUNCTION public.get_organization_people(
  p_org_id UUID,
  p_role_filter TEXT[] DEFAULT NULL,  -- Filter by roles, NULL = all
  p_campus_id UUID DEFAULT NULL,      -- Filter by campus, NULL = all
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
  -- Student-specific
  grade TEXT,
  gender TEXT,
  high_school TEXT,
  last_check_in TIMESTAMPTZ,
  total_check_ins BIGINT,
  total_points INTEGER,
  current_rank TEXT,
  needs_triage BOOLEAN,
  -- Group info
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
    -- Student-specific (NULL for non-students)
    sp.grade,
    sp.gender,
    sp.high_school,
    (
      SELECT MAX(ci.checked_in_at)
      FROM check_ins ci
      WHERE ci.profile_id = p.id OR ci.student_id = p.id
    ) AS last_check_in,
    (
      SELECT COUNT(*)
      FROM check_ins ci
      WHERE ci.profile_id = p.id OR ci.student_id = p.id
    ) AS total_check_ins,
    COALESCE(sgs.total_points, 0)::INTEGER AS total_points,
    COALESCE(sgs.current_rank, 'Newcomer') AS current_rank,
    om.needs_triage,
    -- Group info
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
  LEFT JOIN student_game_stats sgs ON sgs.profile_id = p.id OR sgs.student_id = p.id
  LEFT JOIN campuses c ON c.id = om.campus_id
  WHERE om.organization_id = p_org_id
    AND (p_role_filter IS NULL OR om.role = ANY(p_role_filter))
    AND (p_campus_id IS NULL OR om.campus_id IS NULL OR om.campus_id = p_campus_id)
    AND (p_include_archived OR om.status != 'archived')
  ORDER BY p.first_name, p.last_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_people(UUID, TEXT[], UUID, BOOLEAN) TO authenticated;

-- =============================================================================
-- 2. CREATE GUARDIAN PROFILES FROM STUDENT REGISTRATION
-- =============================================================================
-- Called after student registration to auto-create guardian profiles

CREATE OR REPLACE FUNCTION public.create_guardian_profiles_from_student(
  p_student_profile_id UUID,
  p_org_id UUID,
  p_campus_id UUID DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  father_profile_id UUID,
  mother_profile_id UUID,
  guardian_profile_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_data RECORD;
  v_father_profile_id UUID;
  v_mother_profile_id UUID;
  v_guardian_profile_id UUID;
  v_existing_id UUID;
BEGIN
  -- Get student profile data
  SELECT
    sp.father_first_name, sp.father_last_name, sp.father_phone, sp.father_email,
    sp.mother_first_name, sp.mother_last_name, sp.mother_phone, sp.mother_email,
    sp.parent_name, sp.parent_phone
  INTO v_student_data
  FROM student_profiles sp
  WHERE sp.profile_id = p_student_profile_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Student profile not found'::TEXT, NULL::UUID, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- =================================================================
  -- CREATE FATHER PROFILE (if info provided)
  -- =================================================================
  IF v_student_data.father_first_name IS NOT NULL
     AND (v_student_data.father_phone IS NOT NULL OR v_student_data.father_email IS NOT NULL)
  THEN
    -- Check if profile already exists by phone or email
    SELECT p.id INTO v_existing_id
    FROM profiles p
    WHERE (v_student_data.father_phone IS NOT NULL AND p.phone_number = v_student_data.father_phone)
       OR (v_student_data.father_email IS NOT NULL AND LOWER(p.email) = LOWER(v_student_data.father_email))
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      v_father_profile_id := v_existing_id;
    ELSE
      -- Create new profile
      INSERT INTO profiles (first_name, last_name, phone_number, email)
      VALUES (
        v_student_data.father_first_name,
        COALESCE(v_student_data.father_last_name, ''),
        v_student_data.father_phone,
        v_student_data.father_email
      )
      RETURNING id INTO v_father_profile_id;
    END IF;

    -- Create/update organization membership as guardian
    INSERT INTO organization_memberships (profile_id, organization_id, role, status, campus_id)
    VALUES (v_father_profile_id, p_org_id, 'guardian', 'pending', p_campus_id)
    ON CONFLICT (profile_id, organization_id)
    DO UPDATE SET campus_id = COALESCE(EXCLUDED.campus_id, organization_memberships.campus_id);

    -- Create parent-student link
    INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_primary, created_by)
    VALUES (v_father_profile_id, p_student_profile_id, 'father', TRUE, p_created_by)
    ON CONFLICT (parent_profile_id, student_profile_id) DO NOTHING;
  END IF;

  -- =================================================================
  -- CREATE MOTHER PROFILE (if info provided)
  -- =================================================================
  IF v_student_data.mother_first_name IS NOT NULL
     AND (v_student_data.mother_phone IS NOT NULL OR v_student_data.mother_email IS NOT NULL)
  THEN
    -- Check if profile already exists
    SELECT p.id INTO v_existing_id
    FROM profiles p
    WHERE (v_student_data.mother_phone IS NOT NULL AND p.phone_number = v_student_data.mother_phone)
       OR (v_student_data.mother_email IS NOT NULL AND LOWER(p.email) = LOWER(v_student_data.mother_email))
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      v_mother_profile_id := v_existing_id;
    ELSE
      INSERT INTO profiles (first_name, last_name, phone_number, email)
      VALUES (
        v_student_data.mother_first_name,
        COALESCE(v_student_data.mother_last_name, ''),
        v_student_data.mother_phone,
        v_student_data.mother_email
      )
      RETURNING id INTO v_mother_profile_id;
    END IF;

    -- Create/update organization membership
    INSERT INTO organization_memberships (profile_id, organization_id, role, status, campus_id)
    VALUES (v_mother_profile_id, p_org_id, 'guardian', 'pending', p_campus_id)
    ON CONFLICT (profile_id, organization_id)
    DO UPDATE SET campus_id = COALESCE(EXCLUDED.campus_id, organization_memberships.campus_id);

    -- Create parent-student link (primary if no father)
    INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_primary, created_by)
    VALUES (v_mother_profile_id, p_student_profile_id, 'mother', v_father_profile_id IS NULL, p_created_by)
    ON CONFLICT (parent_profile_id, student_profile_id) DO NOTHING;
  END IF;

  -- =================================================================
  -- CREATE LEGACY GUARDIAN PROFILE (if parent_name/phone provided but no mother/father)
  -- =================================================================
  IF v_father_profile_id IS NULL
     AND v_mother_profile_id IS NULL
     AND v_student_data.parent_name IS NOT NULL
     AND v_student_data.parent_phone IS NOT NULL
  THEN
    -- Check if profile already exists
    SELECT p.id INTO v_existing_id
    FROM profiles p
    WHERE p.phone_number = v_student_data.parent_phone
    LIMIT 1;

    IF v_existing_id IS NOT NULL THEN
      v_guardian_profile_id := v_existing_id;
    ELSE
      -- Parse name (simple first/last split)
      INSERT INTO profiles (first_name, last_name, phone_number)
      VALUES (
        split_part(v_student_data.parent_name, ' ', 1),
        COALESCE(NULLIF(trim(substr(v_student_data.parent_name, position(' ' in v_student_data.parent_name) + 1)), ''), ''),
        v_student_data.parent_phone
      )
      RETURNING id INTO v_guardian_profile_id;
    END IF;

    -- Create organization membership
    INSERT INTO organization_memberships (profile_id, organization_id, role, status, campus_id)
    VALUES (v_guardian_profile_id, p_org_id, 'guardian', 'pending', p_campus_id)
    ON CONFLICT (profile_id, organization_id)
    DO UPDATE SET campus_id = COALESCE(EXCLUDED.campus_id, organization_memberships.campus_id);

    -- Create parent-student link
    INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_primary, created_by)
    VALUES (v_guardian_profile_id, p_student_profile_id, 'guardian', TRUE, p_created_by)
    ON CONFLICT (parent_profile_id, student_profile_id) DO NOTHING;
  END IF;

  RETURN QUERY SELECT
    TRUE,
    'Guardian profiles created'::TEXT,
    v_father_profile_id,
    v_mother_profile_id,
    v_guardian_profile_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_guardian_profiles_from_student(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_guardian_profiles_from_student(UUID, UUID, UUID, UUID) TO anon;

-- =============================================================================
-- 3. INVITE GUARDIAN TO CLAIM PROFILE
-- =============================================================================

CREATE OR REPLACE FUNCTION public.invite_guardian_to_claim(
  p_guardian_profile_id UUID,
  p_org_id UUID,
  p_invited_by UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  invitation_id UUID,
  invitation_token TEXT,
  guardian_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_invitation_id UUID;
  v_token TEXT;
BEGIN
  -- Get guardian profile
  SELECT p.id, p.email, p.first_name, om.status, om.role
  INTO v_profile
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  WHERE p.id = p_guardian_profile_id
    AND om.organization_id = p_org_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Guardian not found in organization'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_profile.role != 'guardian' THEN
    RETURN QUERY SELECT FALSE, 'Profile is not a guardian'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  IF v_profile.email IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Guardian has no email address'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT;
    RETURN;
  END IF;

  -- Generate token
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  -- Create invitation with profile_id for claiming
  INSERT INTO organization_invitations (
    organization_id,
    email,
    role,
    token,
    invited_by,
    expires_at,
    profile_id  -- Links to existing profile for claiming
  ) VALUES (
    p_org_id,
    v_profile.email,
    'guardian',
    v_token,
    p_invited_by,
    NOW() + INTERVAL '7 days',
    p_guardian_profile_id
  )
  ON CONFLICT (organization_id, email) WHERE accepted_at IS NULL
  DO UPDATE SET
    token = v_token,
    expires_at = NOW() + INTERVAL '7 days',
    invited_by = p_invited_by,
    profile_id = p_guardian_profile_id
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT
    TRUE,
    format('Invitation created for %s', v_profile.first_name)::TEXT,
    v_invitation_id,
    v_token,
    v_profile.email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_guardian_to_claim(UUID, UUID, UUID) TO authenticated;

-- =============================================================================
-- 4. ACCEPT INVITATION WITH PROFILE CLAIMING
-- =============================================================================
-- Modified to handle profile claiming when invitation.profile_id is set

CREATE OR REPLACE FUNCTION public.accept_invitation_and_claim_profile(
  p_token TEXT,
  p_user_id UUID,
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  profile_id UUID,
  organization_id UUID,
  organization_slug TEXT,
  role TEXT,
  was_profile_claimed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_profile_id UUID;
  v_org RECORD;
  v_was_claimed BOOLEAN := FALSE;
BEGIN
  -- Find and validate invitation
  SELECT i.*, o.slug AS org_slug
  INTO v_invitation
  FROM organization_invitations i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token
    AND i.expires_at > NOW()
    AND i.accepted_at IS NULL;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Invalid or expired invitation'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;

  -- Case 1: Invitation has profile_id - claim existing profile
  IF v_invitation.profile_id IS NOT NULL THEN
    -- Link existing profile to this user
    UPDATE profiles
    SET user_id = p_user_id,
        updated_at = NOW()
    WHERE id = v_invitation.profile_id
      AND user_id IS NULL;  -- Only claim unclaimed profiles

    IF NOT FOUND THEN
      RETURN QUERY SELECT FALSE, 'Profile already claimed by another user'::TEXT, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE;
      RETURN;
    END IF;

    v_profile_id := v_invitation.profile_id;
    v_was_claimed := TRUE;

    -- Update membership status to active
    UPDATE organization_memberships
    SET status = 'active',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE profile_id = v_profile_id
      AND organization_id = v_invitation.organization_id;

  -- Case 2: No profile_id - create new profile (existing behavior)
  ELSE
    -- Check if user already has a profile
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE user_id = p_user_id;

    IF v_profile_id IS NULL THEN
      -- Create new profile
      INSERT INTO profiles (user_id, first_name, last_name, email, phone_number)
      VALUES (
        p_user_id,
        COALESCE(p_first_name, split_part(v_invitation.email, '@', 1)),
        COALESCE(p_last_name, ''),
        v_invitation.email,
        p_phone_number
      )
      RETURNING id INTO v_profile_id;
    END IF;

    -- Create organization membership
    INSERT INTO organization_memberships (profile_id, organization_id, role, status, accepted_at)
    VALUES (v_profile_id, v_invitation.organization_id, v_invitation.role, 'active', NOW())
    ON CONFLICT (profile_id, organization_id)
    DO UPDATE SET
      status = 'active',
      accepted_at = NOW(),
      updated_at = NOW();
  END IF;

  -- Mark invitation as accepted
  UPDATE organization_invitations
  SET accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN QUERY SELECT
    TRUE,
    CASE WHEN v_was_claimed THEN 'Profile claimed successfully' ELSE 'Profile created successfully' END::TEXT,
    v_profile_id,
    v_invitation.organization_id,
    v_invitation.org_slug,
    v_invitation.role,
    v_was_claimed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation_and_claim_profile(TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 5. GET PARENT CHILDREN
-- =============================================================================
-- Returns children linked to a parent profile

CREATE OR REPLACE FUNCTION public.get_parent_children(
  p_parent_profile_id UUID,
  p_org_id UUID
)
RETURNS TABLE (
  student_profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  email TEXT,
  grade TEXT,
  gender TEXT,
  high_school TEXT,
  campus_name TEXT,
  relationship TEXT,
  is_primary BOOLEAN,
  last_check_in TIMESTAMPTZ,
  total_check_ins BIGINT,
  total_points INTEGER,
  current_rank TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS student_profile_id,
    p.first_name,
    p.last_name,
    p.phone_number,
    p.email,
    sp.grade,
    sp.gender,
    sp.high_school,
    c.name AS campus_name,
    psl.relationship,
    psl.is_primary,
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
    COALESCE(sgs.current_rank, 'Newcomer') AS current_rank
  FROM parent_student_links psl
  JOIN profiles p ON p.id = psl.student_profile_id
  JOIN organization_memberships om ON om.profile_id = p.id AND om.organization_id = p_org_id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  LEFT JOIN campuses c ON c.id = om.campus_id
  LEFT JOIN student_game_stats sgs ON sgs.profile_id = p.id
  WHERE psl.parent_profile_id = p_parent_profile_id
    AND om.status = 'active'
  ORDER BY p.first_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_parent_children(UUID, UUID) TO authenticated;

-- =============================================================================
-- 6. LINK PARENT TO STUDENT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.link_parent_to_student(
  p_parent_profile_id UUID,
  p_student_profile_id UUID,
  p_relationship TEXT,
  p_is_primary BOOLEAN DEFAULT FALSE,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  link_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link_id UUID;
BEGIN
  -- Validate relationship
  IF p_relationship NOT IN ('father', 'mother', 'guardian', 'other') THEN
    RETURN QUERY SELECT FALSE, 'Invalid relationship type'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Create link
  INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_primary, created_by)
  VALUES (p_parent_profile_id, p_student_profile_id, p_relationship, p_is_primary, p_created_by)
  ON CONFLICT (parent_profile_id, student_profile_id)
  DO UPDATE SET
    relationship = p_relationship,
    is_primary = p_is_primary
  RETURNING id INTO v_link_id;

  RETURN QUERY SELECT TRUE, 'Parent linked to student'::TEXT, v_link_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_parent_to_student(UUID, UUID, TEXT, BOOLEAN, UUID) TO authenticated;

-- =============================================================================
-- 7. UNLINK PARENT FROM STUDENT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.unlink_parent_from_student(
  p_parent_profile_id UUID,
  p_student_profile_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM parent_student_links
  WHERE parent_profile_id = p_parent_profile_id
    AND student_profile_id = p_student_profile_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Link not found'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'Parent unlinked from student'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unlink_parent_from_student(UUID, UUID) TO authenticated;

-- =============================================================================
-- 8. UPDATE SEARCH_STUDENT_FOR_CHECKIN_BY_ORG TO INCLUDE LEADERS
-- =============================================================================
-- Leaders with group_membership can now check in like students

DROP FUNCTION IF EXISTS public.search_student_for_checkin_by_org(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.search_student_for_checkin_by_org(
  p_org_slug TEXT,
  p_search_term TEXT
)
RETURNS TABLE(
  profile_id UUID,
  student_id UUID,
  first_name TEXT,
  last_name TEXT,
  user_type TEXT,
  grade TEXT,
  high_school TEXT,
  was_restored BOOLEAN,
  can_checkin BOOLEAN  -- NEW: Indicates if this person is eligible to check-in
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_archived_profile_id UUID;
BEGIN
  -- Get organization ID
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = p_org_slug AND status = 'active';

  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  -- Check if there's an exact phone match on an archived student
  SELECT p.id INTO v_archived_profile_id
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  WHERE p.phone_number = p_search_term
    AND om.organization_id = v_org_id
    AND om.status = 'archived'
    AND om.role = 'student';

  -- Auto-restore archived student on exact phone match
  IF v_archived_profile_id IS NOT NULL THEN
    UPDATE organization_memberships
    SET status = 'active', updated_at = NOW()
    WHERE profile_id = v_archived_profile_id
      AND organization_id = v_org_id;

    -- Return the restored student
    RETURN QUERY
    SELECT
      p.id AS profile_id,
      p.id AS student_id,
      p.first_name,
      p.last_name,
      CASE WHEN om.role = 'student' THEN 'student' ELSE 'leader' END AS user_type,
      sp.grade,
      sp.high_school,
      TRUE AS was_restored,
      TRUE AS can_checkin
    FROM profiles p
    JOIN organization_memberships om ON om.profile_id = p.id AND om.organization_id = v_org_id
    LEFT JOIN student_profiles sp ON sp.profile_id = p.id
    WHERE p.id = v_archived_profile_id;

    RETURN;
  END IF;

  -- Search for students AND leaders (anyone eligible to check-in)
  -- Eligible = student role OR has group_membership
  RETURN QUERY
  SELECT
    p.id AS profile_id,
    p.id AS student_id,
    p.first_name,
    p.last_name,
    CASE
      WHEN om.role = 'student' THEN 'student'
      WHEN EXISTS (SELECT 1 FROM group_memberships gm WHERE gm.profile_id = p.id) THEN 'leader'
      ELSE om.role
    END AS user_type,
    sp.grade,
    sp.high_school,
    FALSE AS was_restored,
    TRUE AS can_checkin
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  WHERE om.organization_id = v_org_id
    AND om.status = 'active'
    -- Can check in if: student role OR has any group membership
    AND (
      om.role = 'student'
      OR EXISTS (
        SELECT 1 FROM group_memberships gm
        JOIN groups g ON g.id = gm.group_id
        WHERE gm.profile_id = p.id AND g.organization_id = v_org_id
      )
    )
    AND (
      p.phone_number = p_search_term OR
      LOWER(p.email) = LOWER(p_search_term) OR
      p.first_name ILIKE '%' || p_search_term || '%' OR
      p.last_name ILIKE '%' || p_search_term || '%' OR
      CONCAT(p.first_name, ' ', p.last_name) ILIKE '%' || p_search_term || '%'
    )
  LIMIT 5;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_student_for_checkin_by_org(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.search_student_for_checkin_by_org(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 9. UPDATE REGISTER_PROFILE_AND_CHECKIN TO CREATE GUARDIAN PROFILES
-- =============================================================================
-- Now also triggers guardian profile creation after registration

DROP FUNCTION IF EXISTS public.register_profile_and_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT);

CREATE OR REPLACE FUNCTION public.register_profile_and_checkin(
  p_org_slug TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone_number TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_grade TEXT DEFAULT NULL,
  p_high_school TEXT DEFAULT NULL,
  p_instagram_handle TEXT DEFAULT NULL,
  p_parent_name TEXT DEFAULT NULL,
  p_parent_phone TEXT DEFAULT NULL,
  p_mother_first_name TEXT DEFAULT NULL,
  p_mother_last_name TEXT DEFAULT NULL,
  p_mother_phone TEXT DEFAULT NULL,
  p_mother_email TEXT DEFAULT NULL,  -- NEW
  p_father_first_name TEXT DEFAULT NULL,
  p_father_last_name TEXT DEFAULT NULL,
  p_father_phone TEXT DEFAULT NULL,
  p_father_email TEXT DEFAULT NULL,  -- NEW
  p_device_id UUID DEFAULT NULL,
  p_gender TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  profile_id UUID,
  student_id UUID,
  first_name TEXT,
  user_type TEXT,
  check_in_id UUID,
  profile_pin TEXT,
  points_earned INTEGER,
  assigned_group_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_profile_id UUID;
  v_existing_profile_id UUID;
  v_check_in_id UUID;
  v_profile_pin TEXT;
  v_points INTEGER := 10;
  v_assigned_group_id UUID;
  v_assigned_group_name TEXT;
BEGIN
  -- Get organization ID from slug
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = p_org_slug AND status = 'active';

  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Organization not found'::TEXT,
      NULL::UUID, NULL::UUID, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0, NULL::TEXT;
    RETURN;
  END IF;

  -- Input validation
  IF p_first_name IS NULL OR TRIM(p_first_name) = '' THEN
    RETURN QUERY SELECT
      FALSE,
      'First name is required'::TEXT,
      NULL::UUID, NULL::UUID, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0, NULL::TEXT;
    RETURN;
  END IF;

  IF p_last_name IS NULL OR TRIM(p_last_name) = '' THEN
    RETURN QUERY SELECT
      FALSE,
      'Last name is required'::TEXT,
      NULL::UUID, NULL::UUID, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0, NULL::TEXT;
    RETURN;
  END IF;

  -- Validate gender if provided
  IF p_gender IS NOT NULL AND p_gender NOT IN ('male', 'female') THEN
    RETURN QUERY SELECT
      FALSE,
      'Gender must be male or female'::TEXT,
      NULL::UUID, NULL::UUID, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0, NULL::TEXT;
    RETURN;
  END IF;

  -- Check if profile already exists by phone or email
  SELECT p.id INTO v_existing_profile_id
  FROM profiles p
  WHERE (p_phone_number IS NOT NULL AND p.phone_number = p_phone_number)
     OR (p_email IS NOT NULL AND LOWER(p.email) = LOWER(p_email))
  LIMIT 1;

  IF v_existing_profile_id IS NOT NULL THEN
    -- Profile exists - check if already a member of this org
    IF EXISTS (
      SELECT 1 FROM organization_memberships
      WHERE profile_id = v_existing_profile_id AND organization_id = v_org_id
    ) THEN
      RETURN QUERY SELECT
        FALSE,
        'This person is already registered in this organization'::TEXT,
        v_existing_profile_id, v_existing_profile_id, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0, NULL::TEXT;
      RETURN;
    END IF;

    v_profile_id := v_existing_profile_id;
  ELSE
    -- Generate profile PIN
    v_profile_pin := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

    -- Create new profile
    INSERT INTO profiles (first_name, last_name, phone_number, email, date_of_birth)
    VALUES (TRIM(p_first_name), TRIM(p_last_name), p_phone_number, p_email, p_date_of_birth)
    RETURNING id INTO v_profile_id;

    -- Create student_profile extension with gender and parent emails
    INSERT INTO student_profiles (
      profile_id,
      grade,
      high_school,
      instagram_handle,
      profile_pin,
      parent_name,
      parent_phone,
      mother_first_name,
      mother_last_name,
      mother_phone,
      mother_email,  -- NEW
      father_first_name,
      father_last_name,
      father_phone,
      father_email,  -- NEW
      gender
    ) VALUES (
      v_profile_id,
      p_grade,
      p_high_school,
      p_instagram_handle,
      v_profile_pin,
      p_parent_name,
      p_parent_phone,
      p_mother_first_name,
      p_mother_last_name,
      p_mother_phone,
      p_mother_email,
      p_father_first_name,
      p_father_last_name,
      p_father_phone,
      p_father_email,
      p_gender
    );
  END IF;

  -- Create organization membership with needs_triage = TRUE
  INSERT INTO organization_memberships (profile_id, organization_id, role, status, needs_triage)
  VALUES (v_profile_id, v_org_id, 'student', 'active', TRUE)
  ON CONFLICT (profile_id, organization_id) DO UPDATE SET
    status = 'active',
    needs_triage = TRUE;

  -- =================================================================
  -- AUTO-CREATE GUARDIAN PROFILES
  -- =================================================================
  PERFORM create_guardian_profiles_from_student(v_profile_id, v_org_id, NULL, NULL);

  -- =================================================================
  -- AUTO-ASSIGN TO DEFAULT GROUP
  -- =================================================================
  SELECT g.id, g.name INTO v_assigned_group_id, v_assigned_group_name
  FROM groups g
  WHERE g.organization_id = v_org_id
    AND g.is_default = TRUE
    AND g.is_active = TRUE
    AND (g.default_gender IS NULL OR g.default_gender = p_gender)
    AND (g.default_grades IS NULL OR p_grade = ANY(g.default_grades))
  ORDER BY
    CASE WHEN g.default_grades IS NOT NULL THEN 0 ELSE 1 END,
    COALESCE(array_length(g.default_grades, 1), 999) ASC,
    CASE WHEN g.default_gender IS NOT NULL THEN 0 ELSE 1 END
  LIMIT 1;

  -- Create group membership if a default group was found
  IF v_assigned_group_id IS NOT NULL THEN
    INSERT INTO group_memberships (profile_id, group_id, role)
    VALUES (v_profile_id, v_assigned_group_id, 'member')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create check-in record
  INSERT INTO check_ins (profile_id, student_id, organization_id, device_id, checked_in_at)
  VALUES (v_profile_id, v_profile_id, v_org_id, p_device_id, NOW())
  RETURNING id INTO v_check_in_id;

  -- Initialize or update game stats
  INSERT INTO student_game_stats (student_id, profile_id, total_points, last_points_update)
  VALUES (v_profile_id, v_profile_id, v_points, NOW())
  ON CONFLICT (student_id) DO UPDATE SET
    profile_id = COALESCE(student_game_stats.profile_id, v_profile_id),
    total_points = student_game_stats.total_points + v_points,
    last_points_update = NOW();

  -- Get profile pin if existing profile
  IF v_profile_pin IS NULL THEN
    SELECT sp.profile_pin INTO v_profile_pin
    FROM student_profiles sp
    WHERE sp.profile_id = v_profile_id;
  END IF;

  -- Return success
  RETURN QUERY SELECT
    TRUE,
    'Registration and check-in successful'::TEXT,
    v_profile_id,
    v_profile_id,
    p_first_name,
    'student'::TEXT,
    v_check_in_id,
    v_profile_pin,
    v_points,
    v_assigned_group_name;
END;
$$;

-- Grant execute (note the new parameter order with emails)
GRANT EXECUTE ON FUNCTION public.register_profile_and_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.register_profile_and_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- =============================================================================
-- 10. GET ORGANIZATION GUARDIANS (Convenience function)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_organization_guardians(p_org_id UUID)
RETURNS TABLE (
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  status TEXT,
  is_claimed BOOLEAN,
  linked_children_count BIGINT,
  campus_id UUID,
  campus_name TEXT,
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
    om.status,
    (p.user_id IS NOT NULL) AS is_claimed,
    (SELECT COUNT(*) FROM parent_student_links psl WHERE psl.parent_profile_id = p.id) AS linked_children_count,
    om.campus_id,
    c.name AS campus_name,
    om.created_at
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN campuses c ON c.id = om.campus_id
  WHERE om.organization_id = p_org_id
    AND om.role = 'guardian'
  ORDER BY p.first_name, p.last_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_guardians(UUID) TO authenticated;

-- =============================================================================
-- 11. GET STUDENT PARENTS
-- =============================================================================
-- Get parents/guardians linked to a specific student

CREATE OR REPLACE FUNCTION public.get_student_parents(
  p_student_profile_id UUID,
  p_org_id UUID
)
RETURNS TABLE (
  parent_profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  relationship TEXT,
  is_primary BOOLEAN,
  is_claimed BOOLEAN,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS parent_profile_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone_number,
    psl.relationship,
    psl.is_primary,
    (p.user_id IS NOT NULL) AS is_claimed,
    om.status
  FROM parent_student_links psl
  JOIN profiles p ON p.id = psl.parent_profile_id
  JOIN organization_memberships om ON om.profile_id = p.id AND om.organization_id = p_org_id
  WHERE psl.student_profile_id = p_student_profile_id
  ORDER BY psl.is_primary DESC, psl.relationship;
$$;

GRANT EXECUTE ON FUNCTION public.get_student_parents(UUID, UUID) TO authenticated;
