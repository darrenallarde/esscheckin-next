-- =============================================================================
-- FIX get_user_organizations COLUMN NAMES AND MISSING COLUMNS
-- =============================================================================
-- The frontend expects:
--   - user_role (not role)
--   - display_name
--   - theme_id
--   - checkin_style
--   - short_code
--   - org_number
--
-- The previous migration returned 'role' instead of 'user_role' and was missing
-- the organization settings columns that the frontend needs.
-- =============================================================================

DROP FUNCTION IF EXISTS public.get_user_organizations(UUID);

CREATE FUNCTION public.get_user_organizations(p_user_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  user_role TEXT,
  display_name TEXT,
  theme_id TEXT,
  checkin_style TEXT,
  short_code TEXT,
  org_number INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- First, try to get orgs via the new profiles system
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    om.role::TEXT AS user_role,
    o.display_name::TEXT,
    o.theme_id::TEXT,
    o.checkin_style::TEXT,
    o.short_code::TEXT,
    o.org_number::INTEGER
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  JOIN organizations o ON o.id = om.organization_id
  WHERE p.user_id = p_user_id
    AND om.status = 'active'
    AND o.status = 'active'
    AND om.role IN ('owner', 'admin', 'leader', 'viewer')  -- Only team roles, not students/guardians

  UNION

  -- Fallback: Also check legacy organization_members table for backward compatibility
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    o.slug AS organization_slug,
    m.role::TEXT AS user_role,
    o.display_name::TEXT,
    o.theme_id::TEXT,
    o.checkin_style::TEXT,
    o.short_code::TEXT,
    o.org_number::INTEGER
  FROM organization_members m
  JOIN organizations o ON o.id = m.organization_id
  WHERE m.user_id = p_user_id
    AND m.status = 'active'
    AND o.status = 'active'

  ORDER BY organization_name;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_organizations(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_user_organizations IS
'Returns organizations the user has team access to (owner/admin/leader/viewer).
Queries both the new profiles + organization_memberships system and the legacy
organization_members table for backward compatibility.
Returns all organization settings needed by the frontend.';
