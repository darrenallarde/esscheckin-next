-- Essential functions for the check-in app to work

-- Function to search for students (returns minimal safe data)
CREATE OR REPLACE FUNCTION public.search_student_for_checkin(search_term TEXT)
RETURNS TABLE (
  student_id UUID,
  first_name TEXT,
  last_name TEXT,
  user_type TEXT,
  grade TEXT,
  high_school TEXT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    first_name,
    last_name,
    user_type,
    grade,
    high_school
  FROM public.students
  WHERE
    phone_number = search_term OR
    email = search_term OR
    (first_name ILIKE '%' || search_term || '%') OR
    (last_name ILIKE '%' || search_term || '%') OR
    (CONCAT(first_name, ' ', last_name) ILIKE '%' || search_term || '%')
  LIMIT 5;
$$;

-- Function to check in a student (returns check-in ID for gamification)
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

-- Function to register a new student and check them in
CREATE OR REPLACE FUNCTION public.register_student_and_checkin(
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone_number TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_instagram_handle TEXT DEFAULT NULL,
  p_user_type TEXT DEFAULT 'student',
  p_grade TEXT DEFAULT NULL,
  p_high_school TEXT DEFAULT NULL,
  p_parent_name TEXT DEFAULT NULL,
  p_parent_phone TEXT DEFAULT NULL
)
RETURNS TABLE (
  student_id UUID,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_student_id UUID;
BEGIN
  -- Input validation
  IF p_first_name IS NULL OR p_first_name = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'First name is required';
    RETURN;
  END IF;

  IF p_last_name IS NULL OR p_last_name = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Last name is required';
    RETURN;
  END IF;

  -- Insert new student
  INSERT INTO public.students (
    first_name,
    last_name,
    phone_number,
    email,
    date_of_birth,
    instagram_handle,
    user_type,
    grade,
    high_school,
    parent_name,
    parent_phone
  ) VALUES (
    p_first_name,
    p_last_name,
    p_phone_number,
    p_email,
    p_date_of_birth,
    p_instagram_handle,
    p_user_type,
    p_grade,
    p_high_school,
    p_parent_name,
    p_parent_phone
  ) RETURNING id INTO new_student_id;

  -- Create check-in record
  INSERT INTO public.check_ins (student_id) VALUES (new_student_id);

  RETURN QUERY SELECT new_student_id, TRUE, 'Registration and check-in successful';
END;
$$;

-- Grant execute permissions to anonymous users (for public check-in kiosk)
GRANT EXECUTE ON FUNCTION public.search_student_for_checkin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.register_student_and_checkin(TEXT, TEXT, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.checkin_student(UUID) TO anon;
