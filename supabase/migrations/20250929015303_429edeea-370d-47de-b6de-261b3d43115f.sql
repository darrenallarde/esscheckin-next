-- Add separate mother and father fields to students table
ALTER TABLE public.students 
ADD COLUMN mother_first_name TEXT,
ADD COLUMN mother_last_name TEXT,
ADD COLUMN mother_phone TEXT,
ADD COLUMN father_first_name TEXT,
ADD COLUMN father_last_name TEXT,
ADD COLUMN father_phone TEXT;

-- Update the register_student_and_checkin function to include new parent fields
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
RETURNS TABLE(student_id uuid, success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    parent_phone,
    mother_first_name,
    mother_last_name,
    mother_phone,
    father_first_name,
    father_last_name,
    father_phone
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
    p_father_phone
  ) RETURNING id INTO new_student_id;
  
  -- Create check-in record
  INSERT INTO public.check_ins (student_id) VALUES (new_student_id);
  
  RETURN QUERY SELECT new_student_id, TRUE, 'Registration and check-in successful';
END;
$function$;