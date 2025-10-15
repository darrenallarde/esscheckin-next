-- Step 1: Show duplicate check-ins BEFORE cleanup
-- This will tell you who has checked in multiple times per day

DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'CHECKING FOR DUPLICATE CHECK-INS';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE '';

  -- Count total duplicates
  SELECT COUNT(*) INTO v_duplicate_count
  FROM (
    SELECT student_id, checked_in_at::DATE
    FROM check_ins
    GROUP BY student_id, checked_in_at::DATE
    HAVING COUNT(*) > 1
  ) dupes;

  IF v_duplicate_count = 0 THEN
    RAISE NOTICE '✅ No duplicate check-ins found! Database is clean.';
    RETURN;
  END IF;

  RAISE NOTICE 'Found % students with duplicate check-ins on same day', v_duplicate_count;
  RAISE NOTICE '';
END $$;

-- Show the duplicate check-ins with details
SELECT
  DATE(ci.checked_in_at) as date,
  s.first_name,
  s.last_name,
  COUNT(*) as check_in_count,
  STRING_AGG(
    TO_CHAR(ci.checked_in_at, 'HH12:MI AM'),
    ', '
    ORDER BY ci.checked_in_at
  ) as check_in_times
FROM check_ins ci
JOIN students s ON ci.student_id = s.id
GROUP BY DATE(ci.checked_in_at), ci.student_id, s.first_name, s.last_name
HAVING COUNT(*) > 1
ORDER BY date DESC, check_in_count DESC;

-- Step 2: Clean up duplicates (keeps earliest check-in per student per day)
-- UNCOMMENT THE SECTION BELOW TO ACTUALLY DELETE DUPLICATES

/*
DO $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'CLEANING UP DUPLICATE CHECK-INS';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE '';

  -- Delete duplicates, keeping only the earliest check-in per student per day
  WITH duplicates AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, checked_in_at::DATE
        ORDER BY checked_in_at ASC  -- Keep the EARLIEST check-in
      ) as row_num
    FROM check_ins
  )
  DELETE FROM check_ins
  WHERE id IN (
    SELECT id FROM duplicates WHERE row_num > 1
  );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RAISE NOTICE '✅ Deleted % duplicate check-in records', v_deleted_count;
  RAISE NOTICE '✅ Kept the earliest check-in for each student per day';
  RAISE NOTICE '';
END $$;
*/

-- Step 3: Verify the idempotent checkin_student function is deployed
-- This function should prevent duplicates at the application level

DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_has_idempotent_check BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE 'VERIFYING IDEMPOTENT CHECKIN FUNCTION';
  RAISE NOTICE '==================================================================';
  RAISE NOTICE '';

  -- Check if the function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'checkin_student'
  ) INTO v_function_exists;

  IF NOT v_function_exists THEN
    RAISE WARNING '❌ checkin_student function does not exist!';
    RAISE NOTICE 'You need to apply: sql-fixes/fix-idempotent-simple.sql';
    RETURN;
  END IF;

  -- Check if the function has the idempotent logic (looks for the check for existing check-in)
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'checkin_student'
      AND pg_get_functiondef(p.oid) LIKE '%checked_in_at::DATE = CURRENT_DATE%'
  ) INTO v_has_idempotent_check;

  IF NOT v_has_idempotent_check THEN
    RAISE WARNING '❌ checkin_student function exists but does NOT have idempotent check!';
    RAISE NOTICE 'You need to apply: sql-fixes/fix-idempotent-simple.sql';
    RAISE NOTICE 'This will update the function to prevent duplicate check-ins';
  ELSE
    RAISE NOTICE '✅ checkin_student function is idempotent (prevents duplicates)';
    RAISE NOTICE '';
    RAISE NOTICE 'The function should be preventing new duplicates.';
    RAISE NOTICE 'Existing duplicates in database are from before the fix was applied.';
  END IF;

  RAISE NOTICE '';
END $$;
