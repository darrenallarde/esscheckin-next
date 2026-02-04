-- Super Admin Update Organization
-- Allows super admins to update any organization's details

CREATE OR REPLACE FUNCTION public.super_admin_update_organization(
  p_org_id UUID,
  p_name TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_owner_email TEXT DEFAULT NULL,
  p_timezone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_existing_slug TEXT;
BEGIN
  -- Verify caller is super admin
  IF NOT auth_is_super_admin(v_user_id) THEN
    RETURN QUERY SELECT FALSE, 'Not authorized: Must be super admin'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check org exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN QUERY SELECT FALSE, 'Organization not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- If slug is being changed, validate it
  IF p_slug IS NOT NULL THEN
    -- Check slug format (lowercase alphanumeric and hyphens)
    IF p_slug !~ '^[a-z0-9-]+$' THEN
      RETURN QUERY SELECT FALSE, 'Invalid slug format: Use lowercase letters, numbers, and hyphens only'::TEXT, NULL::UUID;
      RETURN;
    END IF;

    -- Check slug uniqueness
    SELECT slug INTO v_existing_slug
    FROM organizations
    WHERE slug = p_slug AND id != p_org_id;

    IF v_existing_slug IS NOT NULL THEN
      RETURN QUERY SELECT FALSE, 'Slug already in use by another organization'::TEXT, NULL::UUID;
      RETURN;
    END IF;
  END IF;

  -- Validate status if provided
  IF p_status IS NOT NULL AND p_status NOT IN ('active', 'trial', 'suspended') THEN
    RETURN QUERY SELECT FALSE, 'Invalid status: Must be active, trial, or suspended'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Update the organization (only non-null values)
  UPDATE organizations
  SET
    name = COALESCE(p_name, name),
    slug = COALESCE(p_slug, slug),
    owner_email = COALESCE(p_owner_email, owner_email),
    timezone = COALESCE(p_timezone, timezone),
    status = COALESCE(p_status, status),
    updated_at = NOW()
  WHERE id = p_org_id;

  RETURN QUERY SELECT TRUE, 'Organization updated successfully'::TEXT, p_org_id;
END;
$$;

-- Grant execute permission to authenticated users (function validates super admin internally)
GRANT EXECUTE ON FUNCTION public.super_admin_update_organization(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.super_admin_update_organization IS
'Allows super admins to update any organization details including name, slug, owner_email, timezone, and status.
Only non-null parameters are updated.';
