-- Add unique constraint to prevent multiple check-ins per student per day
-- This enforces idempotency at the database level

-- Step 1: Clean up any existing duplicate check-ins (keep earliest check-in per student per day)
DO $$
DECLARE
  v_duplicates_removed INTEGER := 0;
BEGIN
  -- Find and delete duplicate check-ins, keeping only the earliest one per student per day
  WITH duplicates AS (
    SELECT
      id,
      student_id,
      checked_in_at,
      checked_in_at::DATE as check_date,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, checked_in_at::DATE
        ORDER BY checked_in_at ASC
      ) as row_num
    FROM check_ins
  )
  DELETE FROM check_ins
  WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
  );

  GET DIAGNOSTICS v_duplicates_removed = ROW_COUNT;
  RAISE NOTICE 'Removed % duplicate check-in records', v_duplicates_removed;
END $$;

-- Step 2: Create a unique index on (student_id, date) to prevent future duplicates
-- Using a functional index on the date part of checked_in_at
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_checkin_per_day
ON check_ins (student_id, (checked_in_at::DATE));

-- Add a comment explaining the constraint
COMMENT ON INDEX idx_unique_student_checkin_per_day IS
'Ensures each student can only check in once per day (idempotent check-ins)';

-- Verify the fix
DO $$
DECLARE
  v_total_checkins INTEGER;
  v_duplicate_days INTEGER;
BEGIN
  -- Check if there are any remaining duplicates
  SELECT COUNT(*) INTO v_duplicate_days
  FROM (
    SELECT student_id, checked_in_at::DATE, COUNT(*) as cnt
    FROM check_ins
    GROUP BY student_id, checked_in_at::DATE
    HAVING COUNT(*) > 1
  ) duplicates;

  SELECT COUNT(*) INTO v_total_checkins FROM check_ins;

  IF v_duplicate_days > 0 THEN
    RAISE WARNING 'Still found % days with duplicate check-ins after cleanup!', v_duplicate_days;
  ELSE
    RAISE NOTICE 'Success! All check-ins are now unique per student per day. Total check-ins: %', v_total_checkins;
  END IF;
END $$;
