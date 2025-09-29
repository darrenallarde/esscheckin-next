-- Update Jeremy Lee to be a student leader
UPDATE public.students 
SET user_type = 'student_leader' 
WHERE first_name = 'Jeremy' AND last_name = 'Lee';

-- Update Darren Allarde to be a student leader  
UPDATE public.students 
SET user_type = 'student_leader' 
WHERE first_name = 'Darren' AND last_name = 'Allarde';

-- Also update their user roles if they have auth accounts
UPDATE public.user_roles 
SET role = 'student_leader'
WHERE user_id IN (
  SELECT user_id 
  FROM public.students 
  WHERE (first_name = 'Jeremy' AND last_name = 'Lee') 
     OR (first_name = 'Darren' AND last_name = 'Allarde')
  AND user_id IS NOT NULL
);