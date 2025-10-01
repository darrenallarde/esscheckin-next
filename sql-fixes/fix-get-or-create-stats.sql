-- Fix get_or_create_student_game_stats function
-- The issue is on line 121-130 where INSERT...RETURNING tries to use INTO
-- with variable names that shadow the return table columns

DROP FUNCTION IF EXISTS get_or_create_student_game_stats(uuid);

CREATE OR REPLACE FUNCTION get_or_create_student_game_stats(p_student_id uuid)
RETURNS TABLE(
  student_id uuid,
  total_points integer,
  current_rank text,
  last_points_update timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    RETURN QUERY
    INSERT INTO public.student_game_stats (student_id, total_points, current_rank)
    VALUES (p_student_id, 0, 'Newcomer')
    RETURNING
      student_game_stats.student_id,
      student_game_stats.total_points,
      student_game_stats.current_rank,
      student_game_stats.last_points_update,
      student_game_stats.created_at,
      student_game_stats.updated_at;
  END IF;
END;
$$;
