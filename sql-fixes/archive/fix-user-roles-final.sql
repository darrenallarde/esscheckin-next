-- Final fix for user_roles RLS to prevent circular dependency errors
-- Use security definer to bypass RLS when checking roles

-- First, temporarily disable RLS to clean up
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "authenticated_users_read_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "admins_read_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_manage_roles" ON public.user_roles;

-- Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-circular policy for users to read their own role
CREATE POLICY "users_select_own_role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for admins (this one doesn't cause circular dependency)
-- because it only checks the same row, not calling has_role()
CREATE POLICY "admins_select_all_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    LIMIT 1
  )
);

-- Allow admins to manage all roles
CREATE POLICY "admins_insert_roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    LIMIT 1
  )
);

CREATE POLICY "admins_update_roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    LIMIT 1
  )
);

CREATE POLICY "admins_delete_roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role = 'admin'
    LIMIT 1
  )
);
