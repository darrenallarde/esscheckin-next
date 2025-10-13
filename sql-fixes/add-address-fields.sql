-- Add address fields to students table
-- Run this migration to add address, city, state, and zip columns

ALTER TABLE public.students
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'California',
ADD COLUMN IF NOT EXISTS zip TEXT;

-- Add comment
COMMENT ON COLUMN public.students.address IS 'Street address';
COMMENT ON COLUMN public.students.city IS 'City';
COMMENT ON COLUMN public.students.state IS 'State (defaults to California)';
COMMENT ON COLUMN public.students.zip IS 'ZIP/Postal code';
