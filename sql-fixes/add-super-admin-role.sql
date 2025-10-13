-- Add super_admin role to the app_role enum
ALTER TYPE public.app_role ADD VALUE 'super_admin';

-- Update has_role function to work with super_admin
-- (No changes needed - it already works with any role)

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

-- Comment: To promote a user to super_admin, run:
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('<user-uuid>', 'super_admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
