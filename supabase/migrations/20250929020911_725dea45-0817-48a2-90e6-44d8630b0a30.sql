-- Create admin user in auth.users and assign admin role
-- Note: This creates a user in the auth system that can be used for login

-- First, we need to check if we can insert directly into auth.users
-- Since we can't directly insert into auth.users via SQL migration,
-- we'll create a function to handle admin user setup

-- Create a temporary function to help set up admin user
CREATE OR REPLACE FUNCTION setup_admin_user()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if admin user already exists in user_roles
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE role = 'admin'
  ) THEN
    RETURN 'Admin user already exists';
  END IF;
  
  -- Return instructions for manual setup
  RETURN 'Please sign up with email: admin@echo.church and password: admin, then we will assign admin role automatically';
END;
$$;

-- Update the handle_new_user function to automatically make admin@echo.church an admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert default role as student
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  
  -- Check if this user should be an admin based on email
  IF NEW.email = 'admin@echo.church' THEN
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.id;
  END IF;
  
  -- Keep the phone-based admin check for backwards compatibility
  IF NEW.phone = '650.346.5544' THEN
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Run the setup function to get instructions
SELECT setup_admin_user();

-- Clean up the temporary function
DROP FUNCTION setup_admin_user();