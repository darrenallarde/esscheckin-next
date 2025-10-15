-- Fix race condition in checkin_student function
-- ISSUE: If two simultaneous check-ins occur, both might pass the SELECT check
-- and both try to INSERT, causing unique constraint violation without proper handling
-- FIX: Add exception handling and use INSERT ... ON CONFLICT for atomic upsert

DROP FUNCTION IF EXISTS public.checkin_student(UUID);

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
  v_checkin_id UUID;
  v_pin TEXT;
  v_was_existing BOOLEAN;
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

  -- Ensure student has a PIN (generate if missing)
  IF v_student.profile_pin IS NULL THEN
    v_pin := generate_profile_pin();
    UPDATE students SET profile_pin = v_pin WHERE id = p_student_id;
  ELSE
    v_pin := v_student.profile_pin;
  END IF;

  -- Atomic upsert: try to insert, if exists (due to unique constraint), get existing
  -- This handles race conditions where two simultaneous check-ins occur
  BEGIN
    -- Try to insert new check-in for today
    INSERT INTO check_ins (student_id, checked_in_at)
    VALUES (p_student_id, CURRENT_TIMESTAMP)
    RETURNING id INTO v_checkin_id;

    v_was_existing := FALSE;

  EXCEPTION WHEN unique_violation THEN
    -- Check-in already exists for today (race condition or second attempt)
    SELECT id INTO v_checkin_id
    FROM check_ins
    WHERE student_id = p_student_id
      AND DATE(checked_in_at) = CURRENT_DATE
    LIMIT 1;

    v_was_existing := TRUE;
  END;

  -- Return success with appropriate message
  RETURN QUERY SELECT
    TRUE,
    CASE WHEN v_was_existing THEN 'Already checked in today'::TEXT ELSE 'Check-in successful'::TEXT END,
    v_student.first_name,
    v_student.user_type,
    v_checkin_id,
    v_pin;
END;
$$;

COMMENT ON FUNCTION public.checkin_student IS
'Idempotent check-in function with race condition handling. Uses exception handling to gracefully manage simultaneous check-ins. Returns check-in ID and profile PIN.';
