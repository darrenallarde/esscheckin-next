-- EMERGENCY FIX: Restore check-in functionality to production
-- Run this immediately to get check-ins working again

-- First, ensure the profile_pin column exists
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS profile_pin TEXT;

-- Create the PIN generation function if it doesn't exist
CREATE OR REPLACE FUNCTION generate_profile_pin()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
$$;

-- Drop and recreate the checkin_student function with all fixes
DROP FUNCTION IF EXISTS public.checkin_student(uuid) CASCADE;

CREATE FUNCTION public.checkin_student(p_student_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  first_name TEXT,
  user_type TEXT,
  check_in_id UUID,
  profile_pin TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student RECORD;
  v_existing_checkin UUID;
  v_new_checkin UUID;
  v_pin TEXT;
BEGIN
  -- Get student info
  SELECT s.first_name, s.user_type, s.profile_pin
  INTO v_student
  FROM students s
  WHERE s.id = p_student_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Student not found'::TEXT, ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- Ensure student has a PIN
  IF v_student.profile_pin IS NULL THEN
    v_pin := generate_profile_pin();
    UPDATE students SET profile_pin = v_pin WHERE id = p_student_id;
  ELSE
    v_pin := v_student.profile_pin;
  END IF;

  -- Check for existing check-in today
  SELECT id INTO v_existing_checkin
  FROM check_ins
  WHERE student_id = p_student_id
    AND checked_in_at::DATE = CURRENT_DATE
  LIMIT 1;

  IF v_existing_checkin IS NOT NULL THEN
    -- Already checked in
    RETURN QUERY SELECT
      TRUE,
      'Already checked in today'::TEXT,
      v_student.first_name,
      v_student.user_type,
      v_existing_checkin,
      v_pin;
  ELSE
    -- New check-in
    INSERT INTO check_ins (student_id)
    VALUES (p_student_id)
    RETURNING id INTO v_new_checkin;

    RETURN QUERY SELECT
      TRUE,
      'Check-in successful'::TEXT,
      v_student.first_name,
      v_student.user_type,
      v_new_checkin,
      v_pin;
  END IF;
END;
$$;

-- Ensure public can insert check-ins (needed for kiosk)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public can create check-ins" ON public.check_ins;

  CREATE POLICY "Public can create check-ins" ON public.check_ins
    FOR INSERT
    WITH CHECK (true);
EXCEPTION
  WHEN OTHERS THEN
    -- Policy might not exist, that's ok
    CREATE POLICY "Public can create check-ins" ON public.check_ins
      FOR INSERT
      WITH CHECK (true);
END $$;

-- Test the function works
SELECT * FROM checkin_student('00000000-0000-0000-0000-000000000000'::UUID);
-- Should return: success=false, message='Student not found'
