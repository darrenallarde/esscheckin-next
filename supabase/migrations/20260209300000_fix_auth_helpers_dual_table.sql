-- ROOT FIX: auth helper functions now check BOTH organization_members (legacy)
-- AND organization_memberships (new) for org membership.
-- These two functions are called by ~30+ RLS policies and ~10+ RPCs,
-- so fixing them here cascades permissions to the entire app.

CREATE OR REPLACE FUNCTION auth_user_org_ids(p_user_id uuid DEFAULT auth.uid())
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = p_user_id
  UNION
  SELECT om.organization_id FROM organization_memberships om
  JOIN profiles p ON p.id = om.profile_id
  WHERE p.user_id = p_user_id AND om.status = 'active';
$$;

CREATE OR REPLACE FUNCTION auth_has_org_role(p_org_id uuid, p_roles text[], p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND user_id = p_user_id AND role::TEXT = ANY(p_roles)
  ) OR EXISTS (
    SELECT 1 FROM organization_memberships om
    JOIN profiles p ON p.id = om.profile_id
    WHERE om.organization_id = p_org_id AND p.user_id = p_user_id
    AND om.role = ANY(p_roles) AND om.status = 'active'
  );
$$;
