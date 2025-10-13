-- Fix user_roles RLS by removing circular dependencies entirely
-- The key is to ONLY allow users to read their own role, nothing more in the policy

-- Disable RLS temporarily
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "authenticated_users_read_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "admins_read_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_manage_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_select_own_role" ON public.user_roles;
DROP POLICY IF EXISTS "admins_select_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_insert_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_update_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_delete_roles" ON public.user_roles;

-- Re-enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create ONE simple policy: users can only read their own role
-- This is the ONLY policy needed for the app to work
CREATE POLICY "select_own_role_only"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- For admin operations, we'll use SECURITY DEFINER functions instead of policies
-- This completely avoids the circular dependency

-- Update the has_role function to use SECURITY DEFINER properly
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role text)
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
      AND role::text = _role
  )
$$;

-- Update get_user_role to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS text
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Grant execute on these functions to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(UUID, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
