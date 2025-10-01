-- Add profile PIN for secure profile access
-- Each student gets a 4-digit PIN that's required to view their profile

-- Add profile_pin column to students table
ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS profile_pin TEXT;

-- Function to generate a random 4-digit PIN
CREATE OR REPLACE FUNCTION generate_profile_pin()
RETURNS TEXT
LANGUAGE sql
AS $$
  SELECT LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
$$;

-- Function to verify profile PIN
CREATE OR REPLACE FUNCTION verify_profile_pin(
  p_student_id uuid,
  p_pin text
)
RETURNS jsonb
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_stored_pin text;
BEGIN
  -- Get the stored PIN
  SELECT profile_pin INTO v_stored_pin
  FROM public.students
  WHERE id = p_student_id;

  -- Check if PIN matches
  IF v_stored_pin IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'No PIN set for this student');
  END IF;

  IF v_stored_pin = p_pin THEN
    RETURN jsonb_build_object('valid', true, 'message', 'PIN verified');
  ELSE
    RETURN jsonb_build_object('valid', false, 'message', 'Incorrect PIN');
  END IF;
END;
$$;

-- Update register_student_and_checkin to generate PIN on registration
-- (We'll update this separately to avoid breaking existing function)

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_profile_pin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION verify_profile_pin(uuid, text) TO anon, authenticated;
