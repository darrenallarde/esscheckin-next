-- Fix update_org_short_code function to properly check permissions and handle duplicates
-- Previous version was calling auth_has_org_role with wrong argument types

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
  IF p_short_code IS NULL OR p_short_code = '' THEN
    UPDATE organizations SET short_code = NULL WHERE id = p_org_id;
    RETURN json_build_object('success', true);
  END IF;

  -- Check if short code is already taken by another org
  SELECT id INTO v_existing_org_id
  FROM organizations
  WHERE LOWER(short_code) = LOWER(p_short_code)
    AND id != p_org_id;

  IF v_existing_org_id IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'This code is already taken by another organization');
  END IF;

  -- Update the short code
  UPDATE organizations
  SET short_code = UPPER(p_short_code)
  WHERE id = p_org_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_org_short_code(UUID, TEXT) TO authenticated;
