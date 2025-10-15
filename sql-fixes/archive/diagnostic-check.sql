-- Run this in production to diagnose the check-in issue

-- 1. Check if checkin_student function exists
SELECT
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'checkin_student';

-- 2. Check if profile_pin column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name = 'profile_pin';

-- 3. Check if generate_profile_pin function exists
SELECT proname as function_name
FROM pg_proc
WHERE proname = 'generate_profile_pin';

-- 4. Check recent check-ins count
SELECT COUNT(*) as total_checkins
FROM check_ins;

-- 5. Check today's check-ins
SELECT COUNT(*) as today_checkins
FROM check_ins
WHERE checked_in_at::DATE = CURRENT_DATE;
