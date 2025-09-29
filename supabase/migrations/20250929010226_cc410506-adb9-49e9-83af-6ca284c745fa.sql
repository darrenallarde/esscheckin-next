-- Update Darren's student record with correct phone format and email
UPDATE students 
SET phone_number = '650.346.5544', 
    email = 'dallarde@echo.church',
    first_name = 'Darren',
    last_name = 'Allarde'
WHERE id = '006f8cee-24db-4979-9607-afe900fd5d66';

-- Create admin role for Darren
-- First, we need to get the auth user_id that matches this profile
-- Since the system is designed around phone/email matching, we'll need to handle this differently

-- For now, let's create a manual admin role entry
-- Note: This will be properly linked when the user signs up with the matching phone/email
INSERT INTO user_roles (user_id, role) 
SELECT id, 'admin'::app_role 
FROM auth.users 
WHERE phone = '650.346.5544' OR email = 'dallarde@echo.church'
ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin'::app_role;