-- Make check-ins idempotent - only one check-in per student per day
-- This prevents duplicate check-ins when students check in multiple times to get their PIN

DROP FUNCTION IF EXISTS public.checkin_student(uuid);

CREATE OR REPLACE FUNCTION public.checkin_student(p_student_id UUID)
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
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
  existing_check_in_id UUID;
  new_check_in_id UUID;
  student_pin TEXT;
  already_checked_in BOOLEAN := FALSE;
BEGIN
  -- Verify student exists and get their info including PIN
  SELECT s.first_name, s.user_type, s.profile_pin
  INTO student_record
  FROM public.students s
  WHERE s.id = p_student_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Student not found', ''::TEXT, ''::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  -- If student doesn't have a PIN, generate one
  IF student_record.profile_pin IS NULL OR student_record.profile_pin = '' THEN
    student_pin := generate_profile_pin();
    UPDATE public.students
    SET profile_pin = student_pin
    WHERE id = p_student_id;
  ELSE
    student_pin := student_record.profile_pin;
  END IF;

  -- Check if student already checked in today (same calendar day in local timezone)
  SELECT id INTO existing_check_in_id
  FROM public.check_ins
  WHERE student_id = p_student_id
    AND DATE(checked_in_at AT TIME ZONE 'America/Los_Angeles') = CURRENT_DATE
  ORDER BY checked_in_at DESC
  LIMIT 1;

  IF existing_check_in_id IS NOT NULL THEN
    -- Already checked in today - return existing check-in
    already_checked_in := TRUE;
    new_check_in_id := existing_check_in_id;
  ELSE
    -- First check-in today - create new record
    INSERT INTO public.check_ins (student_id)
    VALUES (p_student_id)
    RETURNING id INTO new_check_in_id;
  END IF;

  -- Return success with appropriate message
  IF already_checked_in THEN
    RETURN QUERY SELECT TRUE, 'Already checked in today', student_record.first_name, student_record.user_type, new_check_in_id, student_pin;
  ELSE
    RETURN QUERY SELECT TRUE, 'Check-in successful', student_record.first_name, student_record.user_type, new_check_in_id, student_pin;
  END IF;
END;
$$;
