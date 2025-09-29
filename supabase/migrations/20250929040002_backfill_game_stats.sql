-- Backfill existing students with initial game stats
-- This migration calculates historical points and achievements for existing students

-- Create a function to backfill a student's game stats
CREATE OR REPLACE FUNCTION backfill_student_game_stats(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_check_ins record;
  v_total_points integer := 0;
  v_current_rank text := 'Newcomer';
  v_first_checkin_date timestamp with time zone;
  v_total_checkin_count integer;
  v_student record;
BEGIN
  -- Get student info
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Get all check-ins for this student
  SELECT COUNT(*), MIN(checked_in_at) INTO v_total_checkin_count, v_first_checkin_date
  FROM public.check_ins
  WHERE student_id = p_student_id;

  -- If no check-ins, create basic stats and exit
  IF v_total_checkin_count = 0 THEN
    INSERT INTO public.student_game_stats (student_id, total_points, current_rank)
    VALUES (p_student_id, 0, 'Newcomer')
    ON CONFLICT (student_id) DO NOTHING;
    RETURN;
  END IF;

  -- Calculate base points: 10 points per check-in
  v_total_points := v_total_checkin_count * 10;

  -- Add first-time bonus (50 points)
  v_total_points := v_total_points + 50;

  -- Add student leader bonuses if applicable (15 points per check-in)
  IF v_student.user_type = 'student_leader' THEN
    v_total_points := v_total_points + (v_total_checkin_count * 15);
  END IF;

  -- Add some bonus points based on check-in count (simplified achievement points)
  CASE
    WHEN v_total_checkin_count >= 100 THEN v_total_points := v_total_points + 300; -- Ministry Legend
    WHEN v_total_checkin_count >= 50 THEN v_total_points := v_total_points + 150;  -- Ministry Veteran
    WHEN v_total_checkin_count >= 25 THEN v_total_points := v_total_points + 75;   -- Committed Member
    WHEN v_total_checkin_count >= 10 THEN v_total_points := v_total_points + 40;   -- Regular Attender
    ELSE NULL;
  END CASE;

  -- Determine rank based on total points
  CASE
    WHEN v_total_points >= 2000 THEN v_current_rank := 'Legend';
    WHEN v_total_points >= 1000 THEN v_current_rank := 'Champion';
    WHEN v_total_points >= 600 THEN v_current_rank := 'Devoted';
    WHEN v_total_points >= 300 THEN v_current_rank := 'Committed';
    WHEN v_total_points >= 100 THEN v_current_rank := 'Regular';
    ELSE v_current_rank := 'Newcomer';
  END CASE;

  -- Insert or update student game stats
  INSERT INTO public.student_game_stats (
    student_id,
    total_points,
    current_rank,
    last_points_update,
    created_at,
    updated_at
  ) VALUES (
    p_student_id,
    v_total_points,
    v_current_rank,
    COALESCE(v_first_checkin_date, now()),
    COALESCE(v_first_checkin_date, now()),
    now()
  )
  ON CONFLICT (student_id)
  DO UPDATE SET
    total_points = EXCLUDED.total_points,
    current_rank = EXCLUDED.current_rank,
    last_points_update = EXCLUDED.last_points_update,
    updated_at = now();

  -- Add some initial achievements for existing students
  IF v_total_checkin_count >= 1 THEN
    INSERT INTO public.student_achievements (
      student_id,
      achievement_id,
      achievement_title,
      achievement_description,
      achievement_emoji,
      points_awarded,
      rarity,
      unlocked_at
    ) VALUES (
      p_student_id,
      'first_checkin',
      'Welcome to the Family!',
      'Your very first check-in',
      '🎉',
      50,
      'common',
      v_first_checkin_date
    )
    ON CONFLICT (student_id, achievement_id) DO NOTHING;
  END IF;

  -- Add more achievements based on check-in count
  IF v_total_checkin_count >= 10 THEN
    INSERT INTO public.student_achievements (
      student_id,
      achievement_id,
      achievement_title,
      achievement_description,
      achievement_emoji,
      points_awarded,
      rarity,
      unlocked_at
    ) VALUES (
      p_student_id,
      'checkin_10',
      'Regular Attender',
      '10 total check-ins',
      '📅',
      40,
      'common',
      v_first_checkin_date + interval '10 days' -- Approximate
    )
    ON CONFLICT (student_id, achievement_id) DO NOTHING;
  END IF;

  IF v_total_checkin_count >= 25 THEN
    INSERT INTO public.student_achievements (
      student_id,
      achievement_id,
      achievement_title,
      achievement_description,
      achievement_emoji,
      points_awarded,
      rarity,
      unlocked_at
    ) VALUES (
      p_student_id,
      'checkin_25',
      'Committed Member',
      '25 total check-ins',
      '💪',
      75,
      'rare',
      v_first_checkin_date + interval '25 days'
    )
    ON CONFLICT (student_id, achievement_id) DO NOTHING;
  END IF;

  IF v_total_checkin_count >= 50 THEN
    INSERT INTO public.student_achievements (
      student_id,
      achievement_id,
      achievement_title,
      achievement_description,
      achievement_emoji,
      points_awarded,
      rarity,
      unlocked_at
    ) VALUES (
      p_student_id,
      'checkin_50',
      'Ministry Veteran',
      '50 total check-ins',
      '🎖️',
      150,
      'epic',
      v_first_checkin_date + interval '50 days'
    )
    ON CONFLICT (student_id, achievement_id) DO NOTHING;
  END IF;

  IF v_total_checkin_count >= 100 THEN
    INSERT INTO public.student_achievements (
      student_id,
      achievement_id,
      achievement_title,
      achievement_description,
      achievement_emoji,
      points_awarded,
      rarity,
      unlocked_at
    ) VALUES (
      p_student_id,
      'checkin_100',
      'Ministry Legend',
      '100 total check-ins',
      '🏆',
      300,
      'legendary',
      v_first_checkin_date + interval '100 days'
    )
    ON CONFLICT (student_id, achievement_id) DO NOTHING;
  END IF;

  -- Add student leader achievement if applicable
  IF v_student.user_type = 'student_leader' THEN
    INSERT INTO public.student_achievements (
      student_id,
      achievement_id,
      achievement_title,
      achievement_description,
      achievement_emoji,
      points_awarded,
      rarity,
      unlocked_at
    ) VALUES (
      p_student_id,
      'leader_bonus',
      'Leading by Example',
      'Student leader check-in',
      '👑',
      25,
      'rare',
      v_first_checkin_date
    )
    ON CONFLICT (student_id, achievement_id) DO NOTHING;
  END IF;

  -- Create initial transaction record for historical points
  INSERT INTO public.game_transactions (
    student_id,
    check_in_id,
    points_earned,
    transaction_type,
    description,
    metadata,
    created_at
  ) VALUES (
    p_student_id,
    NULL,
    v_total_points,
    'historical_backfill',
    'Historical points backfill for existing student',
    jsonb_build_object(
      'total_checkins', v_total_checkin_count,
      'first_checkin', v_first_checkin_date,
      'user_type', v_student.user_type
    ),
    v_first_checkin_date
  );

END;
$$;

-- Backfill all existing students
DO $$
DECLARE
  student_record record;
BEGIN
  FOR student_record IN
    SELECT id FROM public.students
  LOOP
    PERFORM backfill_student_game_stats(student_record.id);
  END LOOP;
END $$;

-- Drop the temporary function
DROP FUNCTION IF EXISTS backfill_student_game_stats(uuid);