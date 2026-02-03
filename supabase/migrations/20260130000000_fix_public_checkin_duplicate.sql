-- Fix checkin_student_public to handle "already checked in today" gracefully
-- Instead of throwing a constraint violation error, return a friendly message

-- Drop the existing function first (had different return type)
DROP FUNCTION IF EXISTS public.checkin_student_public(TEXT, UUID, UUID);

CREATE OR REPLACE FUNCTION public.checkin_student_public(
  p_org_slug TEXT,
  p_student_id UUID,
  p_device_id UUID DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  first_name TEXT,
  user_type TEXT,
  check_in_id UUID,
  profile_pin TEXT,
  points_earned INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_student_record RECORD;
  v_existing_checkin_id UUID;
  v_new_checkin_id UUID;
  v_points INTEGER := 0;
BEGIN
  -- Get organization ID from slug
  SELECT id INTO v_org_id
  FROM public.organizations
  WHERE slug = p_org_slug AND status = 'active';

  IF v_org_id IS NULL THEN
    RETURN QUERY SELECT
      FALSE,
      'Organization not found'::TEXT,
      ''::TEXT,
      ''::TEXT,
      NULL::UUID,
      NULL::TEXT,
      0;
    RETURN;
  END IF;

  -- Get student info and verify they belong to this org
  SELECT s.id, s.first_name, s.user_type, s.profile_pin, s.organization_id
  INTO v_student_record
  FROM public.students s
  WHERE s.id = p_student_id AND s.organization_id = v_org_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE,
      'Student not found in this organization'::TEXT,
      ''::TEXT,
      ''::TEXT,
      NULL::UUID,
      NULL::TEXT,
      0;
    RETURN;
  END IF;

  -- Check if already checked in today
  SELECT ci.id INTO v_existing_checkin_id
  FROM public.check_ins ci
  WHERE ci.student_id = p_student_id
    AND ci.organization_id = v_org_id
    AND date_trunc('day', ci.checked_in_at) = date_trunc('day', NOW());

  IF v_existing_checkin_id IS NOT NULL THEN
    -- Already checked in - return success with friendly message
    RETURN QUERY SELECT
      TRUE,
      'Already checked in today'::TEXT,
      v_student_record.first_name,
      v_student_record.user_type,
      v_existing_checkin_id,
      v_student_record.profile_pin,
      0; -- No points for duplicate check-in
    RETURN;
  END IF;

  -- Create new check-in
  INSERT INTO public.check_ins (student_id, organization_id, device_id, checked_in_at)
  VALUES (p_student_id, v_org_id, p_device_id, NOW())
  RETURNING id INTO v_new_checkin_id;

  -- Award points (simple: 10 points per check-in)
  v_points := 10;

  -- Update game stats if they exist
  UPDATE public.student_game_stats
  SET
    total_points = total_points + v_points,
    current_streak = current_streak + 1,
    last_checkin_at = NOW()
  WHERE student_id = p_student_id;

  -- If no game stats row, create one
  IF NOT FOUND THEN
    INSERT INTO public.student_game_stats (student_id, total_points, current_streak, last_checkin_at)
    VALUES (p_student_id, v_points, 1, NOW())
    ON CONFLICT (student_id) DO UPDATE
    SET
      total_points = student_game_stats.total_points + v_points,
      current_streak = student_game_stats.current_streak + 1,
      last_checkin_at = NOW();
  END IF;

  -- Return success
  RETURN QUERY SELECT
    TRUE,
    'Check-in successful'::TEXT,
    v_student_record.first_name,
    v_student_record.user_type,
    v_new_checkin_id,
    v_student_record.profile_pin,
    v_points;
END;
$$;

-- Grant execute to anon for public check-in
GRANT EXECUTE ON FUNCTION public.checkin_student_public(TEXT, UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.checkin_student_public(TEXT, UUID, UUID) TO authenticated;
