-- Fix the checkin_student function to return the check-in ID
-- This is needed for the gamification system to work properly

CREATE OR REPLACE FUNCTION public.checkin_student(p_student_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  first_name TEXT,
  user_type TEXT,
  check_in_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
  new_checkin_id UUID;
BEGIN
  -- Verify student exists
  SELECT s.first_name, s.user_type INTO student_record
  FROM public.students s
  WHERE s.id = p_student_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Student not found', ''::TEXT, ''::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Create check-in record and capture the ID
  INSERT INTO public.check_ins (student_id)
  VALUES (p_student_id)
  RETURNING id INTO new_checkin_id;

  RETURN QUERY SELECT TRUE, 'Check-in successful', student_record.first_name, student_record.user_type, new_checkin_id;
END;
$$;