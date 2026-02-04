-- =============================================================================
-- UNIFIED USER PROFILES - PHASE 4: RPC FUNCTION UPDATES
-- =============================================================================
-- This migration updates RPC functions to use the new profile system.
-- Functions are updated to query profiles + student_profiles while maintaining
-- backward compatibility with existing code.
--
-- Functions updated:
--   - search_student_for_checkin_v2: Query profiles + student_profiles
--   - search_student_for_checkin_by_org: Org-scoped version
--   - register_profile_and_checkin: New profile-based registration
--   - checkin_student_public: Updated to use profile_id
--   - get_sms_conversations: Updated to use profiles
-- =============================================================================

-- =============================================================================
-- 1. SEARCH FOR CHECK-IN (ORG-SCOPED VERSION)
-- =============================================================================
-- This version searches within a specific organization

CREATE OR REPLACE FUNCTION public.search_student_for_checkin_by_org(
  p_org_slug TEXT,
  p_search_term TEXT
)
RETURNS TABLE(
  profile_id UUID,
  student_id UUID,  -- For backward compatibility (same as profile_id)
  first_name TEXT,
  last_name TEXT,
  user_type TEXT,
  grade TEXT,
  high_school TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS profile_id,
    p.id AS student_id,  -- Backward compat
    p.first_name,
    p.last_name,
    CASE WHEN om.role = 'student' THEN 'student' ELSE 'student_leader' END AS user_type,
    sp.grade,
    sp.high_school
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  JOIN organizations o ON o.id = om.organization_id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  WHERE o.slug = p_org_slug
    AND om.status = 'active'
    AND om.role = 'student'
    AND (
      p.phone_number = p_search_term OR
      LOWER(p.email) = LOWER(p_search_term) OR
      p.first_name ILIKE '%' || p_search_term || '%' OR
      p.last_name ILIKE '%' || p_search_term || '%' OR
      CONCAT(p.first_name, ' ', p.last_name) ILIKE '%' || p_search_term || '%'
    )
  LIMIT 5;
$$;

-- Grant execute to anon for public check-in
GRANT EXECUTE ON FUNCTION public.search_student_for_checkin_by_org(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.search_student_for_checkin_by_org(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 2. REGISTER PROFILE AND CHECK-IN
-- =============================================================================
-- Creates a profile + student_profile + organization_membership + check_in

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
  p_father_first_name TEXT DEFAULT NULL,
  p_father_last_name TEXT DEFAULT NULL,
  p_father_phone TEXT DEFAULT NULL,
  p_device_id UUID DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  profile_id UUID,
  student_id UUID,  -- Backward compat (same as profile_id)
  first_name TEXT,
  user_type TEXT,
  check_in_id UUID,
  profile_pin TEXT,
  points_earned INTEGER
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
BEGIN
  -- Get organization ID from slug
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = p_org_slug AND status = 'active';

  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Organization not found'::TEXT,
      NULL::UUID, NULL::UUID, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0;
    RETURN;
  END IF;

  -- Input validation
  IF p_first_name IS NULL OR TRIM(p_first_name) = '' THEN
    RETURN QUERY SELECT
      FALSE,
      'First name is required'::TEXT,
      NULL::UUID, NULL::UUID, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0;
    RETURN;
  END IF;

  IF p_last_name IS NULL OR TRIM(p_last_name) = '' THEN
    RETURN QUERY SELECT
      FALSE,
      'Last name is required'::TEXT,
      NULL::UUID, NULL::UUID, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0;
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
        v_existing_profile_id, v_existing_profile_id, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0;
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

    -- Create student_profile extension
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
      father_first_name,
      father_last_name,
      father_phone
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
      p_father_first_name,
      p_father_last_name,
      p_father_phone
    );
  END IF;

  -- Create organization membership
  INSERT INTO organization_memberships (profile_id, organization_id, role, status)
  VALUES (v_profile_id, v_org_id, 'student', 'active')
  ON CONFLICT (profile_id, organization_id) DO NOTHING;

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
    v_profile_id,  -- student_id for backward compat
    p_first_name,
    'student'::TEXT,
    v_check_in_id,
    v_profile_pin,
    v_points;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.register_profile_and_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.register_profile_and_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- =============================================================================
-- 3. UPDATE CHECKIN_STUDENT_PUBLIC TO USE PROFILE_ID
-- =============================================================================
-- Now checks both profile_id and student_id for backward compatibility

CREATE OR REPLACE FUNCTION public.checkin_profile_public(
  p_org_slug TEXT,
  p_profile_id UUID,
  p_device_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  first_name TEXT,
  user_type TEXT,
  check_in_id UUID,
  profile_pin TEXT,
  points_earned INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_profile_record RECORD;
  v_existing_checkin_id UUID;
  v_new_checkin_id UUID;
  v_points INTEGER := 0;
BEGIN
  -- Get organization ID from slug
  SELECT id INTO v_org_id
  FROM organizations
  WHERE slug = p_org_slug AND status = 'active';

  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT
      FALSE, 'Organization not found'::TEXT,
      ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0;
    RETURN;
  END IF;

  -- Get profile info and verify they belong to this org
  SELECT
    p.id,
    p.first_name,
    CASE WHEN om.role = 'student' THEN 'student' ELSE 'student_leader' END AS user_type,
    sp.profile_pin
  INTO v_profile_record
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id AND om.organization_id = v_org_id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  WHERE p.id = p_profile_id AND om.status = 'active';

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE, 'Profile not found in this organization'::TEXT,
      ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT, 0;
    RETURN;
  END IF;

  -- Check if already checked in today
  SELECT ci.id INTO v_existing_checkin_id
  FROM check_ins ci
  WHERE (ci.profile_id = p_profile_id OR ci.student_id = p_profile_id)
    AND ci.organization_id = v_org_id
    AND date_trunc('day', ci.checked_in_at) = date_trunc('day', NOW());

  IF v_existing_checkin_id IS NOT NULL THEN
    RETURN QUERY SELECT
      TRUE, 'Already checked in today'::TEXT,
      v_profile_record.first_name,
      v_profile_record.user_type,
      v_existing_checkin_id,
      v_profile_record.profile_pin,
      0;
    RETURN;
  END IF;

  -- Create new check-in
  INSERT INTO check_ins (profile_id, student_id, organization_id, device_id, checked_in_at)
  VALUES (p_profile_id, p_profile_id, v_org_id, p_device_id, NOW())
  RETURNING id INTO v_new_checkin_id;

  -- Award points
  v_points := 10;

  -- Update game stats
  UPDATE student_game_stats
  SET
    profile_id = COALESCE(profile_id, p_profile_id),
    total_points = total_points + v_points,
    last_points_update = NOW()
  WHERE student_id = p_profile_id OR profile_id = p_profile_id;

  IF NOT FOUND THEN
    INSERT INTO student_game_stats (student_id, profile_id, total_points, last_points_update)
    VALUES (p_profile_id, p_profile_id, v_points, NOW())
    ON CONFLICT (student_id) DO UPDATE SET
      profile_id = COALESCE(student_game_stats.profile_id, p_profile_id),
      total_points = student_game_stats.total_points + v_points,
      last_points_update = NOW();
  END IF;

  RETURN QUERY SELECT
    TRUE, 'Check-in successful'::TEXT,
    v_profile_record.first_name,
    v_profile_record.user_type,
    v_new_checkin_id,
    v_profile_record.profile_pin,
    v_points;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.checkin_profile_public(TEXT, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.checkin_profile_public(TEXT, UUID, UUID) TO authenticated;

-- =============================================================================
-- 4. UPDATE GET_SMS_CONVERSATIONS TO USE PROFILES
-- =============================================================================

CREATE OR REPLACE FUNCTION get_sms_conversations_v2(p_org_id UUID)
RETURNS TABLE (
  phone_number TEXT,
  profile_id UUID,
  student_id UUID,  -- Backward compat
  student_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT,
  unread_count BIGINT,
  total_message_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    SELECT
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END AS conv_phone,
      COALESCE(m.profile_id, m.student_id) AS conv_profile_id,
      MAX(m.created_at) AS max_created_at,
      COUNT(*) FILTER (WHERE m.direction = 'inbound' AND m.read_at IS NULL) AS conv_unread_count,
      COUNT(*) AS conv_total_count
    FROM sms_messages m
    WHERE m.organization_id = p_org_id
    GROUP BY
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END,
      COALESCE(m.profile_id, m.student_id)
  ),
  latest_messages AS (
    SELECT DISTINCT ON (
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END,
      COALESCE(m.profile_id, m.student_id)
    )
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END AS conv_phone,
      COALESCE(m.profile_id, m.student_id) AS conv_profile_id,
      m.body AS latest_body,
      m.direction AS latest_direction
    FROM sms_messages m
    WHERE m.organization_id = p_org_id
    ORDER BY
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END,
      COALESCE(m.profile_id, m.student_id),
      m.created_at DESC
  )
  SELECT
    cs.conv_phone AS phone_number,
    cs.conv_profile_id AS profile_id,
    cs.conv_profile_id AS student_id,  -- Backward compat
    COALESCE(p.first_name || ' ' || COALESCE(p.last_name, ''), s.first_name || ' ' || COALESCE(s.last_name, ''), NULL) AS student_name,
    lm.latest_body AS last_message,
    cs.max_created_at AS last_message_at,
    lm.latest_direction AS last_message_direction,
    cs.conv_unread_count AS unread_count,
    cs.conv_total_count AS total_message_count
  FROM conversation_stats cs
  JOIN latest_messages lm
    ON cs.conv_phone = lm.conv_phone
    AND (cs.conv_profile_id = lm.conv_profile_id OR (cs.conv_profile_id IS NULL AND lm.conv_profile_id IS NULL))
  LEFT JOIN profiles p ON cs.conv_profile_id = p.id
  LEFT JOIN students s ON cs.conv_profile_id = s.id AND p.id IS NULL  -- Fallback to students table
  ORDER BY cs.max_created_at DESC;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_sms_conversations_v2(UUID) TO authenticated;

-- =============================================================================
-- 5. HELPER: GET PROFILE BY PHONE FOR SMS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_profile_by_phone(p_phone_number TEXT, p_org_id UUID)
RETURNS TABLE (
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  email TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.phone_number,
    p.email
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  WHERE p.phone_number = p_phone_number
    AND om.organization_id = p_org_id
    AND om.status = 'active'
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_by_phone(TEXT, UUID) TO authenticated;

-- =============================================================================
-- 6. HELPER: GET PROFILE WITH STUDENT DATA
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_profile_with_student_data(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  user_id UUID,
  grade TEXT,
  high_school TEXT,
  instagram_handle TEXT,
  profile_pin TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  father_first_name TEXT,
  father_last_name TEXT,
  father_phone TEXT,
  father_email TEXT,
  mother_first_name TEXT,
  mother_last_name TEXT,
  mother_phone TEXT,
  mother_email TEXT,
  parent_name TEXT,
  parent_phone TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone_number,
    p.date_of_birth,
    p.user_id,
    sp.grade,
    sp.high_school,
    sp.instagram_handle,
    sp.profile_pin,
    sp.address,
    sp.city,
    sp.state,
    sp.zip,
    sp.father_first_name,
    sp.father_last_name,
    sp.father_phone,
    sp.father_email,
    sp.mother_first_name,
    sp.mother_last_name,
    sp.mother_phone,
    sp.mother_email,
    sp.parent_name,
    sp.parent_phone
  FROM profiles p
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  WHERE p.id = p_profile_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_with_student_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_with_student_data(UUID) TO anon;

-- =============================================================================
-- 7. HELPER: GET ORGANIZATION MEMBERS VIA PROFILES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_organization_members_v2(p_org_id UUID)
RETURNS TABLE (
  member_id UUID,
  profile_id UUID,
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT,
  status TEXT,
  display_name TEXT,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    om.id AS member_id,
    om.profile_id,
    p.user_id,
    p.email,
    p.first_name,
    p.last_name,
    om.role,
    om.status,
    om.display_name,
    om.invited_at,
    om.accepted_at
  FROM organization_memberships om
  JOIN profiles p ON p.id = om.profile_id
  WHERE om.organization_id = p_org_id
    AND om.role != 'student'  -- Don't include students in team member list
  ORDER BY
    CASE om.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'leader' THEN 3
      WHEN 'viewer' THEN 4
    END,
    p.first_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_members_v2(UUID) TO authenticated;

-- =============================================================================
-- 8. STUDENTS LIST FOR ORG (PROFILE-BASED)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_organization_students(p_org_id UUID)
RETURNS TABLE (
  profile_id UUID,
  student_id UUID,  -- Backward compat
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  grade TEXT,
  high_school TEXT,
  user_type TEXT,
  total_points INTEGER,
  current_rank TEXT,
  last_check_in TIMESTAMPTZ,
  total_check_ins BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS profile_id,
    p.id AS student_id,
    p.first_name,
    p.last_name,
    p.email,
    p.phone_number,
    sp.grade,
    sp.high_school,
    'student'::TEXT AS user_type,
    COALESCE(sgs.total_points, 0)::INTEGER AS total_points,
    COALESCE(sgs.current_rank, 'Newcomer') AS current_rank,
    (
      SELECT MAX(ci.checked_in_at)
      FROM check_ins ci
      WHERE ci.profile_id = p.id OR ci.student_id = p.id
    ) AS last_check_in,
    (
      SELECT COUNT(*)
      FROM check_ins ci
      WHERE ci.profile_id = p.id OR ci.student_id = p.id
    ) AS total_check_ins
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  LEFT JOIN student_game_stats sgs ON sgs.profile_id = p.id OR sgs.student_id = p.id
  WHERE om.organization_id = p_org_id
    AND om.role = 'student'
    AND om.status = 'active'
  ORDER BY p.first_name, p.last_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_students(UUID) TO authenticated;
