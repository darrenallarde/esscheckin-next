-- =============================================================================
-- BACKFILL GUARDIAN PROFILES
-- =============================================================================
-- This migration creates guardian profiles for all existing students
-- who have parent information in student_profiles but no corresponding
-- guardian profiles yet.
-- =============================================================================

-- One-time function to backfill guardians (can be dropped after migration)
CREATE OR REPLACE FUNCTION public.backfill_guardian_profiles_once()
RETURNS TABLE (
  students_processed INTEGER,
  fathers_created INTEGER,
  mothers_created INTEGER,
  guardians_created INTEGER,
  links_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student RECORD;
  v_org_id UUID;
  v_father_profile_id UUID;
  v_mother_profile_id UUID;
  v_guardian_profile_id UUID;
  v_existing_id UUID;
  v_students_count INTEGER := 0;
  v_fathers_count INTEGER := 0;
  v_mothers_count INTEGER := 0;
  v_guardians_count INTEGER := 0;
  v_links_count INTEGER := 0;
BEGIN
  -- Loop through all students with parent info
  FOR v_student IN
    SELECT
      sp.profile_id,
      sp.father_first_name, sp.father_last_name, sp.father_phone, sp.father_email,
      sp.mother_first_name, sp.mother_last_name, sp.mother_phone, sp.mother_email,
      sp.parent_name, sp.parent_phone,
      om.organization_id
    FROM student_profiles sp
    JOIN organization_memberships om ON om.profile_id = sp.profile_id
    WHERE om.role = 'student'
      AND om.status = 'active'
      AND (
        (sp.father_first_name IS NOT NULL AND (sp.father_phone IS NOT NULL OR sp.father_email IS NOT NULL))
        OR (sp.mother_first_name IS NOT NULL AND (sp.mother_phone IS NOT NULL OR sp.mother_email IS NOT NULL))
        OR (sp.parent_name IS NOT NULL AND sp.parent_phone IS NOT NULL)
      )
  LOOP
    v_students_count := v_students_count + 1;
    v_org_id := v_student.organization_id;
    v_father_profile_id := NULL;
    v_mother_profile_id := NULL;
    v_guardian_profile_id := NULL;

    -- =================================================================
    -- CREATE/FIND FATHER PROFILE
    -- =================================================================
    IF v_student.father_first_name IS NOT NULL
       AND (v_student.father_phone IS NOT NULL OR v_student.father_email IS NOT NULL)
    THEN
      -- Check if profile already exists by phone or email
      SELECT p.id INTO v_existing_id
      FROM profiles p
      WHERE (v_student.father_phone IS NOT NULL AND p.phone_number = v_student.father_phone)
         OR (v_student.father_email IS NOT NULL AND LOWER(p.email) = LOWER(v_student.father_email))
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        v_father_profile_id := v_existing_id;
      ELSE
        -- Create new profile
        INSERT INTO profiles (first_name, last_name, phone_number, email)
        VALUES (
          v_student.father_first_name,
          COALESCE(v_student.father_last_name, ''),
          v_student.father_phone,
          v_student.father_email
        )
        RETURNING id INTO v_father_profile_id;
        v_fathers_count := v_fathers_count + 1;
      END IF;

      -- Create/update organization membership as guardian
      INSERT INTO organization_memberships (profile_id, organization_id, role, status)
      VALUES (v_father_profile_id, v_org_id, 'guardian', 'pending')
      ON CONFLICT (profile_id, organization_id) DO NOTHING;

      -- Create parent-student link
      INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_primary)
      VALUES (v_father_profile_id, v_student.profile_id, 'father', TRUE)
      ON CONFLICT (parent_profile_id, student_profile_id) DO NOTHING;

      IF FOUND THEN
        v_links_count := v_links_count + 1;
      END IF;
    END IF;

    -- =================================================================
    -- CREATE/FIND MOTHER PROFILE
    -- =================================================================
    IF v_student.mother_first_name IS NOT NULL
       AND (v_student.mother_phone IS NOT NULL OR v_student.mother_email IS NOT NULL)
    THEN
      -- Check if profile already exists
      SELECT p.id INTO v_existing_id
      FROM profiles p
      WHERE (v_student.mother_phone IS NOT NULL AND p.phone_number = v_student.mother_phone)
         OR (v_student.mother_email IS NOT NULL AND LOWER(p.email) = LOWER(v_student.mother_email))
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        v_mother_profile_id := v_existing_id;
      ELSE
        INSERT INTO profiles (first_name, last_name, phone_number, email)
        VALUES (
          v_student.mother_first_name,
          COALESCE(v_student.mother_last_name, ''),
          v_student.mother_phone,
          v_student.mother_email
        )
        RETURNING id INTO v_mother_profile_id;
        v_mothers_count := v_mothers_count + 1;
      END IF;

      -- Create/update organization membership
      INSERT INTO organization_memberships (profile_id, organization_id, role, status)
      VALUES (v_mother_profile_id, v_org_id, 'guardian', 'pending')
      ON CONFLICT (profile_id, organization_id) DO NOTHING;

      -- Create parent-student link (primary if no father)
      INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_primary)
      VALUES (v_mother_profile_id, v_student.profile_id, 'mother', v_father_profile_id IS NULL)
      ON CONFLICT (parent_profile_id, student_profile_id) DO NOTHING;

      IF FOUND THEN
        v_links_count := v_links_count + 1;
      END IF;
    END IF;

    -- =================================================================
    -- CREATE LEGACY GUARDIAN PROFILE (if parent_name/phone provided but no mother/father)
    -- =================================================================
    IF v_father_profile_id IS NULL
       AND v_mother_profile_id IS NULL
       AND v_student.parent_name IS NOT NULL
       AND v_student.parent_phone IS NOT NULL
    THEN
      -- Check if profile already exists
      SELECT p.id INTO v_existing_id
      FROM profiles p
      WHERE p.phone_number = v_student.parent_phone
      LIMIT 1;

      IF v_existing_id IS NOT NULL THEN
        v_guardian_profile_id := v_existing_id;
      ELSE
        -- Parse name (simple first/last split)
        INSERT INTO profiles (first_name, last_name, phone_number)
        VALUES (
          split_part(v_student.parent_name, ' ', 1),
          COALESCE(NULLIF(trim(substr(v_student.parent_name, position(' ' in v_student.parent_name) + 1)), ''), ''),
          v_student.parent_phone
        )
        RETURNING id INTO v_guardian_profile_id;
        v_guardians_count := v_guardians_count + 1;
      END IF;

      -- Create organization membership
      INSERT INTO organization_memberships (profile_id, organization_id, role, status)
      VALUES (v_guardian_profile_id, v_org_id, 'guardian', 'pending')
      ON CONFLICT (profile_id, organization_id) DO NOTHING;

      -- Create parent-student link
      INSERT INTO parent_student_links (parent_profile_id, student_profile_id, relationship, is_primary)
      VALUES (v_guardian_profile_id, v_student.profile_id, 'guardian', TRUE)
      ON CONFLICT (parent_profile_id, student_profile_id) DO NOTHING;

      IF FOUND THEN
        v_links_count := v_links_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_students_count, v_fathers_count, v_mothers_count, v_guardians_count, v_links_count;
END;
$$;

-- Run the backfill
DO $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM backfill_guardian_profiles_once();
  RAISE NOTICE 'Backfill complete: % students processed, % fathers, % mothers, % guardians created, % links created',
    v_result.students_processed,
    v_result.fathers_created,
    v_result.mothers_created,
    v_result.guardians_created,
    v_result.links_created;
END;
$$;

-- Drop the one-time function
DROP FUNCTION public.backfill_guardian_profiles_once();
