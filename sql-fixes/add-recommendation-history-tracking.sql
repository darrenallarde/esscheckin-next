-- Add recommendation history tracking
-- Instead of replacing recommendations, keep a full history

-- 1. Remove the unique constraint that prevents multiple recommendations per student/curriculum
-- This allows us to keep historical recommendations
ALTER TABLE ai_recommendations
DROP CONSTRAINT IF EXISTS ai_recommendations_student_id_curriculum_week_id_key;

-- 2. Add fields to track recommendation lifecycle
ALTER TABLE ai_recommendations
ADD COLUMN IF NOT EXISTS marked_complete_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Create index for faster queries by student
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_student_generated
ON ai_recommendations(student_id, generated_at DESC);

-- 4. Create index for active (not dismissed, not completed) recommendations
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_active
ON ai_recommendations(student_id, curriculum_week_id)
WHERE is_dismissed = false AND marked_complete_at IS NULL;

-- 5. Create a view for the student journey timeline
CREATE OR REPLACE VIEW student_journey_timeline AS
SELECT
  s.id AS student_id,
  s.first_name,
  s.last_name,
  'recommendation' AS event_type,
  ar.generated_at AS event_timestamp,
  jsonb_build_object(
    'recommendation_id', ar.id,
    'curriculum_topic', cw.topic_title,
    'curriculum_series', cw.series_name,
    'key_insight', ar.key_insight,
    'action_bullets', ar.action_bullets,
    'belonging_status', ar.engagement_status,
    'days_since_last_seen', ar.days_since_last_seen,
    'is_dismissed', ar.is_dismissed,
    'dismissed_at', ar.dismissed_at,
    'marked_complete_at', ar.marked_complete_at,
    'notes', ar.notes
  ) AS event_data
FROM students s
JOIN ai_recommendations ar ON s.id = ar.student_id
LEFT JOIN curriculum_weeks cw ON ar.curriculum_week_id = cw.id

UNION ALL

SELECT
  s.id AS student_id,
  s.first_name,
  s.last_name,
  'check_in' AS event_type,
  ci.checked_in_at AS event_timestamp,
  jsonb_build_object(
    'check_in_id', ci.id,
    'day_of_week', to_char(ci.checked_in_at, 'Day')
  ) AS event_data
FROM students s
JOIN check_ins ci ON s.id = ci.student_id

ORDER BY student_id, event_timestamp DESC;

-- Grant permissions
GRANT SELECT ON student_journey_timeline TO authenticated;

-- 6. Function to mark recommendation as complete
CREATE OR REPLACE FUNCTION mark_recommendation_complete(
  p_recommendation_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE ai_recommendations
  SET
    marked_complete_at = NOW(),
    completed_by = p_user_id,
    notes = COALESCE(p_notes, notes)
  WHERE id = p_recommendation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_recommendation_complete TO authenticated;

-- 7. Function to get recommendation history for a student
CREATE OR REPLACE FUNCTION get_student_recommendation_history(p_student_id UUID)
RETURNS TABLE(
  recommendation_id UUID,
  generated_at TIMESTAMP WITH TIME ZONE,
  curriculum_topic TEXT,
  curriculum_series TEXT,
  key_insight TEXT,
  action_bullets TEXT[],
  context_paragraph TEXT,
  engagement_status TEXT,
  days_since_last_seen INTEGER,
  is_dismissed BOOLEAN,
  dismissed_at TIMESTAMP,
  marked_complete_at TIMESTAMP,
  completed_by UUID,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ar.id,
    ar.generated_at,
    cw.topic_title,
    cw.series_name,
    ar.key_insight,
    ar.action_bullets,
    ar.context_paragraph,
    ar.engagement_status,
    ar.days_since_last_seen,
    ar.is_dismissed,
    ar.dismissed_at,
    ar.marked_complete_at,
    ar.completed_by,
    ar.notes
  FROM ai_recommendations ar
  LEFT JOIN curriculum_weeks cw ON ar.curriculum_week_id = cw.id
  WHERE ar.student_id = p_student_id
  ORDER BY ar.generated_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_student_recommendation_history TO authenticated;

-- 8. Update the Edge Function's upsert to always insert new recommendations instead
-- This is done in the Edge Function code, not SQL

COMMENT ON VIEW student_journey_timeline IS 'Combined timeline view of student check-ins and pastoral recommendations';
COMMENT ON FUNCTION mark_recommendation_complete IS 'Mark a recommendation as completed with optional notes';
COMMENT ON FUNCTION get_student_recommendation_history IS 'Get full recommendation history for a student, ordered by date';
