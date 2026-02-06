-- get_public_devotional: Returns devotional content + series/org info for public viewing
-- SECURITY DEFINER so it bypasses RLS (devotionals table has RLS enabled)
-- Only returns data if the parent series has status = 'active'

CREATE OR REPLACE FUNCTION get_public_devotional(p_devotional_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'devotional', json_build_object(
      'id', d.id,
      'series_id', d.series_id,
      'day_number', d.day_number,
      'scheduled_date', d.scheduled_date,
      'time_slot', d.time_slot,
      'title', d.title,
      'scripture_reference', d.scripture_reference,
      'scripture_text', d.scripture_text,
      'reflection', d.reflection,
      'prayer_prompt', d.prayer_prompt,
      'discussion_question', d.discussion_question
    ),
    'series', json_build_object(
      'id', ds.id,
      'sermon_title', ds.sermon_title,
      'frequency', ds.frequency,
      'start_date', ds.start_date,
      'status', ds.status
    ),
    'organization', json_build_object(
      'id', o.id,
      'name', o.name,
      'display_name', o.display_name,
      'slug', o.slug,
      'theme_id', o.theme_id
    ),
    'series_devotionals', (
      SELECT json_agg(json_build_object(
        'id', sd.id,
        'day_number', sd.day_number,
        'scheduled_date', sd.scheduled_date,
        'time_slot', sd.time_slot,
        'title', sd.title
      ) ORDER BY sd.scheduled_date, sd.time_slot)
      FROM devotionals sd
      WHERE sd.series_id = ds.id
    )
  ) INTO result
  FROM devotionals d
  JOIN devotional_series ds ON ds.id = d.series_id
  JOIN organizations o ON o.id = ds.organization_id
  WHERE d.id = p_devotional_id
    AND ds.status = 'active';

  RETURN result;
END;
$$;

-- Grant execute to anon role so unauthenticated users can read devotionals
GRANT EXECUTE ON FUNCTION get_public_devotional(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_devotional(UUID) TO authenticated;
