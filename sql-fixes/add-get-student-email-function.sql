-- Create a secure function to get student email
-- This allows public users to check if a student has an email without full table access

CREATE OR REPLACE FUNCTION public.get_student_email(
  p_student_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_email text;
BEGIN
  -- Get the student's email
  SELECT email INTO v_email
  FROM public.students
  WHERE id = p_student_id;

  RETURN v_email;
END;
$function$;

-- Grant execute permissions to public users
GRANT EXECUTE ON FUNCTION public.get_student_email(uuid) TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_student_email IS 'Returns student email for profile access checking';
