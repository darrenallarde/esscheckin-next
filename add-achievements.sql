-- Add new achievements to the process_checkin_rewards function

CREATE OR REPLACE FUNCTION process_checkin_rewards(
  p_student_id uuid,
  p_check_in_id uuid
)
RETURNS jsonb
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
  v_total_points_awarded integer := 0;
  v_achievements jsonb := '[]'::jsonb;
  v_rank_info record;
  v_result jsonb;
  v_check_in_time_minutes integer;
  v_profile_complete boolean;
  v_has_parent_info boolean;
  v_current_streak integer;
  v_last_checkin_date date;
  v_weeks_since_last integer;
  v_checkins_this_week record;
  v_sunday_wednesday_count integer;
BEGIN
  -- Get student info
  SELECT * INTO v_student
  FROM public.students
  WHERE id = p_student_id;

  -- Get check-in info
  SELECT * INTO v_check_in
  FROM public.check_ins
  WHERE id = p_check_in_id;

  -- Get total check-ins for this student
  SELECT COUNT(*) INTO v_total_check_ins
  FROM public.check_ins
  WHERE student_id = p_student_id;

  -- Determine if first time
  v_is_first_time := (v_total_check_ins = 1);

  -- Check if student leader
  v_is_student_leader := (v_student.user_type = 'student_leader');

  -- Get check-in time details
  v_check_in_hour := EXTRACT(hour FROM v_check_in.checked_in_at);
  v_check_in_minute := EXTRACT(minute FROM v_check_in.checked_in_at);
  v_check_in_day := EXTRACT(dow FROM v_check_in.checked_in_at);

  -- Convert to total minutes for easier comparison (6:30 PM = 18:30 = 1110 minutes)
  v_check_in_time_minutes := (v_check_in_hour * 60) + v_check_in_minute;

  -- Check profile completeness (grade, phone, instagram)
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

  -- Get last check-in date before this one
  SELECT MAX(DATE(checked_in_at)) INTO v_last_checkin_date
  FROM public.check_ins
  WHERE student_id = p_student_id AND id != p_check_in_id;

  -- Calculate weeks since last check-in
  IF v_last_checkin_date IS NOT NULL THEN
    v_weeks_since_last := FLOOR(EXTRACT(days FROM (DATE(v_check_in.checked_in_at) - v_last_checkin_date)) / 7);
  ELSE
    v_weeks_since_last := 0;
  END IF;

  -- Check for Sunday AND Wednesday this week
  SELECT COUNT(DISTINCT EXTRACT(dow FROM checked_in_at)) INTO v_sunday_wednesday_count
  FROM public.check_ins
  WHERE student_id = p_student_id
    AND DATE_TRUNC('week', checked_in_at) = DATE_TRUNC('week', v_check_in.checked_in_at)
    AND EXTRACT(dow FROM checked_in_at) IN (0, 3);

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
    PERFORM award_points(
      p_student_id,
      50,
      'first_time_bonus',
      'First time check-in bonus',
      p_check_in_id
    );
    v_total_points_awarded := v_total_points_awarded + 50;
  END IF;

  -- Student leader bonus
  IF v_is_student_leader THEN
    PERFORM award_points(
      p_student_id,
      15,
      'student_leader_bonus',
      'Student leader bonus',
      p_check_in_id
    );
    v_total_points_awarded := v_total_points_awarded + 15;
  END IF;

  -- Early bird bonus: before 6:30 PM (1110 minutes)
  IF v_check_in_time_minutes < 1110 THEN
    PERFORM award_points(
      p_student_id,
      25,
      'early_bird_bonus',
      'Early bird bonus (before 6:30 PM)',
      p_check_in_id
    );
    v_total_points_awarded := v_total_points_awarded + 25;
  END IF;

  -- Day-based bonuses
  IF v_check_in_day = 0 THEN -- Sunday
    PERFORM award_points(
      p_student_id,
      10,
      'weekend_warrior_bonus',
      'Weekend warrior bonus (Sunday)',
      p_check_in_id
    );
    v_total_points_awarded := v_total_points_awarded + 10;
  ELSIF v_check_in_day = 3 THEN -- Wednesday
    PERFORM award_points(
      p_student_id,
      10,
      'midweek_hero_bonus',
      'Midweek hero bonus (Wednesday)',
      p_check_in_id
    );
    v_total_points_awarded := v_total_points_awarded + 10;
  END IF;

  -- ==================== ACHIEVEMENTS ====================

  -- First check-in
  IF v_is_first_time THEN
    IF unlock_achievement(
      p_student_id,
      'first_checkin',
      'Welcome to the Family!',
      'Your very first check-in',
      '🎉',
      50,
      'common'
    ) THEN
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

  -- Digital Disciple - Complete profile
  IF v_profile_complete THEN
    IF unlock_achievement(
      p_student_id,
      'digital_disciple',
      'Digital Disciple',
      'Complete 100% of your profile',
      '📱',
      75,
      'rare'
    ) THEN
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

  -- Family Ties - Parent info
  IF v_has_parent_info THEN
    IF unlock_achievement(
      p_student_id,
      'family_ties',
      'Family Ties',
      'Add parent/guardian contact info',
      '👨‍👩‍👧‍👦',
      50,
      'common'
    ) THEN
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

  -- Faithful Forty - 40 check-ins
  IF v_total_check_ins >= 40 THEN
    IF unlock_achievement(
      p_student_id,
      'faithful_forty',
      'Faithful Forty',
      '40 total check-ins (biblical number)',
      '✝️',
      200,
      'epic'
    ) THEN
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

  -- Century Club - 100 check-ins
  IF v_total_check_ins >= 100 THEN
    IF unlock_achievement(
      p_student_id,
      'century_club',
      'Century Club',
      '100 total check-ins',
      '💯',
      500,
      'legendary'
    ) THEN
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

  -- The Comeback Kid - Return after 3+ weeks
  IF v_weeks_since_last >= 3 AND NOT v_is_first_time THEN
    IF unlock_achievement(
      p_student_id,
      'comeback_kid',
      'The Comeback Kid',
      'Return after missing 3+ weeks',
      '🔄',
      100,
      'rare'
    ) THEN
      v_achievements := v_achievements || jsonb_build_object(
        'id', 'comeback_kid',
        'title', 'The Comeback Kid',
        'description', 'Return after missing 3+ weeks',
        'emoji', '🔄',
        'points', 100,
        'rarity', 'rare'
      );
    END IF;
  END IF;

  -- Night Owl - Check in after 7:30 PM (1170 minutes)
  IF v_check_in_time_minutes >= 1170 THEN
    IF unlock_achievement(
      p_student_id,
      'night_owl',
      'Night Owl',
      'Check in after 7:30 PM',
      '🦉',
      25,
      'common'
    ) THEN
      v_achievements := v_achievements || jsonb_build_object(
        'id', 'night_owl',
        'title', 'Night Owl',
        'description', 'Check in after 7:30 PM',
        'emoji', '🦉',
        'points', 25,
        'rarity', 'common'
      );
    END IF;
  END IF;

  -- Dynamic Duo - Sunday AND Wednesday same week
  IF v_sunday_wednesday_count = 2 THEN
    IF unlock_achievement(
      p_student_id,
      'dynamic_duo',
      'Dynamic Duo',
      'Check in both Sunday AND Wednesday same week',
      '⚡',
      150,
      'epic'
    ) THEN
      v_achievements := v_achievements || jsonb_build_object(
        'id', 'dynamic_duo',
        'title', 'Dynamic Duo',
        'description', 'Check in both Sunday AND Wednesday same week',
        'emoji', '⚡',
        'points', 150,
        'rarity', 'epic'
      );
    END IF;
  END IF;

  -- Build result
  v_result := jsonb_build_object(
    'points_awarded', v_total_points_awarded,
    'total_points', v_rank_info.new_total_points,
    'rank_changed', v_rank_info.rank_changed,
    'current_rank', v_rank_info.new_rank,
    'achievements', v_achievements,
    'is_first_time', v_is_first_time
  );

  RETURN v_result;
END;
$$;
