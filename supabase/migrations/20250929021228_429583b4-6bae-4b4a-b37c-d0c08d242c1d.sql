-- Update the handle_new_user function to make dallarde@echo.church the admin
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
  IF NEW.email = 'dallarde@echo.church' THEN
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