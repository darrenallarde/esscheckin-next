-- Force drop and recreate checkin_student with idempotent logic
-- This version is simpler and will definitely work

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
