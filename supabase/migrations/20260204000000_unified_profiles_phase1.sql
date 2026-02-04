-- =============================================================================
-- UNIFIED USER PROFILES - PHASE 1: CREATE NEW TABLES
-- =============================================================================
-- This migration creates the new unified profile system WITHOUT breaking
-- existing functionality. Old tables remain intact during the transition.
--
-- Tables created:
--   1. profiles - Core identity table (one per human)
--   2. organization_memberships - Role-based org access
--   3. group_memberships - Group participation (leaders + members)
--   4. student_profiles - Student-specific extension data
-- =============================================================================

-- =============================================================================
-- 1. PROFILES TABLE
-- =============================================================================
-- Core identity table - one record per human in the system.
-- Can be linked to auth.users when they have an account.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,              -- Unique across platform for auth
  phone_number TEXT UNIQUE,       -- Unique across platform (E.164 format)
  date_of_birth DATE,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,  -- When they have auth account
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_name ON public.profiles(first_name, last_name);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.profiles IS 'Core identity table - one record per human in the system';
COMMENT ON COLUMN public.profiles.user_id IS 'Links to auth.users when person has an authenticated account';
COMMENT ON COLUMN public.profiles.phone_number IS 'E.164 format (e.g., +15551234567)';

-- =============================================================================
-- 2. ORGANIZATION_MEMBERSHIPS TABLE
-- =============================================================================
-- Defines what role a profile has in each organization.
-- Replaces organization_members (but uses profile_id instead of user_id).
-- Roles: owner, admin, leader, viewer, student

