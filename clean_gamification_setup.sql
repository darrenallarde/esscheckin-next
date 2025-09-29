-- Clean Gamification Setup (No Backfill)
-- Creates the gamification system tables and functions for fresh start

-- Table to store student game statistics and points
CREATE TABLE IF NOT EXISTS public.student_game_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  current_rank text NOT NULL DEFAULT 'Newcomer',
  last_points_update timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id)
);

-- Table to track unlocked achievements per student
CREATE TABLE IF NOT EXISTS public.student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  achievement_title text NOT NULL,
  achievement_description text NOT NULL,
  achievement_emoji text NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',
  unlocked_at timestamp with time zone DEFAULT now(),
  UNIQUE(student_id, achievement_id)
);

-- Table to track all point transactions (audit trail)
CREATE TABLE IF NOT EXISTS public.game_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  check_in_id uuid REFERENCES public.check_ins(id) ON DELETE SET NULL,
  points_earned integer NOT NULL,
  transaction_type text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_game_stats_student_id ON public.student_game_stats(student_id);
CREATE INDEX IF NOT EXISTS idx_student_game_stats_total_points ON public.student_game_stats(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON public.student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_game_transactions_student_id ON public.game_transactions(student_id);

-- Enable RLS (Row Level Security)
ALTER TABLE public.student_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now)
CREATE POLICY IF NOT EXISTS "Allow all access to game stats" ON public.student_game_stats FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all access to achievements" ON public.student_achievements FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all access to transactions" ON public.game_transactions FOR ALL USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on student_game_stats
DROP TRIGGER IF EXISTS update_student_game_stats_updated_at ON public.student_game_stats;
CREATE TRIGGER update_student_game_stats_updated_at
  BEFORE UPDATE ON public.student_game_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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
  v_current_total_points integer := 0;
  v_new_total_points integer := 0;
  v_old_rank text;
  v_new_rank text;
  v_rank_changed boolean := false;
BEGIN
  -- Get student info
  SELECT * INTO v_student FROM public.students WHERE id = p_student_id;

  -- Get check-in info
  SELECT * INTO v_check_in FROM public.check_ins WHERE id = p_check_in_id;

  -- Get total check-ins for this student
  SELECT COUNT(*) INTO v_total_check_ins FROM public.check_ins WHERE student_id = p_student_id;

  -- Determine if first time
  v_is_first_time := (v_total_check_ins = 1);

  -- Check if student leader
  v_is_student_leader := (v_student.user_type = 'student_leader');

  -- Get check-in time details
  v_check_in_hour := EXTRACT(hour FROM v_check_in.checked_in_at);
  v_check_in_day := EXTRACT(dow FROM v_check_in.checked_in_at);

  -- Get or create current stats
  INSERT INTO public.student_game_stats (student_id, total_points, current_rank)
  VALUES (p_student_id, 0, 'Newcomer')
  ON CONFLICT (student_id) DO NOTHING;

  SELECT total_points, current_rank INTO v_current_total_points, v_old_rank
  FROM public.student_game_stats WHERE student_id = p_student_id;

  -- Award base points
  v_total_points_awarded := v_total_points_awarded + v_base_points;

  -- First time bonus
  IF v_is_first_time THEN
    v_total_points_awarded := v_total_points_awarded + 50;
  END IF;

  -- Student leader bonus
  IF v_is_student_leader THEN
    v_total_points_awarded := v_total_points_awarded + 15;
  END IF;

  -- Time-based bonuses
  IF v_check_in_hour < 18 THEN
    v_total_points_awarded := v_total_points_awarded + 20;
  ELSIF v_check_in_hour >= 19 THEN
    v_total_points_awarded := v_total_points_awarded + 25;
  END IF;

  -- Day-based bonuses
  IF v_check_in_day = 0 THEN -- Sunday
    v_total_points_awarded := v_total_points_awarded + 10;
  ELSIF v_check_in_day = 3 THEN -- Wednesday
    v_total_points_awarded := v_total_points_awarded + 10;
  END IF;

  -- Calculate new total
  v_new_total_points := v_current_total_points + v_total_points_awarded;

  -- Determine new rank
  CASE
    WHEN v_new_total_points >= 2000 THEN v_new_rank := 'Legend';
    WHEN v_new_total_points >= 1000 THEN v_new_rank := 'Champion';
    WHEN v_new_total_points >= 600 THEN v_new_rank := 'Devoted';
    WHEN v_new_total_points >= 300 THEN v_new_rank := 'Committed';
    WHEN v_new_total_points >= 100 THEN v_new_rank := 'Regular';
    ELSE v_new_rank := 'Newcomer';
  END CASE;

  v_rank_changed := (v_old_rank != v_new_rank);

  -- Update student stats
  UPDATE public.student_game_stats
  SET total_points = v_new_total_points,
      current_rank = v_new_rank,
      last_points_update = now(),
      updated_at = now()
  WHERE student_id = p_student_id;

  -- Record transaction
  INSERT INTO public.game_transactions (
    student_id, check_in_id, points_earned, transaction_type, description, metadata
  ) VALUES (
    p_student_id, p_check_in_id, v_total_points_awarded, 'checkin_reward',
    'Check-in points and bonuses',
    jsonb_build_object(
      'is_first_time', v_is_first_time,
      'is_student_leader', v_is_student_leader,
      'check_in_hour', v_check_in_hour,
      'check_in_day', v_check_in_day
    )
  );

  -- Add first-time achievement
  IF v_is_first_time THEN
    INSERT INTO public.student_achievements (
      student_id, achievement_id, achievement_title, achievement_description,
      achievement_emoji, points_awarded, rarity
    ) VALUES (
      p_student_id, 'first_checkin', 'Welcome to the Family!', 'Your very first check-in',
      '🎉', 50, 'common'
    ) ON CONFLICT (student_id, achievement_id) DO NOTHING;

    v_achievements := v_achievements || jsonb_build_object(
      'id', 'first_checkin',
      'title', 'Welcome to the Family!',
      'description', 'Your very first check-in',
      'emoji', '🎉',
      'points', 50,
      'rarity', 'common'
    );
  END IF;

  -- Return result
  RETURN jsonb_build_object(
    'points_awarded', v_total_points_awarded,
    'total_points', v_new_total_points,
    'rank_changed', v_rank_changed,
    'current_rank', v_new_rank,
    'achievements', v_achievements,
    'is_first_time', v_is_first_time
  );
END;
$$;