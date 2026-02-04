-- =============================================================================
-- STUDENT MANAGEMENT FEATURES - SCHEMA CHANGES
-- =============================================================================
-- This migration adds schema changes for:
--   1. Default groups (is_default, default_grades, default_gender on groups)
--   2. Gender field (on student_profiles)
--   3. New students triage (needs_triage on organization_memberships)
--   4. Archive students (archived status on organization_memberships)
-- =============================================================================

-- =============================================================================
-- 1. ADD DEFAULT GROUP COLUMNS TO GROUPS TABLE
-- =============================================================================

-- Add is_default flag - marks groups as auto-assign targets for new students
ALTER TABLE groups ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;

-- Add default_grades - array of grade levels that auto-assign to this group
-- Example: ['6','7','8'] for middle school
ALTER TABLE groups ADD COLUMN IF NOT EXISTS default_grades TEXT[];

-- Add default_gender - gender filter for auto-assignment
-- Values: 'male', 'female', or NULL (any gender)
ALTER TABLE groups ADD COLUMN IF NOT EXISTS default_gender TEXT;

-- Add constraint to ensure valid gender values
ALTER TABLE groups ADD CONSTRAINT groups_default_gender_check
  CHECK (default_gender IS NULL OR default_gender IN ('male', 'female'));

COMMENT ON COLUMN groups.is_default IS 'When true, new students matching grade/gender criteria are auto-assigned to this group';
COMMENT ON COLUMN groups.default_grades IS 'Array of grade levels (e.g., [''6'',''7'',''8'']) for auto-assignment. NULL means any grade.';
COMMENT ON COLUMN groups.default_gender IS 'Gender filter for auto-assignment: ''male'', ''female'', or NULL (any)';

-- =============================================================================
-- 2. ADD GENDER TO STUDENT_PROFILES
-- =============================================================================

ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add constraint to ensure valid gender values
ALTER TABLE student_profiles ADD CONSTRAINT student_profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female'));

COMMENT ON COLUMN student_profiles.gender IS 'Student gender: ''male'' or ''female''';

-- =============================================================================
-- 3. ADD NEEDS_TRIAGE TO ORGANIZATION_MEMBERSHIPS
-- =============================================================================

-- Add needs_triage flag for new student workflow
ALTER TABLE organization_memberships ADD COLUMN IF NOT EXISTS needs_triage BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN organization_memberships.needs_triage IS 'When true, student appears in "New Students" dashboard for admin review';

-- =============================================================================
-- 4. UPDATE STATUS CONSTRAINT TO INCLUDE 'ARCHIVED'
-- =============================================================================

-- Drop existing constraint
ALTER TABLE organization_memberships DROP CONSTRAINT IF EXISTS organization_memberships_status_check;

-- Add new constraint with 'archived' option
ALTER TABLE organization_memberships ADD CONSTRAINT organization_memberships_status_check
  CHECK (status = ANY (ARRAY['active'::text, 'pending'::text, 'suspended'::text, 'archived'::text]));

COMMENT ON COLUMN organization_memberships.status IS 'Member status: active, pending, suspended, or archived';

-- =============================================================================
-- 5. SET NEEDS_TRIAGE = FALSE FOR EXISTING STUDENTS
-- =============================================================================
-- Existing students are already triaged, only new registrations should be flagged

UPDATE organization_memberships
SET needs_triage = FALSE
WHERE role = 'student';

-- Non-student members don't need triage
UPDATE organization_memberships
SET needs_triage = FALSE
WHERE role != 'student';

-- =============================================================================
-- 6. CREATE INDEX FOR NEW STUDENTS QUERY
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_org_memberships_needs_triage
  ON organization_memberships (organization_id, needs_triage)
  WHERE needs_triage = TRUE AND status = 'active' AND role = 'student';
