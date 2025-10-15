-- PART 1: Add super_admin role to the app_role enum
-- RUN THIS FIRST, then run PART 2 in a separate query

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- That's it for Part 1!
-- After running this, COMMIT the transaction, then run PART 2
