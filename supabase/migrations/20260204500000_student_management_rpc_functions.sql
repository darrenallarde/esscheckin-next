-- =============================================================================
-- STUDENT MANAGEMENT FEATURES - RPC FUNCTION UPDATES
-- =============================================================================
-- This migration updates/creates RPC functions for:
--   1. register_profile_and_checkin - Updated with gender + auto-assign + triage
--   2. archive_student - Soft delete a student
--   3. restore_student - Restore an archived student
--   4. delete_student_permanently - Hard delete for GDPR
--   5. mark_student_triaged - Clear the needs_triage flag
--   6. remove_checkin - Delete check-in and recalculate gamification
--   7. get_new_students - Get students needing triage
--   8. search_student_for_checkin_by_org - Updated to restore archived students
-- =============================================================================

-- =============================================================================
-- 1. UPDATED REGISTER PROFILE AND CHECK-IN
-- =============================================================================
-- Now includes:
--   - Gender parameter stored in student_profiles
--   - Auto-assignment to default group based on grade + gender
--   - Sets needs_triage = TRUE for new registrations

-- Drop existing function to change return type (adding assigned_group_name)
DROP FUNCTION IF EXISTS public.register_profile_and_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID);

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
  p_device_id UUID DEFAULT NULL,
  p_gender TEXT DEFAULT NULL  -- NEW: 'male' or 'female'
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
  assigned_group_name TEXT  -- NEW: Name of auto-assigned group (if any)
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

    -- Create student_profile extension with gender
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
      father_phone,
      gender  -- NEW
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
      p_father_phone,
      p_gender  -- NEW
    );
  END IF;

  -- Create organization membership with needs_triage = TRUE
  INSERT INTO organization_memberships (profile_id, organization_id, role, status, needs_triage)
  VALUES (v_profile_id, v_org_id, 'student', 'active', TRUE)
  ON CONFLICT (profile_id, organization_id) DO UPDATE SET
    status = 'active',
    needs_triage = TRUE;

  -- =================================================================
  -- AUTO-ASSIGN TO DEFAULT GROUP
  -- =================================================================
  -- Pick the most specific matching default group (fewest grades)
  SELECT g.id, g.name INTO v_assigned_group_id, v_assigned_group_name
  FROM groups g
  WHERE g.organization_id = v_org_id
    AND g.is_default = TRUE
    AND g.is_active = TRUE
    AND (g.default_gender IS NULL OR g.default_gender = p_gender)
    AND (g.default_grades IS NULL OR p_grade = ANY(g.default_grades))
  ORDER BY
    -- Most specific first: groups with grade filter before groups without
    CASE WHEN g.default_grades IS NOT NULL THEN 0 ELSE 1 END,
    -- Then by fewest grades (most specific)
    COALESCE(array_length(g.default_grades, 1), 999) ASC,
    -- Then by gender filter (groups with gender filter before without)
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

