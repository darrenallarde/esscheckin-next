-- Fix register_student_and_checkin function for production
-- Updated to handle parent_name and parent_phone as NOT NULL by using default values

-- Drop existing function to avoid conflicts
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text);

-- Create register_student_and_checkin function
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
  v_parent_name TEXT;
  v_parent_phone TEXT;
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

  -- Build parent_name from father/mother info if not provided
  IF p_parent_name IS NULL OR p_parent_name = '' THEN
    IF p_father_first_name IS NOT NULL AND p_father_first_name != '' THEN
      v_parent_name := p_father_first_name || ' ' || COALESCE(p_father_last_name, p_last_name);
    ELSIF p_mother_first_name IS NOT NULL AND p_mother_first_name != '' THEN
      v_parent_name := p_mother_first_name || ' ' || COALESCE(p_mother_last_name, p_last_name);
    ELSE
      v_parent_name := ''; -- Empty string as fallback
    END IF;
  ELSE
    v_parent_name := p_parent_name;
  END IF;

  -- Use parent_phone or fallback to father/mother phone or empty string
  IF p_parent_phone IS NOT NULL AND p_parent_phone != '' THEN
    v_parent_phone := p_parent_phone;
  ELSIF p_father_phone IS NOT NULL AND p_father_phone != '' THEN
    v_parent_phone := p_father_phone;
  ELSIF p_mother_phone IS NOT NULL AND p_mother_phone != '' THEN
    v_parent_phone := p_mother_phone;
  ELSE
    v_parent_phone := ''; -- Empty string as fallback
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
    v_parent_name,
    v_parent_phone,
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;
