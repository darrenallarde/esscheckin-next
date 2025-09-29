-- Gamification Database Functions
-- Functions to handle point awards, achievements, and game operations

-- Function to award points to a student
CREATE OR REPLACE FUNCTION award_points(
  p_student_id uuid,
  p_points integer,
  p_transaction_type text,
  p_description text DEFAULT NULL,
  p_check_in_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS TABLE(
  new_total_points integer,
  points_awarded integer,
  rank_changed boolean,
  new_rank text
)
LANGUAGE plpgsql AS $$
DECLARE
  v_current_stats record;
  v_new_total integer;
  v_old_rank text;
  v_new_rank text;
  v_rank_changed boolean := false;
BEGIN
  -- Get or create student stats
  SELECT * INTO v_current_stats
  FROM get_or_create_student_game_stats(p_student_id)
  LIMIT 1;

  -- Calculate new total
  v_new_total := v_current_stats.total_points + p_points;
  v_old_rank := v_current_stats.current_rank;

  -- Determine new rank based on points
  CASE
    WHEN v_new_total >= 2000 THEN v_new_rank := 'Legend';
    WHEN v_new_total >= 1000 THEN v_new_rank := 'Champion';
    WHEN v_new_total >= 600 THEN v_new_rank := 'Devoted';
    WHEN v_new_total >= 300 THEN v_new_rank := 'Committed';
    WHEN v_new_total >= 100 THEN v_new_rank := 'Regular';
    ELSE v_new_rank := 'Newcomer';
  END CASE;

  -- Check if rank changed
  v_rank_changed := (v_old_rank != v_new_rank);

  -- Update student game stats
  UPDATE public.student_game_stats
  SET
    total_points = v_new_total,
    current_rank = v_new_rank,
    last_points_update = now(),
    updated_at = now()
  WHERE student_id = p_student_id;

  -- Record the transaction
  INSERT INTO public.game_transactions (
    student_id,
    check_in_id,
    points_earned,
    transaction_type,
    description,
    metadata
  ) VALUES (
    p_student_id,
    p_check_in_id,
    p_points,
    p_transaction_type,
    p_description,
    p_metadata
  );

  -- Return results
  RETURN QUERY SELECT v_new_total, p_points, v_rank_changed, v_new_rank;
END;
$$;

-- Function to unlock an achievement for a student
CREATE OR REPLACE FUNCTION unlock_achievement(
  p_student_id uuid,
  p_achievement_id text,
  p_achievement_title text,
  p_achievement_description text,
  p_achievement_emoji text,
  p_points_awarded integer,
  p_rarity text DEFAULT 'common'
)
RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  v_already_unlocked boolean;
BEGIN
  -- Check if achievement already unlocked
  SELECT EXISTS(
    SELECT 1 FROM public.student_achievements
    WHERE student_id = p_student_id AND achievement_id = p_achievement_id
  ) INTO v_already_unlocked;

  -- If already unlocked, return false
  IF v_already_unlocked THEN
    RETURN false;
  END IF;

  -- Insert the achievement
  INSERT INTO public.student_achievements (
    student_id,
    achievement_id,
    achievement_title,
    achievement_description,
    achievement_emoji,
    points_awarded,
    rarity
  ) VALUES (
    p_student_id,
    p_achievement_id,
    p_achievement_title,
    p_achievement_description,
    p_achievement_emoji,
    p_points_awarded,
    p_rarity
  );

  -- Award points for the achievement
  PERFORM award_points(
    p_student_id,
    p_points_awarded,
    'achievement',
    'Achievement unlocked: ' || p_achievement_title,
    NULL,
    jsonb_build_object(
      'achievement_id', p_achievement_id,
      'achievement_title', p_achievement_title,
      'rarity', p_rarity
    )
  );

  RETURN true;
END;
$$;

-- Function to get student's complete game profile
CREATE OR REPLACE FUNCTION get_student_game_profile(p_student_id uuid)
RETURNS TABLE(
  student_id uuid,
  first_name text,
  last_name text,
  user_type text,
  total_points integer,
  current_rank text,
  achievements_count integer,
  recent_achievements jsonb,
  total_check_ins integer,
  last_check_in timestamp with time zone,
  wednesday_streak integer,
  sunday_streak integer,
  total_streak integer
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH student_info AS (
    SELECT
      s.id as student_id,
      s.first_name,
      s.last_name,
      s.user_type
    FROM public.students s
    WHERE s.id = p_student_id
  ),
  game_stats AS (
    SELECT
      sgs.total_points,
      sgs.current_rank
    FROM get_or_create_student_game_stats(p_student_id) sgs
    LIMIT 1
  ),
  achievement_info AS (
    SELECT
      COUNT(*) as achievements_count,
      jsonb_agg(
        jsonb_build_object(
          'id', sa.achievement_id,
          'title', sa.achievement_title,
          'emoji', sa.achievement_emoji,
          'points', sa.points_awarded,
          'rarity', sa.rarity,
          'unlocked_at', sa.unlocked_at
        ) ORDER BY sa.unlocked_at DESC
      ) FILTER (WHERE sa.id IS NOT NULL) as recent_achievements
    FROM public.student_achievements sa
    WHERE sa.student_id = p_student_id
  ),
  check_in_info AS (
    SELECT
      COUNT(*) as total_check_ins,
      MAX(ci.checked_in_at) as last_check_in
    FROM public.check_ins ci
    WHERE ci.student_id = p_student_id
  )
  SELECT
    si.student_id,
    si.first_name,
    si.last_name,
    si.user_type,
    COALESCE(gs.total_points, 0) as total_points,
    COALESCE(gs.current_rank, 'Newcomer') as current_rank,
    COALESCE(ai.achievements_count::integer, 0) as achievements_count,
    COALESCE(ai.recent_achievements, '[]'::jsonb) as recent_achievements,
    COALESCE(cii.total_check_ins::integer, 0) as total_check_ins,
    cii.last_check_in,
    0 as wednesday_streak, -- Will be calculated separately
    0 as sunday_streak,    -- Will be calculated separately
    0 as total_streak      -- Will be calculated separately
  FROM student_info si
  CROSS JOIN game_stats gs
  CROSS JOIN achievement_info ai
  CROSS JOIN check_in_info cii;
END;
$$;

-- Function to process a check-in and award appropriate points/achievements
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
  v_check_in_day integer;
  v_base_points integer := 10;
  v_total_points_awarded integer := 0;
  v_achievements jsonb := '[]'::jsonb;
  v_rank_info record;
  v_result jsonb;
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
  v_check_in_day := EXTRACT(dow FROM v_check_in.checked_in_at); -- 0=Sunday, 3=Wednesday

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

  -- Time-based bonuses
  IF v_check_in_hour < 18 THEN
    PERFORM award_points(
      p_student_id,
      20,
      'early_bird_bonus',
      'Early bird bonus (before 6 PM)',
      p_check_in_id
    );
    v_total_points_awarded := v_total_points_awarded + 20;
  ELSIF v_check_in_hour >= 19 THEN
    PERFORM award_points(
      p_student_id,
      25,
      'dedication_bonus',
      'Dedication bonus (after 7 PM)',
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

  -- Check for achievements (simplified for now)
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