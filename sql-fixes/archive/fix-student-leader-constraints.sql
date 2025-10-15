-- Fix NOT NULL constraints for student leader support
-- This allows student_leader user type to have NULL values for student-specific fields

ALTER TABLE public.students
ALTER COLUMN grade DROP NOT NULL,
ALTER COLUMN high_school DROP NOT NULL,
ALTER COLUMN parent_name DROP NOT NULL,
ALTER COLUMN parent_phone DROP NOT NULL;
