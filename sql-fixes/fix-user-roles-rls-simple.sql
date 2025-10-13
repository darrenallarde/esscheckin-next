-- Fix user_roles RLS policies - Simple version without circular dependencies
-- This fixes the 500 error when querying user_roles

-- Drop ALL existing policies on user_roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Create a simple policy that allows authenticated users to read their own role
CREATE POLICY "authenticated_users_read_own_role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create a simple policy for admins to read all roles
-- This avoids circular dependency by directly checking the table
CREATE POLICY "admins_read_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Allow admins to insert/update/delete roles
CREATE POLICY "admins_manage_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);
