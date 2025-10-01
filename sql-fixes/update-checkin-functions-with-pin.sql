-- Update check-in functions to generate and return profile PIN

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.checkin_student(uuid);

-- Update register_student_and_checkin to generate PIN for new students
CREATE OR REPLACE FUNCTION public.register_student_and_checkin(
  p_first_name text,
  p_last_name text,
  p_phone_number text DEFAULT NULL::text,
  p_email text DEFAULT NULL::text,
  p_date_of_birth date DEFAULT NULL::date,
  p_instagram_handle text DEFAULT NULL::text,
  p_user_type text DEFAULT 'student'::text,
  p_grade text DEFAULT NULL::text,
  p_high_school text DEFAULT NULL::text,
  p_parent_name text DEFAULT NULL::text,
  p_parent_phone text DEFAULT NULL::text,
  p_mother_first_name text DEFAULT NULL::text,
  p_mother_last_name text DEFAULT NULL::text,
  p_mother_phone text DEFAULT NULL::text,
  p_father_first_name text DEFAULT NULL::text,
  p_father_last_name text DEFAULT NULL::text,
  p_father_phone text DEFAULT NULL::text
)
RETURNS TABLE(student_id uuid, success boolean, message text, profile_pin text, check_in_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_student_id UUID;
  new_pin TEXT;
  new_check_in_id UUID;
BEGIN
  -- Input validation
  IF p_first_name IS NULL OR p_first_name = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'First name is required', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  IF p_last_name IS NULL OR p_last_name = '' THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Last name is required', NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Generate PIN
  new_pin := generate_profile_pin();

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
    parent_phone,
    mother_first_name,
    mother_last_name,
    mother_phone,
    father_first_name,
    father_last_name,
    father_phone,
    profile_pin
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
    p_parent_phone,
    p_mother_first_name,
    p_mother_last_name,
    p_mother_phone,
    p_father_first_name,
    p_father_last_name,
    p_father_phone,
    new_pin
  ) RETURNING id INTO new_student_id;

  -- Create check-in record
  INSERT INTO public.check_ins (student_id)
  VALUES (new_student_id)
  RETURNING id INTO new_check_in_id;

  RETURN QUERY SELECT new_student_id, TRUE, 'Registration and check-in successful', new_pin, new_check_in_id;
END;
$function$;

-- Update checkin_student to return PIN and check_in_id
CREATE OR REPLACE FUNCTION public.checkin_student(p_student_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  first_name TEXT,
  user_type TEXT,
  profile_pin TEXT,
  check_in_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_record RECORD;
  new_check_in_id UUID;
BEGIN
  -- Verify student exists and get their info including PIN
  SELECT s.first_name, s.user_type, s.profile_pin
  INTO student_record
  FROM public.students s
  WHERE s.id = p_student_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Student not found', ''::TEXT, ''::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- If student doesn't have a PIN, generate one
  IF student_record.profile_pin IS NULL THEN
    UPDATE public.students
    SET profile_pin = generate_profile_pin()
    WHERE id = p_student_id
    RETURNING profile_pin INTO student_record.profile_pin;
  END IF;

  -- Create check-in record
  INSERT INTO public.check_ins (student_id)
  VALUES (p_student_id)
  RETURNING id INTO new_check_in_id;

  RETURN QUERY SELECT TRUE, 'Check-in successful', student_record.first_name, student_record.user_type, student_record.profile_pin, new_check_in_id;
END;
$$;
