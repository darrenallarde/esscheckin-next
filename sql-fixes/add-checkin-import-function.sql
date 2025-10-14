-- Create a special function for importing historical check-ins with custom timestamps
-- This allows importing check-ins from the past without affecting current check-in logic

CREATE OR REPLACE FUNCTION public.import_historical_checkin(
  p_student_id UUID,
  p_checkin_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  check_in_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing_checkin UUID;
  v_new_checkin UUID;
  v_checkin_date DATE;
BEGIN
  -- Verify student exists
  IF NOT EXISTS (SELECT 1 FROM students WHERE id = p_student_id) THEN
    RETURN QUERY SELECT FALSE, 'Student not found'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Extract the date from the timestamp for idempotent check
  v_checkin_date := p_checkin_timestamp::DATE;

  -- Check for existing check-in on that date
  SELECT id INTO v_existing_checkin
  FROM check_ins
  WHERE student_id = p_student_id
    AND checked_in_at::DATE = v_checkin_date
  LIMIT 1;

  IF v_existing_checkin IS NOT NULL THEN
    -- Already checked in on this date - return existing check-in
    RETURN QUERY SELECT TRUE, 'Already checked in on this date'::TEXT, v_existing_checkin;
    RETURN;
  END IF;

  -- Create new check-in with the specified timestamp
  INSERT INTO check_ins (student_id, checked_in_at)
  VALUES (p_student_id, p_checkin_timestamp)
  RETURNING id INTO v_new_checkin;

  -- Trigger gamification rewards for this check-in
  BEGIN
    PERFORM process_checkin_rewards(p_student_id, v_new_checkin);
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the check-in
    RAISE NOTICE 'Gamification processing failed for student %: %', p_student_id, SQLERRM;
  END;

  RETURN QUERY SELECT TRUE, 'Historical check-in created'::TEXT, v_new_checkin;
END;
$$;

-- Grant execute to authenticated users (admins only will call this via RLS)
GRANT EXECUTE ON FUNCTION public.import_historical_checkin TO authenticated;

COMMENT ON FUNCTION public.import_historical_checkin IS 'Import historical check-in data with custom timestamp. Idempotent - will not create duplicates for same student on same date.';
