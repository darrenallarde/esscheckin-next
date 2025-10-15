-- Add super_admin role to dallarde@echo.church
-- NOTE: This KEEPS existing roles (like student_leader) and ADDS super_admin

-- Check current roles:
SELECT ur.user_id, u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'dallarde@echo.church';

-- Add super_admin role (keeps other roles intact)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::public.app_role
FROM auth.users
WHERE email = 'dallarde@echo.church'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify all roles (should see both student_leader AND super_admin):
SELECT ur.user_id, u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'dallarde@echo.church'
ORDER BY ur.role;
