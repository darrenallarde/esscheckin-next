-- Fix process_checkin_rewards function - correct PERFORM usage
DROP FUNCTION IF EXISTS process_checkin_rewards(uuid, uuid);

CREATE OR REPLACE FUNCTION process_checkin_rewards(
  p_student_id uuid,
  p_check_in_id uuid
)
RETURNS jsonb
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_student record;
  v_check_in record;
  v_total_check_ins integer;
  v_is_first_time boolean;
  v_is_student_leader boolean;
  v_check_in_hour integer;
  v_check_in_minute integer;
  v_check_in_day integer;
  v_base_points integer := 15;
  v_check_in_time_minutes integer;
  v_profile_complete boolean;
  v_has_parent_info boolean;
  v_total_points_awarded integer := 0;
  v_achievements jsonb := '[]'::jsonb;
  v_rank_info record;
  v_result jsonb;
  v_dummy record;
BEGIN
  -- Get student info
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;
  v_is_student_leader := (v_student.user_type = 'student_leader');

  -- Get check-in info
  SELECT * INTO v_check_in FROM public.check_ins WHERE id = p_check_in_id;
  
  -- Get total check-ins for this student
  SELECT COUNT(*) INTO v_total_check_ins FROM public.check_ins WHERE student_id = p_student_id;
  v_is_first_time := (v_total_check_ins = 1);

  -- Extract time components
  v_check_in_hour := EXTRACT(hour FROM v_check_in.checked_in_at);
  v_check_in_minute := EXTRACT(minute FROM v_check_in.checked_in_at);
  v_check_in_day := EXTRACT(dow FROM v_check_in.checked_in_at);
  v_check_in_time_minutes := (v_check_in_hour * 60) + v_check_in_minute;

  -- Check profile completeness
  v_profile_complete := (
    v_student.grade IS NOT NULL AND v_student.grade != '' AND
    v_student.phone_number IS NOT NULL AND v_student.phone_number != '' AND
    v_student.instagram_handle IS NOT NULL AND v_student.instagram_handle != ''
  );

  -- Check parent info
  v_has_parent_info := (
    (v_student.mother_first_name IS NOT NULL OR v_student.father_first_name IS NOT NULL) AND
    (v_student.mother_phone IS NOT NULL OR v_student.father_phone IS NOT NULL)
  );

  -- Award base points
  SELECT * INTO v_rank_info
  FROM award_points(
    p_student_id,
    v_base_points,
    'base_checkin',
    'Base check-in points',
    p_check_in_id,
    jsonb_build_object('check_in_id', p_check_in_id)
  );
  v_total_points_awarded := v_total_points_awarded + v_base_points;

  -- First time bonus
  IF v_is_first_time THEN
    SELECT * INTO v_dummy FROM award_points(p_student_id, 50, 'first_time_bonus', 'First time check-in bonus', p_check_in_id);
    v_total_points_awarded := v_total_points_awarded + 50;
  END IF;

  -- Student leader bonus
  IF v_is_student_leader THEN
    SELECT * INTO v_dummy FROM award_points(p_student_id, 15, 'student_leader_bonus', 'Student leader bonus', p_check_in_id);
    v_total_points_awarded := v_total_points_awarded + 15;
  END IF;

  -- Early bird bonus: before 6:30 PM (1110 minutes)
  IF v_check_in_time_minutes < 1110 THEN
    SELECT * INTO v_dummy FROM award_points(p_student_id, 25, 'early_bird_bonus', 'Early bird bonus (before 6:30 PM)', p_check_in_id);
    v_total_points_awarded := v_total_points_awarded + 25;
  END IF;

  -- ==================== ACHIEVEMENTS ====================

  -- First check-in
  IF v_is_first_time THEN
    IF unlock_achievement(p_student_id, 'first_checkin', 'Welcome to the Family!', 'Your very first check-in', '🎉', 50, 'common') THEN
      v_achievements := v_achievements || jsonb_build_object(
        'id', 'first_checkin',
        'title', 'Welcome to the Family!',
        'description', 'Your very first check-in',
        'emoji', '🎉',
        'points', 50,
        'rarity', 'common'
      );
    END IF;
  END IF;

  -- Digital Disciple
  IF v_profile_complete THEN
    IF unlock_achievement(p_student_id, 'digital_disciple', 'Digital Disciple', 'Complete 100% of your profile', '📱', 75, 'rare') THEN
      v_achievements := v_achievements || jsonb_build_object(
        'id', 'digital_disciple',
        'title', 'Digital Disciple',
        'description', 'Complete 100% of your profile',
        'emoji', '📱',
        'points', 75,
        'rarity', 'rare'
      );
    END IF;
  END IF;

  -- Family Ties
  IF v_has_parent_info THEN
    IF unlock_achievement(p_student_id, 'family_ties', 'Family Ties', 'Add parent/guardian contact info', '👨‍👩‍👧‍👦', 50, 'common') THEN
      v_achievements := v_achievements || jsonb_build_object(
        'id', 'family_ties',
        'title', 'Family Ties',
        'description', 'Add parent/guardian contact info',
        'emoji', '👨‍👩‍👧‍👦',
        'points', 50,
        'rarity', 'common'
      );
    END IF;
  END IF;

  -- Faithful Forty
  IF v_total_check_ins >= 40 THEN
    IF unlock_achievement(p_student_id, 'faithful_forty', 'Faithful Forty', '40 total check-ins (biblical number)', '✝️', 200, 'epic') THEN
      v_achievements := v_achievements || jsonb_build_object(
        'id', 'faithful_forty',
        'title', 'Faithful Forty',
        'description', '40 total check-ins (biblical number)',
        'emoji', '✝️',
        'points', 200,
        'rarity', 'epic'
      );
    END IF;
  END IF;

  -- Century Club
  IF v_total_check_ins >= 100 THEN
    IF unlock_achievement(p_student_id, 'century_club', 'Century Club', '100 total check-ins', '💯', 500, 'legendary') THEN
      v_achievements := v_achievements || jsonb_build_object(
        'id', 'century_club',
        'title', 'Century Club',
        'description', '100 total check-ins',
        'emoji', '💯',
        'points', 500,
        'rarity', 'legendary'
      );
    END IF;
  END IF;

  -- Get final rank info
  SELECT * INTO v_rank_info
  FROM public.student_game_stats
  WHERE student_id = p_student_id;

  -- Build result
  v_result := jsonb_build_object(
    'points_awarded', v_total_points_awarded,
    'total_points', v_rank_info.total_points,
    'rank_changed', false,
    'current_rank', v_rank_info.current_rank,
    'achievements', v_achievements,
    'is_first_time', v_is_first_time
  );

  RETURN v_result;
END;
$$;