-- Grant execute
GRANT EXECUTE ON FUNCTION public.register_profile_and_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.register_profile_and_checkin(TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- =============================================================================
-- 2. ARCHIVE STUDENT (SOFT DELETE)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.archive_student(
  p_profile_id UUID,
  p_org_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the membership exists and is not already archived
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE profile_id = p_profile_id
      AND organization_id = p_org_id
      AND status != 'archived'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Student not found or already archived'::TEXT;
    RETURN;
  END IF;

  -- Archive the membership
  UPDATE organization_memberships
  SET status = 'archived', updated_at = NOW()
  WHERE profile_id = p_profile_id AND organization_id = p_org_id;

  RETURN QUERY SELECT TRUE, 'Student archived successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_student(UUID, UUID) TO authenticated;

-- =============================================================================
-- 3. RESTORE STUDENT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.restore_student(
  p_profile_id UUID,
  p_org_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the membership exists and is archived
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE profile_id = p_profile_id
      AND organization_id = p_org_id
      AND status = 'archived'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Student not found or not archived'::TEXT;
    RETURN;
  END IF;

  -- Restore the membership
  UPDATE organization_memberships
  SET status = 'active', updated_at = NOW()
  WHERE profile_id = p_profile_id AND organization_id = p_org_id;

  RETURN QUERY SELECT TRUE, 'Student restored successfully'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_student(UUID, UUID) TO authenticated;

-- =============================================================================
-- 4. DELETE STUDENT PERMANENTLY (GDPR)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.delete_student_permanently(
  p_profile_id UUID,
  p_org_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check_in_count INTEGER;
BEGIN
  -- Verify the membership exists
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships
    WHERE profile_id = p_profile_id AND organization_id = p_org_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'Student not found in this organization'::TEXT;
    RETURN;
  END IF;

  -- Count check-ins for audit log
  SELECT COUNT(*) INTO v_check_in_count
  FROM check_ins
  WHERE profile_id = p_profile_id OR student_id = p_profile_id;

  -- Delete related data in order (respecting FK constraints)
  -- 1. Game transactions
  DELETE FROM game_transactions WHERE profile_id = p_profile_id OR student_id = p_profile_id;

  -- 2. Student achievements
  DELETE FROM student_achievements WHERE profile_id = p_profile_id OR student_id = p_profile_id;

  -- 3. Student game stats
  DELETE FROM student_game_stats WHERE profile_id = p_profile_id OR student_id = p_profile_id;

  -- 4. Check-ins
  DELETE FROM check_ins WHERE profile_id = p_profile_id OR student_id = p_profile_id;

  -- 5. SMS messages
  DELETE FROM sms_messages WHERE profile_id = p_profile_id OR student_id = p_profile_id;

  -- 6. AI recommendations
  DELETE FROM ai_recommendations WHERE profile_id = p_profile_id OR student_id = p_profile_id;

  -- 7. Interactions
  DELETE FROM interactions WHERE profile_id = p_profile_id OR student_id = p_profile_id;

  -- 8. Group memberships
  DELETE FROM group_memberships WHERE profile_id = p_profile_id;

  -- 9. Organization membership
  DELETE FROM organization_memberships WHERE profile_id = p_profile_id AND organization_id = p_org_id;

  -- 10. Student profile extension
  DELETE FROM student_profiles WHERE profile_id = p_profile_id;

  -- 11. Check if profile has any other org memberships before deleting
  IF NOT EXISTS (
    SELECT 1 FROM organization_memberships WHERE profile_id = p_profile_id
  ) THEN
    -- No other memberships, safe to delete profile
    DELETE FROM profiles WHERE id = p_profile_id;
  END IF;

  RETURN QUERY SELECT TRUE, format('Student permanently deleted. %s check-ins removed.', v_check_in_count)::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_student_permanently(UUID, UUID) TO authenticated;

-- =============================================================================
-- 5. MARK STUDENT TRIAGED
-- =============================================================================

CREATE OR REPLACE FUNCTION public.mark_student_triaged(
  p_profile_id UUID,
  p_org_id UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organization_memberships
  SET needs_triage = FALSE, updated_at = NOW()
  WHERE profile_id = p_profile_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Student not found'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'Student marked as triaged'::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_student_triaged(UUID, UUID) TO authenticated;

-- =============================================================================
-- 6. GET NEW STUDENTS (NEEDS TRIAGE)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_new_students(p_org_id UUID)
RETURNS TABLE (
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  email TEXT,
  grade TEXT,
  gender TEXT,
  high_school TEXT,
  created_at TIMESTAMPTZ,
  group_names TEXT[]
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.phone_number,
    p.email,
    sp.grade,
    sp.gender,
    sp.high_school,
    om.created_at,
    COALESCE(
      (SELECT array_agg(g.name ORDER BY g.name)
       FROM group_memberships gm
       JOIN groups g ON g.id = gm.group_id
       WHERE gm.profile_id = p.id),
      ARRAY[]::TEXT[]
    ) AS group_names
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  WHERE om.organization_id = p_org_id
    AND om.role = 'student'
    AND om.status = 'active'
    AND om.needs_triage = TRUE
  ORDER BY om.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_new_students(UUID) TO authenticated;

-- =============================================================================
-- 7. REMOVE CHECK-IN (WITH GAMIFICATION ROLLBACK)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.remove_checkin(p_checkin_id UUID)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  points_removed INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_student_id UUID;
  v_points_to_remove INTEGER := 0;
  v_org_id UUID;
BEGIN
  -- Get the check-in details
  SELECT profile_id, student_id, organization_id
  INTO v_profile_id, v_student_id, v_org_id
  FROM check_ins WHERE id = p_checkin_id;

  IF v_profile_id IS NULL AND v_student_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Check-in not found'::TEXT, 0;
    RETURN;
  END IF;

  -- Use profile_id if available, otherwise student_id
  v_profile_id := COALESCE(v_profile_id, v_student_id);

  -- Get points earned from this check-in
  SELECT COALESCE(SUM(points_earned), 0) INTO v_points_to_remove
  FROM game_transactions WHERE check_in_id = p_checkin_id;

  -- Delete game transactions for this check-in
  DELETE FROM game_transactions WHERE check_in_id = p_checkin_id;

  -- Delete achievements that reference this check-in (if any have check_in_id)
  -- Note: Most achievements don't track check_in_id, so this may delete nothing
  -- We'll leave streak-based achievements as they'll be recalculated naturally

  -- Update total points
  UPDATE student_game_stats
  SET total_points = GREATEST(0, total_points - v_points_to_remove),
      updated_at = NOW()
  WHERE profile_id = v_profile_id OR student_id = v_profile_id;

  -- Delete the check-in
  DELETE FROM check_ins WHERE id = p_checkin_id;

  RETURN QUERY SELECT
    TRUE,
    format('Check-in removed. %s points deducted.', v_points_to_remove)::TEXT,
    v_points_to_remove;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_checkin(UUID) TO authenticated;

-- =============================================================================
-- 8. UPDATE SEARCH TO AUTO-RESTORE ARCHIVED STUDENTS
-- =============================================================================
-- When an archived student tries to check in, restore them automatically

-- Drop existing function to change return type
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
  was_restored BOOLEAN  -- NEW: Indicates if student was auto-restored
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
      CASE WHEN om.role = 'student' THEN 'student' ELSE 'student_leader' END AS user_type,
      sp.grade,
      sp.high_school,
      TRUE AS was_restored  -- Indicate restoration
    FROM profiles p
    JOIN organization_memberships om ON om.profile_id = p.id AND om.organization_id = v_org_id
    LEFT JOIN student_profiles sp ON sp.profile_id = p.id
    WHERE p.id = v_archived_profile_id;

    RETURN;
  END IF;

  -- Normal search (active students only)
  RETURN QUERY
  SELECT
    p.id AS profile_id,
    p.id AS student_id,
    p.first_name,
    p.last_name,
    CASE WHEN om.role = 'student' THEN 'student' ELSE 'student_leader' END AS user_type,
    sp.grade,
    sp.high_school,
    FALSE AS was_restored
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  WHERE om.organization_id = v_org_id
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_student_for_checkin_by_org(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.search_student_for_checkin_by_org(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- 9. UPDATE GET_ORGANIZATION_STUDENTS TO EXCLUDE ARCHIVED
-- =============================================================================

-- Drop existing function to change return type (adding gender, status, needs_triage)
DROP FUNCTION IF EXISTS public.get_organization_students(UUID);

CREATE OR REPLACE FUNCTION public.get_organization_students(p_org_id UUID)
RETURNS TABLE (
  profile_id UUID,
  student_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone_number TEXT,
  grade TEXT,
  gender TEXT,  -- NEW
  high_school TEXT,
  user_type TEXT,
  total_points INTEGER,
  current_rank TEXT,
  last_check_in TIMESTAMPTZ,
  total_check_ins BIGINT,
  status TEXT,  -- NEW: for showing archived status
  needs_triage BOOLEAN  -- NEW
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
    sp.gender,
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
    ) AS total_check_ins,
    om.status,
    om.needs_triage
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  LEFT JOIN student_profiles sp ON sp.profile_id = p.id
  LEFT JOIN student_game_stats sgs ON sgs.profile_id = p.id OR sgs.student_id = p.id
  WHERE om.organization_id = p_org_id
    AND om.role = 'student'
    AND om.status = 'active'  -- Exclude archived by default
  ORDER BY p.first_name, p.last_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_organization_students(UUID) TO authenticated;
