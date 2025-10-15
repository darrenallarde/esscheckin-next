-- Check all user roles in the system

-- See all roles assigned
SELECT
  u.email,
  ur.role,
  ur.created_at
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
ORDER BY u.email, ur.role;

-- Check specifically for dallarde and jeremy
SELECT
  u.email,
  ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN ('dallarde@echo.church', 'jeremy@echo.church', 'jeremylee@echo.church', 'jlee@echo.church')
ORDER BY u.email, ur.role;

-- Count roles by type
SELECT role, COUNT(*) as user_count
FROM public.user_roles
GROUP BY role
ORDER BY role;
