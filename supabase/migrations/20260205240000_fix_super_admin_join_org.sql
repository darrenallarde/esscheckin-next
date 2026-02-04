-- Fix ambiguous column reference in super_admin_join_organization
-- Drop and recreate with renamed return column

DROP FUNCTION IF EXISTS public.super_admin_join_organization(UUID, TEXT);

CREATE FUNCTION public.super_admin_join_organization(
  p_org_id UUID,
  p_role TEXT DEFAULT 'admin'
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  result_profile_id UUID,
  organization_slug TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile_id UUID;
  v_org_slug TEXT;
  v_user_email TEXT;
  v_user_first_name TEXT;
  v_user_last_name TEXT;
BEGIN
  -- Verify caller is super admin
  IF NOT auth_is_super_admin(v_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Not authorized: Must be super admin'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Validate role (only allow team roles, not student/guardian)
  IF p_role NOT IN ('owner', 'admin', 'leader', 'viewer') THEN
    RETURN QUERY SELECT FALSE, 'Invalid role: Must be owner, admin, leader, or viewer'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Get org slug
  SELECT o.slug INTO v_org_slug FROM organizations o WHERE o.id = p_org_id;
  IF v_org_slug IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Organization not found'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Get or create profile for this user
  SELECT p.id INTO v_profile_id FROM profiles p WHERE p.user_id = v_user_id;

  IF v_profile_id IS NULL THEN
    -- Get user info from auth.users
    SELECT
      u.email,
      COALESCE(u.raw_user_meta_data->>'first_name', split_part(u.email, '@', 1)),
      COALESCE(u.raw_user_meta_data->>'last_name', '')
    INTO v_user_email, v_user_first_name, v_user_last_name
    FROM auth.users u
    WHERE u.id = v_user_id;

    IF v_user_email IS NULL THEN
      RETURN QUERY SELECT FALSE, 'User not found in auth system'::TEXT, NULL::UUID, NULL::TEXT;
      RETURN;
    END IF;

    -- Create profile from auth.users
    INSERT INTO profiles (user_id, email, first_name, last_name)
    VALUES (v_user_id, v_user_email, v_user_first_name, v_user_last_name)
    RETURNING profiles.id INTO v_profile_id;
  END IF;

  -- Create or update organization membership
  INSERT INTO organization_memberships AS om (profile_id, organization_id, role, status)
  VALUES (v_profile_id, p_org_id, p_role, 'active')
  ON CONFLICT (profile_id, organization_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active',
    updated_at = NOW();

  RETURN QUERY SELECT TRUE, format('Joined as %s', p_role)::TEXT, v_profile_id, v_org_slug;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.super_admin_join_organization(UUID, TEXT) TO authenticated;
