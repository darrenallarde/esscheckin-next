-- Gamification System Migration
-- Creates tables for tracking points, achievements, and game statistics

-- Table to store student game statistics and points
CREATE TABLE public.student_game_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  total_points integer NOT NULL DEFAULT 0,
  current_rank text NOT NULL DEFAULT 'Newcomer',
  last_points_update timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  -- Ensure one record per student
  UNIQUE(student_id)
);

-- Table to track unlocked achievements per student
CREATE TABLE public.student_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  achievement_title text NOT NULL,
  achievement_description text NOT NULL,
  achievement_emoji text NOT NULL,
  points_awarded integer NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',
  unlocked_at timestamp with time zone DEFAULT now(),

  -- Prevent duplicate achievements per student
  UNIQUE(student_id, achievement_id)
);

-- Table to track all point transactions (audit trail)
CREATE TABLE public.game_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  check_in_id uuid REFERENCES public.check_ins(id) ON DELETE SET NULL,
  points_earned integer NOT NULL,
  transaction_type text NOT NULL, -- 'base_checkin', 'streak_bonus', 'achievement', 'first_time', etc.
  description text,
  metadata jsonb, -- Store additional context like streak count, achievement details, etc.
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_student_game_stats_student_id ON public.student_game_stats(student_id);
CREATE INDEX idx_student_game_stats_total_points ON public.student_game_stats(total_points DESC);
CREATE INDEX idx_student_achievements_student_id ON public.student_achievements(student_id);
CREATE INDEX idx_student_achievements_unlocked_at ON public.student_achievements(unlocked_at);
CREATE INDEX idx_game_transactions_student_id ON public.game_transactions(student_id);
CREATE INDEX idx_game_transactions_check_in_id ON public.game_transactions(check_in_id);
CREATE INDEX idx_game_transactions_created_at ON public.game_transactions(created_at);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on student_game_stats
CREATE TRIGGER update_student_game_stats_updated_at
  BEFORE UPDATE ON public.student_game_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.student_game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for student_game_stats
CREATE POLICY "Users can view their own game stats" ON public.student_game_stats
  FOR SELECT USING (true); -- Allow all reads for now, can restrict later

CREATE POLICY "Only system can modify game stats" ON public.student_game_stats
  FOR ALL USING (true); -- Allow all modifications for now, will be handled by functions

-- RLS Policies for student_achievements
CREATE POLICY "Users can view all achievements" ON public.student_achievements
  FOR SELECT USING (true);

CREATE POLICY "Only system can modify achievements" ON public.student_achievements
  FOR ALL USING (true);

-- RLS Policies for game_transactions
CREATE POLICY "Users can view all transactions" ON public.game_transactions
  FOR SELECT USING (true);

CREATE POLICY "Only system can modify transactions" ON public.game_transactions
  FOR ALL USING (true);

-- Function to get or create student game stats
CREATE OR REPLACE FUNCTION get_or_create_student_game_stats(p_student_id uuid)
RETURNS TABLE(
  student_id uuid,
  total_points integer,
  current_rank text,
  last_points_update timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql AS $$
BEGIN
  -- Try to get existing stats
  RETURN QUERY
  SELECT
    sgs.student_id,
    sgs.total_points,
    sgs.current_rank,
    sgs.last_points_update,
    sgs.created_at,
    sgs.updated_at
  FROM public.student_game_stats sgs
  WHERE sgs.student_id = p_student_id;

  -- If no stats exist, create them
  IF NOT FOUND THEN
    INSERT INTO public.student_game_stats (student_id, total_points, current_rank)
    VALUES (p_student_id, 0, 'Newcomer')
    RETURNING
      student_game_stats.student_id,
      student_game_stats.total_points,
      student_game_stats.current_rank,
      student_game_stats.last_points_update,
      student_game_stats.created_at,
      student_game_stats.updated_at
    INTO student_id, total_points, current_rank, last_points_update, created_at, updated_at;

    RETURN NEXT;
  END IF;
END;
$$;