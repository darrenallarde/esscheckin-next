-- Fix Orphan Students Being Incorrectly Listed as Siblings
--
-- Problem: Students without parent contact info are showing as siblings under a phantom
-- guardian named "unknown unknown" because empty phone strings matched during deduplication.
--
-- Solution:
-- 1. Add validation helper functions for phone/email
-- 2. Clean up phantom guardian profiles and their links
-- 3. Create missing get_student_siblings RPC with proper guards
-- 4. Create missing get_organization_parents RPC with proper guards

-- ============================================================================
-- STEP 1: Validation Helper Functions
-- ============================================================================

-- Helper to check if phone is valid (not empty, not all zeros, has reasonable length)
CREATE OR REPLACE FUNCTION public.is_valid_phone(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_phone IS NOT NULL
     AND TRIM(p_phone) != ''
     AND p_phone !~ '^0+$'
     AND LENGTH(REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g')) >= 7;
$$;

-- Helper to check if email is valid (basic format check)
CREATE OR REPLACE FUNCTION public.is_valid_email(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_email IS NOT NULL
     AND TRIM(p_email) != ''
     AND p_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
     AND LOWER(p_email) NOT IN ('unknown@unknown.com', 'na@na.com', 'n/a@n/a.com', 'none@none.com');
$$;

-- ============================================================================
-- STEP 2: Clean Up Phantom Guardians
-- ============================================================================

-- Delete parent_student_links for phantom guardians first (FK constraint)
DELETE FROM parent_student_links
WHERE parent_profile_id IN (
  SELECT p.id
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  WHERE om.role = 'guardian'
    AND p.user_id IS NULL  -- Not claimed by any user
    AND NOT is_valid_phone(p.phone_number)
    AND NOT is_valid_email(p.email)
    -- Only delete if they ONLY have guardian role (no other roles)
    AND NOT EXISTS (
      SELECT 1 FROM organization_memberships om2
      WHERE om2.profile_id = p.id AND om2.role != 'guardian'
    )
);

-- Delete organization_memberships for phantom guardians
DELETE FROM organization_memberships
WHERE profile_id IN (
  SELECT p.id
  FROM profiles p
  WHERE p.user_id IS NULL
    AND NOT is_valid_phone(p.phone_number)
    AND NOT is_valid_email(p.email)
    -- At this point, we've already deleted their guardian memberships
    -- Only delete profiles that now have NO memberships
    AND NOT EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.profile_id = p.id
    )
)
AND role = 'guardian';

-- Delete the phantom profile records themselves
DELETE FROM profiles
WHERE id IN (
  SELECT p.id
  FROM profiles p
  WHERE p.user_id IS NULL
    AND NOT is_valid_phone(p.phone_number)
    AND NOT is_valid_email(p.email)
    -- Only delete if they have NO memberships left
    AND NOT EXISTS (
      SELECT 1 FROM organization_memberships om
      WHERE om.profile_id = p.id
    )
    -- And no parent_student_links
    AND NOT EXISTS (
      SELECT 1 FROM parent_student_links psl
      WHERE psl.parent_profile_id = p.id
    )
);

-- ============================================================================
-- STEP 3: Create get_student_siblings RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_student_siblings(p_student_id UUID)
RETURNS TABLE (
  student_id UUID,
  first_name TEXT,
  last_name TEXT,
  grade TEXT,
  relationship TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Find siblings via shared VALID parent links
  -- Parents must have real contact info to prevent phantom sibling matches
  SELECT DISTINCT
    sibling_profile.id AS student_id,
    sibling_profile.first_name,
    sibling_profile.last_name,
    sp.grade,
    CASE
      WHEN psl_me.relationship = psl_sibling.relationship THEN 'sibling'
      ELSE format('sibling (%s side)', psl_me.relationship)
    END AS relationship
  FROM parent_student_links psl_me
  JOIN profiles parent ON parent.id = psl_me.parent_profile_id
  JOIN parent_student_links psl_sibling ON psl_sibling.parent_profile_id = psl_me.parent_profile_id
  JOIN profiles sibling_profile ON sibling_profile.id = psl_sibling.student_profile_id
  LEFT JOIN student_profiles sp ON sp.profile_id = sibling_profile.id
  WHERE psl_me.student_profile_id = p_student_id
    AND psl_sibling.student_profile_id != p_student_id  -- Exclude self
    -- CRITICAL: Only count as sibling if parent has VALID contact info
    AND (is_valid_phone(parent.phone_number) OR is_valid_email(parent.email))
  ORDER BY sibling_profile.first_name;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_student_siblings(UUID) TO authenticated;

-- ============================================================================
-- STEP 4: Create get_organization_parents RPC
-- ============================================================================

-- Drop existing function if it exists with different signature
DROP FUNCTION IF EXISTS public.get_organization_parents(UUID);

CREATE OR REPLACE FUNCTION public.get_organization_parents(p_organization_id UUID)
RETURNS TABLE (
  parent_id UUID,
  parent_type TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  children JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS parent_id,
    om.role AS parent_type,  -- 'guardian'
    p.first_name,
    p.last_name,
    p.phone_number AS phone,
    p.email,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'student_id', child.id,
        'first_name', child.first_name,
        'last_name', child.last_name,
        'grade', sp.grade,
        'relationship', psl.relationship
      )), '[]'::jsonb)
      FROM parent_student_links psl
      JOIN profiles child ON child.id = psl.student_profile_id
      LEFT JOIN student_profiles sp ON sp.profile_id = child.id
      WHERE psl.parent_profile_id = p.id
    ) AS children
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  WHERE om.organization_id = p_organization_id
    AND om.role = 'guardian'
    -- Exclude phantom guardians - must have valid contact OR be claimed
    AND (is_valid_phone(p.phone_number) OR is_valid_email(p.email) OR p.user_id IS NOT NULL)
  ORDER BY p.first_name, p.last_name;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_organization_parents(UUID) TO authenticated;

-- ============================================================================
-- STEP 5: Update create_guardian_profiles_from_student with validation
-- ============================================================================

-- Note: The existing function needs to be updated to use is_valid_phone/is_valid_email
-- This will be done via CREATE OR REPLACE in a future migration or by updating the
-- existing function definition. For now, the cleanup and new RPCs are the priority.

COMMENT ON FUNCTION public.is_valid_phone(TEXT) IS 'Validates phone number is not empty, not all zeros, and has at least 7 digits';
COMMENT ON FUNCTION public.is_valid_email(TEXT) IS 'Validates email has basic format and is not a placeholder value';
COMMENT ON FUNCTION public.get_student_siblings(UUID) IS 'Returns siblings of a student via shared valid parents (prevents phantom matches)';
COMMENT ON FUNCTION public.get_organization_parents(UUID) IS 'Returns all valid guardians in an organization with their linked children';
