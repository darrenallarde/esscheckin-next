-- Auto-grant admin role to approved email addresses
-- Run this in Supabase SQL Editor

-- Create function to auto-grant admin role on signup
CREATE OR REPLACE FUNCTION public.auto_grant_admin_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Add approved admin emails here
  IF NEW.email IN (
    'dallarde@echo.church',
    'szeier@echo.church'
  ) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_grant_admin ON auth.users;
CREATE TRIGGER on_auth_user_created_grant_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grant_admin_role();

-- Also grant admin to these users if they already exist
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users
WHERE email IN ('dallarde@echo.church', 'szeier@echo.church')
ON CONFLICT (user_id, role) DO NOTHING;
