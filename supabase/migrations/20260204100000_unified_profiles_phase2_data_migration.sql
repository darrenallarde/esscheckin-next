-- =============================================================================
-- UNIFIED USER PROFILES - PHASE 2: DATA MIGRATION
-- =============================================================================
-- This migration copies existing data from old tables to the new unified
-- profile system. It maintains the same IDs for students so FK references
-- continue to work during the transition.
--
-- IMPORTANT: Handles duplicate emails by only inserting one profile per email.
-- Uses DISTINCT ON to pick the first student when duplicates exist.
-- Handles org_role ENUM by casting to TEXT for comparison.
-- =============================================================================

-- =============================================================================
-- 1. MIGRATE STUDENTS → profiles
-- =============================================================================

-- First, insert students WITHOUT emails (no conflict possible)
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  phone_number,
  date_of_birth,
  user_id,
  created_at,
  updated_at
)
SELECT
  id,
  first_name,
  COALESCE(last_name, ''),
  email,
  phone_number,
  date_of_birth,
  user_id,
  created_at,
  COALESCE(updated_at, created_at)
FROM public.students
WHERE email IS NULL
ON CONFLICT (id) DO NOTHING;

-- Insert students WITH emails - handle duplicates by taking first one per email
INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email,
  phone_number,
  date_of_birth,
  user_id,
  created_at,
  updated_at
)
SELECT DISTINCT ON (LOWER(email))
  s.id,
  s.first_name,
  COALESCE(s.last_name, ''),
  s.email,
  s.phone_number,
  s.date_of_birth,
  COALESCE(
    s.user_id,
    (SELECT om.user_id FROM organization_members om
     JOIN auth.users au ON au.id = om.user_id
     WHERE LOWER(au.email) = LOWER(s.email) LIMIT 1)
  ),
  s.created_at,
  COALESCE(s.updated_at, s.created_at)
FROM public.students s
WHERE s.email IS NOT NULL
ORDER BY LOWER(email), s.created_at ASC
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. MIGRATE STUDENTS → student_profiles
-- =============================================================================

INSERT INTO public.student_profiles (
  profile_id,
  grade,
  high_school,
  instagram_handle,
  address,
  city,
  state,
  zip,
  profile_pin,
  father_first_name,
  father_last_name,
  father_phone,
  father_email,
  mother_first_name,
  mother_last_name,
  mother_phone,
  mother_email,
  parent_name,
  parent_phone,
  created_at,
  updated_at
)
SELECT
  COALESCE(
    p.id,
    (SELECT p2.id FROM profiles p2 WHERE LOWER(p2.email) = LOWER(s.email))
  ),
  s.grade,
  s.high_school,
  s.instagram_handle,
  s.address,
  s.city,
  s.state,
  s.zip,
  s.profile_pin,
  s.father_first_name,
  s.father_last_name,
  s.father_phone,
  s.father_email,
  s.mother_first_name,
  s.mother_last_name,
  s.mother_phone,
  s.mother_email,
  s.parent_name,
  s.parent_phone,
  s.created_at,
  COALESCE(s.updated_at, s.created_at)
FROM public.students s
LEFT JOIN public.profiles p ON p.id = s.id
WHERE p.id IS NOT NULL OR EXISTS (
  SELECT 1 FROM profiles p2 WHERE LOWER(p2.email) = LOWER(s.email)
)
ON CONFLICT (profile_id) DO NOTHING;

-- =============================================================================
-- 3. MIGRATE STUDENTS → organization_memberships (role='student')
-- =============================================================================

INSERT INTO public.organization_memberships (
  profile_id,
  organization_id,
  role,
  status,
  created_at,
  updated_at
)
SELECT
  COALESCE(
    p.id,
    (SELECT p2.id FROM profiles p2 WHERE LOWER(p2.email) = LOWER(s.email))
  ),
  s.organization_id,
  'student',
  'active',
  s.created_at,
  COALESCE(s.updated_at, s.created_at)
FROM public.students s
LEFT JOIN public.profiles p ON p.id = s.id
WHERE s.organization_id IS NOT NULL
  AND (p.id IS NOT NULL OR EXISTS (
    SELECT 1 FROM profiles p2 WHERE LOWER(p2.email) = LOWER(s.email)
  ))
ON CONFLICT (profile_id, organization_id) DO NOTHING;

-- =============================================================================
-- 4. MIGRATE ORGANIZATION_MEMBERS → profiles
-- =============================================================================

