-- Create user roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
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
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- Update students table RLS policies for new auth system
DROP POLICY IF EXISTS "Students are publicly readable" ON public.students;
DROP POLICY IF EXISTS "Students can be created publicly" ON public.students;

-- New secure policies for students table
CREATE POLICY "Admins can view all students" 
ON public.students 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can view their own record" 
ON public.students 
FOR SELECT 
USING (auth.uid()::text = phone_number OR auth.email() = email);

CREATE POLICY "Admins can create students" 
ON public.students 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Students can update their own record" 
ON public.students 
FOR UPDATE 
USING (auth.uid()::text = phone_number OR auth.email() = email);

-- Update check_ins table RLS policies
DROP POLICY IF EXISTS "Check-ins are publicly readable" ON public.check_ins;
DROP POLICY IF EXISTS "Check-ins can be created publicly" ON public.check_ins;

CREATE POLICY "Admins can view all check-ins" 
ON public.check_ins 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create check-ins" 
ON public.check_ins 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Promote user with phone number 650.346.5544 to admin
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Find user by phone number in students table
    SELECT s.phone_number INTO admin_user_id
    FROM public.students s
    WHERE s.phone_number = '650.346.5544'
    LIMIT 1;
    
    -- If found, we'll promote them when they sign up
    -- For now, just ensure the role system is ready
END $$;

-- Trigger to automatically assign student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY definer SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'student');
  
  -- Check if this user should be an admin based on phone number
  IF NEW.phone = '650.346.5544' THEN
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();