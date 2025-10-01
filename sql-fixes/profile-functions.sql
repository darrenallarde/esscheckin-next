-- Function to get student by ID (public access for profile page)
CREATE OR REPLACE FUNCTION get_student_by_id(p_student_id uuid)
RETURNS TABLE (
  id uuid,
  first_name text,
  last_name text,
  phone_number text,
  email text,
  grade text,
  high_school text,
  user_type text,
  instagram_handle text,
  date_of_birth date,
  mother_first_name text,
  mother_last_name text,
  mother_phone text,
  father_first_name text,
  father_last_name text,
  father_phone text,
  created_at timestamptz
)
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT 
    id,
    first_name,
    last_name,
    phone_number,
    email,
    grade,
    high_school,
    user_type,
    instagram_handle,
    date_of_birth,
    mother_first_name,
    mother_last_name,
    mother_phone,
    father_first_name,
    father_last_name,
    father_phone,
    created_at
  FROM public.students
  WHERE id = p_student_id;
$$;

-- Function to update student profile (public access)
CREATE OR REPLACE FUNCTION update_student_profile(
  p_student_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone_number text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_instagram_handle text DEFAULT NULL,
  p_grade text DEFAULT NULL,
  p_high_school text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_mother_first_name text DEFAULT NULL,
  p_mother_last_name text DEFAULT NULL,
  p_mother_phone text DEFAULT NULL,
  p_father_first_name text DEFAULT NULL,
  p_father_last_name text DEFAULT NULL,
  p_father_phone text DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.students
  SET
    first_name = p_first_name,
    last_name = p_last_name,
    phone_number = p_phone_number,
    email = p_email,
    instagram_handle = p_instagram_handle,
    grade = p_grade,
    high_school = p_high_school,
    date_of_birth = p_date_of_birth,
    mother_first_name = p_mother_first_name,
    mother_last_name = p_mother_last_name,
    mother_phone = p_mother_phone,
    father_first_name = p_father_first_name,
    father_last_name = p_father_last_name,
    father_phone = p_father_phone
  WHERE id = p_student_id;

  RETURN jsonb_build_object('success', true, 'message', 'Profile updated successfully');
END;
$$;
