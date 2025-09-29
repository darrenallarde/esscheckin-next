-- Add admin role for the authenticated user
INSERT INTO public.user_roles (user_id, role) 
VALUES ('50532a02-3804-4204-b356-db0adfc50a6b', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;