CREATE TABLE IF NOT EXISTS public.organization_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'leader', 'viewer', 'student')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
  display_name TEXT,             -- Optional display name for SMS signatures
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,

  -- Each profile can only have one membership per org
  UNIQUE(profile_id, organization_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_org_memberships_profile_id ON public.organization_memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_organization_id ON public.organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_role ON public.organization_memberships(role);
CREATE INDEX IF NOT EXISTS idx_org_memberships_status ON public.organization_memberships(status);

-- Trigger for updated_at
CREATE TRIGGER update_organization_memberships_updated_at
  BEFORE UPDATE ON public.organization_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.organization_memberships IS 'Defines role-based access to organizations';
COMMENT ON COLUMN public.organization_memberships.role IS 'owner, admin, leader, viewer, or student';
COMMENT ON COLUMN public.organization_memberships.display_name IS 'Display name shown in SMS signatures (e.g., "Pastor Mike")';

-- =============================================================================
-- 3. GROUP_MEMBERSHIPS TABLE
-- =============================================================================
-- Defines participation in groups - both leaders and members.
-- Replaces both group_members AND group_leaders tables.

CREATE TABLE IF NOT EXISTS public.group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('leader', 'member')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,  -- For primary leader designation
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID REFERENCES auth.users(id),

  -- Each profile can only have one membership per group
  UNIQUE(profile_id, group_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_group_memberships_profile_id ON public.group_memberships(profile_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_role ON public.group_memberships(role);

COMMENT ON TABLE public.group_memberships IS 'Defines participation in groups (leaders and members)';
COMMENT ON COLUMN public.group_memberships.role IS 'leader or member';
COMMENT ON COLUMN public.group_memberships.is_primary IS 'True if this is the primary leader for the group';

-- =============================================================================
-- 4. STUDENT_PROFILES TABLE
-- =============================================================================
-- Optional extension table for student-specific data.
-- Not everyone has this - only those with role='student' need it.

CREATE TABLE IF NOT EXISTS public.student_profiles (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  grade TEXT,
  high_school TEXT,
  instagram_handle TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  profile_pin TEXT,              -- For kiosk access

  -- Parent/guardian info
  father_first_name TEXT,
  father_last_name TEXT,
  father_phone TEXT,
  father_email TEXT,
  mother_first_name TEXT,
  mother_last_name TEXT,
  mother_phone TEXT,
  mother_email TEXT,
  parent_name TEXT,              -- Legacy fallback single field
  parent_phone TEXT,             -- Legacy fallback single field

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for common lookups
CREATE INDEX IF NOT EXISTS idx_student_profiles_grade ON public.student_profiles(grade);
CREATE INDEX IF NOT EXISTS idx_student_profiles_high_school ON public.student_profiles(high_school);

-- Trigger for updated_at
CREATE TRIGGER update_student_profiles_updated_at
  BEFORE UPDATE ON public.student_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.student_profiles IS 'Student-specific extension data (grade, school, parents)';
COMMENT ON COLUMN public.student_profiles.profile_pin IS 'PIN for kiosk check-in access';

-- =============================================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 6. HELPER FUNCTIONS (SECURITY DEFINER - bypass RLS)
-- =============================================================================
-- These functions help with RLS policies by avoiding infinite recursion.

-- Get org IDs where a user has access (via their profile)
CREATE OR REPLACE FUNCTION auth_profile_org_ids(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(om.organization_id), '{}')
  FROM organization_memberships om
  JOIN profiles p ON p.id = om.profile_id
  WHERE p.user_id = p_user_id
    AND om.status = 'active';
$$;

-- Get profile ID for a user
CREATE OR REPLACE FUNCTION auth_get_profile_id(p_user_id UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM profiles WHERE user_id = p_user_id LIMIT 1;
$$;

-- Check if user has specific role in an org (via profile)
CREATE OR REPLACE FUNCTION auth_profile_has_org_role(p_org_id UUID, p_roles TEXT[], p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_memberships om
    JOIN profiles p ON p.id = om.profile_id
    WHERE om.organization_id = p_org_id
      AND p.user_id = p_user_id
      AND om.role = ANY(p_roles)
      AND om.status = 'active'
  );
$$;

-- =============================================================================
-- 7. RLS POLICIES FOR PROFILES
-- =============================================================================

-- SELECT: Users can view profiles in orgs they belong to, or their own
CREATE POLICY profiles_select ON public.profiles FOR SELECT USING (
  auth_is_super_admin()
  OR user_id = auth.uid()  -- Can always see own profile
  OR id IN (
    SELECT om.profile_id
    FROM organization_memberships om
    WHERE om.organization_id = ANY(auth_profile_org_ids())
      AND om.status = 'active'
  )
);

-- INSERT: Authenticated users can create profiles (needed for invite flow)
CREATE POLICY profiles_insert ON public.profiles FOR INSERT WITH CHECK (
  auth_is_super_admin()
  OR auth.uid() IS NOT NULL
);

-- UPDATE: Users can update their own profile
CREATE POLICY profiles_update ON public.profiles FOR UPDATE USING (
  auth_is_super_admin()
  OR user_id = auth.uid()
);

-- DELETE: Super admins only
CREATE POLICY profiles_delete ON public.profiles FOR DELETE USING (
  auth_is_super_admin()
);

-- =============================================================================
-- 8. RLS POLICIES FOR ORGANIZATION_MEMBERSHIPS
-- =============================================================================

-- SELECT: Users can see memberships in orgs they belong to
CREATE POLICY org_memberships_select ON public.organization_memberships FOR SELECT USING (
  auth_is_super_admin()
  OR organization_id = ANY(auth_profile_org_ids())
);

-- INSERT: Super admins or org owners/admins can add members
CREATE POLICY org_memberships_insert ON public.organization_memberships FOR INSERT WITH CHECK (
  auth_is_super_admin()
  OR auth_profile_has_org_role(organization_id, ARRAY['owner', 'admin'])
);

-- UPDATE: Super admins or org owners/admins can modify
CREATE POLICY org_memberships_update ON public.organization_memberships FOR UPDATE USING (
  auth_is_super_admin()
  OR auth_profile_has_org_role(organization_id, ARRAY['owner', 'admin'])
);

-- DELETE: Super admins or org owners can remove
CREATE POLICY org_memberships_delete ON public.organization_memberships FOR DELETE USING (
  auth_is_super_admin()
  OR auth_profile_has_org_role(organization_id, ARRAY['owner'])
);

-- =============================================================================
-- 9. RLS POLICIES FOR GROUP_MEMBERSHIPS
-- =============================================================================

-- SELECT: Users can see group memberships in their orgs
CREATE POLICY group_memberships_select ON public.group_memberships FOR SELECT USING (
  auth_is_super_admin()
  OR group_id IN (
    SELECT g.id FROM groups g
    WHERE g.organization_id = ANY(auth_profile_org_ids())
  )
);

-- INSERT: Org admins/owners or group leaders can add members
CREATE POLICY group_memberships_insert ON public.group_memberships FOR INSERT WITH CHECK (
  auth_is_super_admin()
  OR EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_id
      AND auth_profile_has_org_role(g.organization_id, ARRAY['owner', 'admin', 'leader'])
  )
);

-- UPDATE: Org admins/owners or group leaders can modify
CREATE POLICY group_memberships_update ON public.group_memberships FOR UPDATE USING (
  auth_is_super_admin()
  OR EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_id
      AND auth_profile_has_org_role(g.organization_id, ARRAY['owner', 'admin', 'leader'])
  )
);

-- DELETE: Org admins/owners or group leaders can remove
CREATE POLICY group_memberships_delete ON public.group_memberships FOR DELETE USING (
  auth_is_super_admin()
  OR EXISTS (
    SELECT 1 FROM groups g
    WHERE g.id = group_id
      AND auth_profile_has_org_role(g.organization_id, ARRAY['owner', 'admin', 'leader'])
  )
);

-- =============================================================================
-- 10. RLS POLICIES FOR STUDENT_PROFILES
-- =============================================================================

-- SELECT: Same as profiles - if you can see the profile, you can see student data
CREATE POLICY student_profiles_select ON public.student_profiles FOR SELECT USING (
  auth_is_super_admin()
  OR profile_id = auth_get_profile_id()  -- Own profile
  OR profile_id IN (
    SELECT om.profile_id
    FROM organization_memberships om
    WHERE om.organization_id = ANY(auth_profile_org_ids())
      AND om.status = 'active'
  )
);

-- INSERT: Authenticated users or SECURITY DEFINER functions
CREATE POLICY student_profiles_insert ON public.student_profiles FOR INSERT WITH CHECK (
  auth_is_super_admin()
  OR auth.uid() IS NOT NULL
);

-- UPDATE: Own profile or org admins
CREATE POLICY student_profiles_update ON public.student_profiles FOR UPDATE USING (
  auth_is_super_admin()
  OR profile_id = auth_get_profile_id()
  OR profile_id IN (
    SELECT om.profile_id
    FROM organization_memberships om
    WHERE om.organization_id = ANY(auth_profile_org_ids())
      AND auth_profile_has_org_role(om.organization_id, ARRAY['owner', 'admin'])
  )
);

-- DELETE: Super admins only
CREATE POLICY student_profiles_delete ON public.student_profiles FOR DELETE USING (
  auth_is_super_admin()
);

-- =============================================================================
-- 11. GRANT PERMISSIONS
-- =============================================================================

-- Grant usage to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.student_profiles TO authenticated;

-- Grant to anon for public check-in functionality
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.organization_memberships TO anon;
GRANT SELECT ON public.student_profiles TO anon;

-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION auth_profile_org_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth_profile_org_ids(UUID) TO anon;
GRANT EXECUTE ON FUNCTION auth_get_profile_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth_get_profile_id(UUID) TO anon;
GRANT EXECUTE ON FUNCTION auth_profile_has_org_role(UUID, TEXT[], UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION auth_profile_has_org_role(UUID, TEXT[], UUID) TO anon;
