-- Add new columns to students table
ALTER TABLE public.students 
ADD COLUMN date_of_birth DATE,
ADD COLUMN instagram_handle TEXT,
ADD COLUMN user_type TEXT NOT NULL DEFAULT 'student' CHECK (user_type IN ('student', 'student_leader'));

-- Make grade, high_school, parent_name, and parent_phone nullable for student leaders
ALTER TABLE public.students 
ALTER COLUMN grade DROP NOT NULL,
ALTER COLUMN high_school DROP NOT NULL,
ALTER COLUMN parent_name DROP NOT NULL,
ALTER COLUMN parent_phone DROP NOT NULL;