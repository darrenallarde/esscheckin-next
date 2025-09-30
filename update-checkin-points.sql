-- Update the process_checkin_rewards function with new point structure
-- Early bird: before 6:30 PM = +25 points
-- Normal: after 6:30 PM = +15 points

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
  v_base_points integer := 15; -- Changed from 10 to 15
  v_total_points_awarded integer := 0;
  v_achievements jsonb := '[]'::jsonb;
  v_rank_info record;
  v_result jsonb;
  v_check_in_time_minutes integer;
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
  v_check_in_day := EXTRACT(dow FROM v_check_in.checked_in_at); -- 0=Sunday, 3=Wednesday

  -- Convert to total minutes for easier comparison (6:30 PM = 18:30 = 1110 minutes)
  v_check_in_time_minutes := (v_check_in_hour * 60) + v_check_in_minute;

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

  -- Early bird bonus: before 6:30 PM (18:30 = 1110 minutes)
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

  -- Check for achievements
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
