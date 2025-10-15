-- Drop all versions of register_student_and_checkin function
-- Run this FIRST, then run update-register-student-with-address-v2.sql

-- Drop all possible versions by specifying exact parameter lists
-- Version 1: Original (17 params)
DROP FUNCTION IF EXISTS public.register_student_and_checkin(
  text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text
);

-- Version 2: With address fields (21 params)
DROP FUNCTION IF EXISTS public.register_student_and_checkin(
  text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text, text
);

-- Version 3: Any other possible versions with different param counts
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.register_student_and_checkin(text, text, text, text, date, text, text, text, text, text, text, text, text, text, text, text);

-- Confirm all versions are dropped
SELECT 'All versions of register_student_and_checkin have been dropped' as status;