INSERT INTO public.profiles (
  first_name,
  last_name,
  email,
  user_id,
  created_at,
  updated_at
)
SELECT
  COALESCE(
    SPLIT_PART(au.raw_user_meta_data->>'full_name', ' ', 1),
    SPLIT_PART(au.email, '@', 1),
    'Unknown'
  ),
  COALESCE(
    NULLIF(TRIM(SUBSTR(au.raw_user_meta_data->>'full_name',
      LENGTH(SPLIT_PART(au.raw_user_meta_data->>'full_name', ' ', 1)) + 2)), ''),
    ''
  ),
  au.email,
  om.user_id,
  om.created_at,
  COALESCE(om.created_at, NOW())
FROM public.organization_members om
JOIN auth.users au ON au.id = om.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = om.user_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE LOWER(p.email) = LOWER(au.email)
)
ON CONFLICT (user_id) DO NOTHING;

-- Link user_id for org members whose email matched a student
UPDATE public.profiles p
SET user_id = om.user_id
FROM public.organization_members om
JOIN auth.users au ON au.id = om.user_id
WHERE LOWER(p.email) = LOWER(au.email)
  AND p.user_id IS NULL;

-- =============================================================================
-- 5. MIGRATE ORGANIZATION_MEMBERS → organization_memberships
-- =============================================================================
-- Cast org_role ENUM to TEXT for comparison (handles both TEXT and ENUM schemas)

INSERT INTO public.organization_memberships (
  profile_id,
  organization_id,
  role,
  status,
  display_name,
  created_at,
  updated_at
)
SELECT
  p.id,
  om.organization_id,
  -- Cast to text to handle both ENUM and TEXT column types
  CASE om.role::TEXT
    WHEN 'owner' THEN 'owner'
    WHEN 'admin' THEN 'admin'
    WHEN 'leader' THEN 'leader'
    WHEN 'member' THEN 'leader'  -- staging uses 'member' for team members
    WHEN 'viewer' THEN 'viewer'
    ELSE 'viewer'
  END,
  COALESCE(om.status, 'active'),
  om.display_name,
  om.created_at,
  COALESCE(om.created_at, NOW())
FROM public.organization_members om
JOIN public.profiles p ON p.user_id = om.user_id
ON CONFLICT (profile_id, organization_id) DO UPDATE SET
  role = CASE
    WHEN EXCLUDED.role = 'owner' THEN 'owner'
    WHEN EXCLUDED.role = 'admin' AND organization_memberships.role NOT IN ('owner') THEN 'admin'
    WHEN EXCLUDED.role = 'leader' AND organization_memberships.role NOT IN ('owner', 'admin') THEN 'leader'
    ELSE organization_memberships.role
  END,
  display_name = COALESCE(EXCLUDED.display_name, organization_memberships.display_name);

-- =============================================================================
-- 6. MIGRATE GROUP_MEMBERS → group_memberships
-- =============================================================================

INSERT INTO public.group_memberships (
  profile_id,
  group_id,
  role,
  is_primary,
  joined_at
)
SELECT
  COALESCE(
    (SELECT p.id FROM profiles p WHERE p.id = gm.student_id),
    (SELECT p.id FROM profiles p
     JOIN students s ON LOWER(p.email) = LOWER(s.email)
     WHERE s.id = gm.student_id LIMIT 1)
  ),
  gm.group_id,
  'member',
  FALSE,
  COALESCE(gm.created_at, NOW())
FROM public.group_members gm
WHERE EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = gm.student_id
)
OR EXISTS (
  SELECT 1 FROM profiles p
  JOIN students s ON LOWER(p.email) = LOWER(s.email)
  WHERE s.id = gm.student_id
)
ON CONFLICT (profile_id, group_id) DO NOTHING;

-- =============================================================================
-- 7. MIGRATE GROUP_LEADERS → group_memberships
-- =============================================================================

INSERT INTO public.group_memberships (
  profile_id,
  group_id,
  role,
  is_primary,
  joined_at
)
SELECT
  p.id,
  gl.group_id,
  'leader',
  FALSE,
  COALESCE(gl.created_at, NOW())
FROM public.group_leaders gl
JOIN public.profiles p ON p.user_id = gl.user_id
ON CONFLICT (profile_id, group_id) DO UPDATE SET
  role = 'leader';

-- =============================================================================
-- 8. CREATE MAPPING TABLE FOR FK MIGRATION
-- =============================================================================

CREATE TABLE IF NOT EXISTS public._student_to_profile_map (
  student_id UUID PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id)
);

INSERT INTO public._student_to_profile_map (student_id, profile_id)
SELECT
  s.id as student_id,
  COALESCE(
    (SELECT p.id FROM profiles p WHERE p.id = s.id),
    (SELECT p.id FROM profiles p WHERE LOWER(p.email) = LOWER(s.email))
  ) as profile_id
FROM public.students s
WHERE EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = s.id OR (s.email IS NOT NULL AND LOWER(p.email) = LOWER(s.email))
)
ON CONFLICT (student_id) DO NOTHING;
