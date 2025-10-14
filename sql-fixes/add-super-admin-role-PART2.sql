-- PART 2: Update functions and policies to use super_admin
-- RUN THIS AFTER running PART 1 and committing that transaction

-- Create helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Update RLS policies to grant super_admin full access
-- Super admins can view all students
DROP POLICY IF EXISTS "Admins can view all students" ON public.students;
CREATE POLICY "Admins can view all students"
ON public.students
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can edit any student
DROP POLICY IF EXISTS "Students can update their own record" ON public.students;
CREATE POLICY "Students can update their own record"
ON public.students
FOR UPDATE
USING (
  auth.email() = email OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can view all roles
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can update roles
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can view all check-ins
DROP POLICY IF EXISTS "Admins can view all check-ins" ON public.check_ins;
CREATE POLICY "Admins can view all check-ins"
ON public.check_ins
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can create check-ins
DROP POLICY IF EXISTS "Admins can create check-ins" ON public.check_ins;
CREATE POLICY "Admins can create check-ins"
ON public.check_ins
FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can manage curriculum
DROP POLICY IF EXISTS "Admins can manage curriculum" ON public.curriculum_weeks;
CREATE POLICY "Admins can manage curriculum"
ON public.curriculum_weeks
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can manage extended profiles
DROP POLICY IF EXISTS "Admins can manage extended profiles" ON public.student_profiles_extended;
CREATE POLICY "Admins can manage extended profiles"
ON public.student_profiles_extended
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Super admins can manage AI recommendations
DROP POLICY IF EXISTS "Admins can manage recommendations" ON public.ai_recommendations;
CREATE POLICY "Admins can manage recommendations"
ON public.ai_recommendations
FOR ALL
USING (
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Done! Super admin role is now fully configured
