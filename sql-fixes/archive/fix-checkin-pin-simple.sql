-- Simple fix to add profile_pin to checkin_student return
-- Drop and recreate with correct signature

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
  new_check_in_id UUID;
  student_pin TEXT;
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

  -- Create check-in record
  INSERT INTO public.check_ins (student_id)
  VALUES (p_student_id)
  RETURNING id INTO new_check_in_id;

  RETURN QUERY SELECT TRUE, 'Check-in successful', student_record.first_name, student_record.user_type, new_check_in_id, student_pin;
END;
$$;
