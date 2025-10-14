-- Create a secure function to update student email
-- This allows public users to update their own email after check-in

CREATE OR REPLACE FUNCTION public.update_student_email(
  p_student_id uuid,
  p_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Validate email format
  IF p_email IS NULL OR p_email = '' OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;

  -- Update the student's email
  UPDATE public.students
  SET email = p_email
  WHERE id = p_student_id;

  -- Return true if update was successful
  RETURN FOUND;
END;
$function$;

-- Grant execute permissions to public users
GRANT EXECUTE ON FUNCTION public.update_student_email(uuid, text) TO anon, authenticated;

-- Add comment
COMMENT ON FUNCTION public.update_student_email IS 'Allows updating student email address with validation';
