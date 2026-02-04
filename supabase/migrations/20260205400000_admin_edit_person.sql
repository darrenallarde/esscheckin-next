-- Migration: Admin Edit Person RPC
-- Allows org admins to edit any person's profile information

-- Function to update a person's profile (admin only)
CREATE OR REPLACE FUNCTION update_person_profile(
  p_org_id UUID,
  p_profile_id UUID,
  -- Profile fields
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  -- Student profile fields
  p_grade TEXT DEFAULT NULL,
  p_high_school TEXT DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_zip TEXT DEFAULT NULL
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
      updated_at = NOW()
    WHERE profile_id = p_profile_id;
  END IF;

  RETURN QUERY SELECT TRUE, 'Profile updated successfully'::TEXT;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_person_profile TO authenticated;

COMMENT ON FUNCTION update_person_profile IS 'Allows org admins to update any person''s profile information in their organization';
