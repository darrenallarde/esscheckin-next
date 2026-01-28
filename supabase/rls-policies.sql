-- =============================================================================
-- RLS POLICY REFERENCE
-- =============================================================================
-- This file documents the canonical RLS policies for the application.
--
-- KEY ARCHITECTURE DECISION:
-- All RLS policies use SECURITY DEFINER helper functions that bypass RLS.
-- This prevents infinite recursion when policies need to check permissions.
--
-- HELPER FUNCTIONS (defined below):
-- - auth_is_super_admin() - Check if current user is super admin
-- - auth_user_org_ids() - Get organization IDs user belongs to
-- - auth_has_org_role(org_id, roles[]) - Check if user has specific role in org
--
-- These functions have SECURITY DEFINER which means they run with the
-- permissions of the function owner (postgres), bypassing RLS on the
-- tables they query.
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER - bypass RLS)
-- =============================================================================

-- Check if user is a super admin
CREATE OR REPLACE FUNCTION auth_is_super_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_user_id AND role = 'super_admin'
  );
$$;

-- Get user's organization memberships
CREATE OR REPLACE FUNCTION auth_user_org_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM organization_members WHERE user_id = p_user_id;
$$;

-- Check if user has specific role in an org
CREATE OR REPLACE FUNCTION auth_has_org_role(p_org_id UUID, p_roles TEXT[], p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
    AND user_id = p_user_id
    AND role::TEXT = ANY(p_roles)
  );
$$;

-- =============================================================================
-- ORGANIZATIONS TABLE
-- =============================================================================
-- SELECT: Super admins see all, users see orgs they belong to
-- INSERT: Super admins or authenticated users (for org creation flow)
-- UPDATE: Super admins or org owners/admins
-- DELETE: Super admins only

CREATE POLICY "organizations_select" ON organizations FOR SELECT USING (
  auth_is_super_admin() OR id IN (SELECT auth_user_org_ids())
);

CREATE POLICY "organizations_insert" ON organizations FOR INSERT WITH CHECK (
  auth_is_super_admin() OR auth.uid() IS NOT NULL
);

CREATE POLICY "organizations_update" ON organizations FOR UPDATE USING (
  auth_is_super_admin() OR auth_has_org_role(id, ARRAY['owner', 'admin'])
);

CREATE POLICY "organizations_delete" ON organizations FOR DELETE USING (
  auth_is_super_admin()
);

-- =============================================================================
-- ORGANIZATION_MEMBERS TABLE
-- =============================================================================
-- SELECT: Super admins see all, users see members of orgs they belong to
-- INSERT: Super admins or org owners/admins
-- UPDATE: Super admins or org owners/admins
-- DELETE: Super admins or org owners

CREATE POLICY "org_members_select" ON organization_members FOR SELECT USING (
  auth_is_super_admin() OR organization_id IN (SELECT auth_user_org_ids())
);

CREATE POLICY "org_members_insert" ON organization_members FOR INSERT WITH CHECK (
  auth_is_super_admin() OR auth_has_org_role(organization_id, ARRAY['owner', 'admin'])
);

CREATE POLICY "org_members_update" ON organization_members FOR UPDATE USING (
  auth_is_super_admin() OR auth_has_org_role(organization_id, ARRAY['owner', 'admin'])
);

CREATE POLICY "org_members_delete" ON organization_members FOR DELETE USING (
  auth_is_super_admin() OR auth_has_org_role(organization_id, ARRAY['owner'])
);

-- =============================================================================
-- USER_ROLES TABLE
-- =============================================================================
-- SELECT: Super admins see all, users see their own roles
-- INSERT: Super admins only
-- DELETE: Super admins only

CREATE POLICY "user_roles_select" ON user_roles FOR SELECT USING (
  auth_is_super_admin() OR user_id = auth.uid()
);

CREATE POLICY "user_roles_insert" ON user_roles FOR INSERT WITH CHECK (
  auth_is_super_admin()
);

CREATE POLICY "user_roles_delete" ON user_roles FOR DELETE USING (
  auth_is_super_admin()
);

-- =============================================================================
-- STUDENTS TABLE
-- =============================================================================
-- SELECT: Super admins see all, users see students in their orgs
-- INSERT: Super admins or org members
-- UPDATE: Super admins or org members
-- DELETE: Super admins or org owners/admins

CREATE POLICY "students_select" ON students FOR SELECT USING (
  auth_is_super_admin() OR organization_id IN (SELECT auth_user_org_ids())
);

CREATE POLICY "students_insert" ON students FOR INSERT WITH CHECK (
  auth_is_super_admin() OR organization_id IN (SELECT auth_user_org_ids())
);

CREATE POLICY "students_update" ON students FOR UPDATE USING (
  auth_is_super_admin() OR organization_id IN (SELECT auth_user_org_ids())
);

CREATE POLICY "students_delete" ON students FOR DELETE USING (
  auth_is_super_admin() OR auth_has_org_role(organization_id, ARRAY['owner', 'admin'])
);

-- =============================================================================
-- CHECK_INS TABLE
-- =============================================================================
-- SELECT: Super admins see all, users see check-ins in their orgs
-- INSERT: Super admins, org members, or public (for kiosk check-in)
-- UPDATE: Super admins or org members
-- DELETE: Super admins or org owners/admins

CREATE POLICY "check_ins_select" ON check_ins FOR SELECT USING (
  auth_is_super_admin() OR organization_id IN (SELECT auth_user_org_ids())
);

CREATE POLICY "check_ins_insert" ON check_ins FOR INSERT WITH CHECK (
  auth_is_super_admin()
  OR organization_id IN (SELECT auth_user_org_ids())
  OR organization_id IS NULL  -- Allow public check-in
);

CREATE POLICY "check_ins_update" ON check_ins FOR UPDATE USING (
  auth_is_super_admin() OR organization_id IN (SELECT auth_user_org_ids())
);

CREATE POLICY "check_ins_delete" ON check_ins FOR DELETE USING (
  auth_is_super_admin() OR auth_has_org_role(organization_id, ARRAY['owner', 'admin'])
);

-- =============================================================================
-- ADMIN RPC FUNCTIONS (SECURITY DEFINER)
-- =============================================================================
-- These functions bypass RLS and do their own permission checks

-- Get all organizations (super admin only)
CREATE OR REPLACE FUNCTION get_all_organizations()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  owner_email TEXT,
  timezone TEXT,
  status TEXT,
  parent_organization_id UUID,
  member_count BIGINT,
  student_count BIGINT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT auth_is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Super admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    o.slug,
    o.owner_email,
    o.timezone,
    o.status,
    o.parent_organization_id,
    (SELECT COUNT(*) FROM organization_members om WHERE om.organization_id = o.id) AS member_count,
    (SELECT COUNT(*) FROM students s WHERE s.organization_id = o.id) AS student_count,
    o.created_at
  FROM organizations o
  ORDER BY o.created_at DESC;
END;
$$;
