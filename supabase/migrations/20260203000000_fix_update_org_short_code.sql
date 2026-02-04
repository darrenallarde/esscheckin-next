-- Fix update_org_short_code function
--
-- Issues fixed:
-- 1. Was calling auth_has_org_role with wrong argument types
-- 2. Was uppercasing code, but constraint requires lowercase: ^[a-z0-9]{2,10}$
-- 3. Now validates format BEFORE attempting update
-- 4. Returns user-friendly error messages

DROP FUNCTION IF EXISTS update_org_short_code(UUID, TEXT);

CREATE FUNCTION update_org_short_code(
  p_org_id UUID,
  p_short_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
  v_existing_org_id UUID;
  v_clean_code TEXT;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if user is member of this org (owner or admin)
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = v_user_id
      AND role IN ('owner', 'admin')
  ) INTO v_is_member;

  -- Also check for super admin
  IF NOT v_is_member THEN
    SELECT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_user_id
        AND role = 'super_admin'
    ) INTO v_is_member;
  END IF;

  IF NOT v_is_member THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- If clearing the short code, just do it
  IF p_short_code IS NULL OR TRIM(p_short_code) = '' THEN
    UPDATE organizations SET short_code = NULL WHERE id = p_org_id;
    RETURN json_build_object('success', true);
  END IF;

  -- Clean and LOWERCASE the code (constraint requires lowercase)
  v_clean_code := LOWER(TRIM(p_short_code));

  -- Validate format: 2-10 lowercase alphanumeric characters
  IF LENGTH(v_clean_code) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Code must be at least 2 characters');
  END IF;

  IF LENGTH(v_clean_code) > 10 THEN
    RETURN json_build_object('success', false, 'error', 'Code must be 10 characters or less');
  END IF;

  IF v_clean_code !~ '^[a-z0-9]+$' THEN
    RETURN json_build_object('success', false, 'error', 'Code can only contain lowercase letters and numbers');
  END IF;

  -- Check if short code is already taken by another org
  SELECT id INTO v_existing_org_id
  FROM organizations
  WHERE LOWER(short_code) = v_clean_code
    AND id != p_org_id;

  IF v_existing_org_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'This code is already taken by another organization');
  END IF;

  -- Update the short code (stored as lowercase)
  UPDATE organizations
  SET short_code = v_clean_code
  WHERE id = p_org_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'This code is already taken');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Unable to save. Please try a different code.');
END;
$$;

GRANT EXECUTE ON FUNCTION update_org_short_code(UUID, TEXT) TO authenticated;
