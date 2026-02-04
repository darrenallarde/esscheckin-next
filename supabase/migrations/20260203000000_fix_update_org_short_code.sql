-- Update org code function
--
-- Behavior: Setting the "code" updates BOTH short_code AND slug
-- This gives orgs a single identity for:
-- - SMS code (text "ESS" to connect)
-- - Full URL path (/ess)
-- - Short URL path (/c/ess)
--
-- Validation:
-- - 2-10 lowercase alphanumeric characters
-- - Must be unique across all orgs (checks both short_code and slug)
-- - Returns clear error messages

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
  v_existing_org_name TEXT;
  v_clean_code TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check permissions
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = v_user_id
      AND role IN ('owner', 'admin')
  ) INTO v_is_member;

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

  -- If clearing, only clear short_code (keep slug for URL continuity)
  IF p_short_code IS NULL OR TRIM(p_short_code) = '' THEN
    UPDATE organizations SET short_code = NULL WHERE id = p_org_id;
    RETURN json_build_object('success', true);
  END IF;

  -- Clean and lowercase
  v_clean_code := LOWER(TRIM(p_short_code));

  -- Validate format: 2-10 lowercase alphanumeric
  IF LENGTH(v_clean_code) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Code must be at least 2 characters');
  END IF;

  IF LENGTH(v_clean_code) > 10 THEN
    RETURN json_build_object('success', false, 'error', 'Code must be 10 characters or less');
  END IF;

  IF v_clean_code !~ '^[a-z0-9]+$' THEN
    RETURN json_build_object('success', false, 'error', 'Code can only contain lowercase letters and numbers');
  END IF;

  -- Check if short_code is taken by another org
  SELECT id, name INTO v_existing_org_id, v_existing_org_name
  FROM organizations
  WHERE LOWER(short_code) = v_clean_code
    AND id != p_org_id;

  IF v_existing_org_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', format('This code is already used by "%s"', v_existing_org_name)
    );
  END IF;

  -- Also check if slug is taken by another org
  SELECT id, name INTO v_existing_org_id, v_existing_org_name
  FROM organizations
  WHERE LOWER(slug) = v_clean_code
    AND id != p_org_id;

  IF v_existing_org_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', format('This URL is already used by "%s"', v_existing_org_name)
    );
  END IF;

  -- Update BOTH short_code AND slug
  UPDATE organizations
  SET short_code = v_clean_code,
      slug = v_clean_code
  WHERE id = p_org_id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object('success', false, 'error', 'This code/URL is already taken');
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Unable to save: ' || SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION update_org_short_code(UUID, TEXT) TO authenticated;
