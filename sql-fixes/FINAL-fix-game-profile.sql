-- FINAL FIX: Completely rewrite function to avoid ambiguity
DROP FUNCTION IF EXISTS get_student_game_profile(uuid);

CREATE OR REPLACE FUNCTION get_student_game_profile(p_student_id uuid)
RETURNS TABLE (
  student_id uuid,
  first_name text,
  last_name text,
  user_type text,
  total_points integer,
  current_rank text,
  achievements_count integer,
  recent_achievements jsonb,
  total_check_ins integer,
  last_check_in timestamptz,
  wednesday_streak integer,
  sunday_streak integer,
  total_streak integer
)
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT 
    s.id,
    s.first_name,
    s.last_name,
    s.user_type,
    COALESCE(gs.total_points, 0)::integer,
    COALESCE(gs.current_rank, 'Newcomer'),
    (SELECT COUNT(*)::integer FROM student_achievements WHERE student_achievements.student_id = s.id),
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', achievement_id,
          'title', achievement_title,
          'description', achievement_description,
          'emoji', achievement_emoji,
          'points', points_awarded,
          'rarity', rarity,
          'unlocked_at', unlocked_at
        ) ORDER BY unlocked_at DESC
      )
      FROM student_achievements 
      WHERE student_achievements.student_id = s.id
      LIMIT 10),
      '[]'::jsonb
    ),
    (SELECT COUNT(*)::integer FROM check_ins WHERE check_ins.student_id = s.id),
    (SELECT MAX(checked_in_at) FROM check_ins WHERE check_ins.student_id = s.id),
    0,
    0,
    0
  FROM students s
  LEFT JOIN student_game_stats gs ON gs.student_id = s.id
  WHERE s.id = p_student_id;
$$;
