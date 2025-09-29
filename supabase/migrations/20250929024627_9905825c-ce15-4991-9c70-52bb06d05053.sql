-- Add user_id column to students table for proper authentication
ALTER TABLE public.students 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Drop the insecure RLS policies that rely on phone/email matching
DROP POLICY IF EXISTS "Students can view their own record" ON public.students;
DROP POLICY IF EXISTS "Students can update their own record" ON public.students;

-- Create secure RLS policies that use proper authentication
CREATE POLICY "Authenticated users can view their own student record" 
ON public.students 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own student record" 
ON public.students 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Keep admin policies as they are secure
-- (Admins can view all students and create students policies remain unchanged)

-- Update the search function to only return minimal, non-sensitive data for check-in
CREATE OR REPLACE FUNCTION public.search_student_for_checkin(search_term text)
RETURNS TABLE(student_id uuid, first_name text, last_name text, user_type text, grade text, high_school text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
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