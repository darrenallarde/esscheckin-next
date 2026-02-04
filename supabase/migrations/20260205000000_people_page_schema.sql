-- People Page Redesign Schema Changes
-- This migration adds:
-- 1. 'guardian' role to organization_memberships
-- 2. campus_id to organization_memberships for campus scoping
-- 3. parent_student_links table for family relationships
-- 4. profile_id to organization_invitations for profile claiming
-- Note: groups.campus_id already exists

-- ============================================================================
-- 1. Add 'guardian' role to organization_memberships
-- ============================================================================

-- Drop existing constraint and add new one with 'guardian'
ALTER TABLE public.organization_memberships
  DROP CONSTRAINT IF EXISTS organization_memberships_role_check;

ALTER TABLE public.organization_memberships
  ADD CONSTRAINT organization_memberships_role_check
  CHECK (role IN ('owner', 'admin', 'leader', 'viewer', 'student', 'guardian'));

COMMENT ON COLUMN public.organization_memberships.role IS 'User role: owner, admin, leader, viewer, student, or guardian';

-- ============================================================================
-- 2. Add campus_id to organization_memberships for campus scoping
-- ============================================================================

ALTER TABLE public.organization_memberships
  ADD COLUMN IF NOT EXISTS campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organization_memberships.campus_id IS 'When set, member is scoped to this campus only. NULL means access to all campuses.';

-- Index for campus scoping queries
CREATE INDEX IF NOT EXISTS idx_organization_memberships_campus
  ON public.organization_memberships(campus_id)
  WHERE campus_id IS NOT NULL;

-- ============================================================================
-- 3. Create parent_student_links table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.parent_student_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('father', 'mother', 'guardian', 'other')),
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Ensure unique parent-student pairs
  UNIQUE (parent_profile_id, student_profile_id)
);

-- Comments
COMMENT ON TABLE public.parent_student_links IS 'Links parent/guardian profiles to student profiles';
COMMENT ON COLUMN public.parent_student_links.parent_profile_id IS 'Profile ID of the parent/guardian';
COMMENT ON COLUMN public.parent_student_links.student_profile_id IS 'Profile ID of the student (child)';
COMMENT ON COLUMN public.parent_student_links.relationship IS 'Relationship type: father, mother, guardian, or other';
COMMENT ON COLUMN public.parent_student_links.is_primary IS 'Whether this is the primary contact for this student';

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_parent_links_parent
  ON public.parent_student_links(parent_profile_id);

CREATE INDEX IF NOT EXISTS idx_parent_links_student
  ON public.parent_student_links(student_profile_id);

-- ============================================================================
-- 4. Add profile_id to organization_invitations for profile claiming
-- ============================================================================

ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.organization_invitations.profile_id IS 'When set, invitation is for claiming an existing profile (guardian claiming). When NULL, creates new profile on accept.';

-- ============================================================================
-- 5. Enable RLS on parent_student_links
-- ============================================================================

ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. RLS Policies for parent_student_links
-- ============================================================================

-- Helper function to check if user has role in org that contains these profiles
CREATE OR REPLACE FUNCTION auth_can_manage_parent_links(
  p_parent_profile_id UUID,
  p_student_profile_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- User can manage links if they're an owner/admin in any org where the student is a member
  SELECT EXISTS (
    SELECT 1
    FROM organization_memberships om_user
    JOIN organization_memberships om_student ON om_student.organization_id = om_user.organization_id
    JOIN profiles p ON p.user_id = p_user_id AND p.id = om_user.profile_id
    WHERE om_student.profile_id = p_student_profile_id
    AND om_user.role IN ('owner', 'admin')
  )
$$;

-- Parents can view their own links
CREATE POLICY "parent_view_own_links" ON public.parent_student_links
  FOR SELECT
  USING (
    parent_profile_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  );

-- Users can view links for students in their org (if admin/owner)
CREATE POLICY "admin_view_org_links" ON public.parent_student_links
  FOR SELECT
  USING (
    auth_can_manage_parent_links(parent_profile_id, student_profile_id, auth.uid())
  );

-- Admins can insert links for students in their org
CREATE POLICY "admin_insert_links" ON public.parent_student_links
  FOR INSERT
  WITH CHECK (
    auth_can_manage_parent_links(parent_profile_id, student_profile_id, auth.uid())
  );

-- Admins can update links for students in their org
CREATE POLICY "admin_update_links" ON public.parent_student_links
  FOR UPDATE
  USING (
    auth_can_manage_parent_links(parent_profile_id, student_profile_id, auth.uid())
  );

-- Admins can delete links for students in their org
CREATE POLICY "admin_delete_links" ON public.parent_student_links
  FOR DELETE
  USING (
    auth_can_manage_parent_links(parent_profile_id, student_profile_id, auth.uid())
  );

-- Service role can do everything (for RPC functions)
CREATE POLICY "service_role_all" ON public.parent_student_links
  FOR ALL
  USING (auth.role() = 'service_role');
