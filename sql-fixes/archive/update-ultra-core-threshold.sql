-- Update Ultra-Core definition to: 5+ check-ins in last 4 weeks
-- This makes it more achievable while still identifying highly engaged students

-- Drop the existing function first (signature changed)
DROP FUNCTION IF EXISTS public.get_pastoral_analytics();

CREATE FUNCTION public.get_pastoral_analytics()
RETURNS TABLE(
  student_id uuid,
  first_name text,
  last_name text,
  phone_number text,
  email text,
  grade text,
  high_school text,
  parent_name text,
  parent_phone text,

  -- Belonging status
  belonging_status text,
  total_checkins_8weeks integer,
  checkins_last_4weeks integer,
  wednesday_count integer,
  sunday_count integer,
  days_since_last_seen integer,
  last_checkin_date timestamp with time zone,
  is_declining boolean,

  -- Attendance pattern (last 8 weeks, most recent first)
  attendance_pattern jsonb,

  -- Recommended action and message
  recommended_action text,
  action_message text,
  priority_score integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_eight_weeks_ago DATE := v_today - INTERVAL '8 weeks';
  v_four_weeks_ago DATE := v_today - INTERVAL '4 weeks';
  v_sixty_days_ago DATE := v_today - INTERVAL '60 days';
  v_thirty_days_ago DATE := v_today - INTERVAL '30 days';
BEGIN
  RETURN QUERY
  SELECT
    s.id AS student_id,
    s.first_name,
    s.last_name,
    s.phone_number,
    s.email,
    s.grade,
    s.high_school,
    s.parent_name,
    s.parent_phone,

    -- Calculate belonging status
    CASE
      -- Missing: Not seen in 60+ days (or never)
      WHEN sp.last_checkin IS NULL OR sp.last_checkin < v_sixty_days_ago THEN 'Missing'

      -- On the Fringe: Not seen in 30-60 days
      WHEN sp.last_checkin < v_thirty_days_ago THEN 'On the Fringe'

      -- Ultra-Core: 5+ check-ins in last 4 weeks
      WHEN sp.checkins_last_4weeks >= 5 THEN 'Ultra-Core'

      -- Core: 4-7 check-ins in 8 weeks (roughly 1x/week)
      WHEN sp.checkins_8weeks >= 4 THEN 'Core'

      -- Connected: 2-3 check-ins in 8 weeks
      WHEN sp.checkins_8weeks >= 2 THEN 'Connected'

      -- On the Fringe: Seen recently but inconsistent
      ELSE 'On the Fringe'
    END AS belonging_status,

    sp.checkins_8weeks::integer AS total_checkins_8weeks,
    sp.checkins_last_4weeks::integer AS checkins_last_4weeks,
    sp.wednesday_checkins::integer AS wednesday_count,
    sp.sunday_checkins::integer AS sunday_count,

    -- Days since last seen (999999 means never)
    COALESCE(v_today - sp.last_checkin::DATE, 999999)::integer AS days_since_last_seen,
    sp.last_checkin AS last_checkin_date,

    -- Declining trend: last 4 weeks < previous 4 weeks AND last 4 weeks < 2
    (sp.checkins_last_4weeks < sp.checkins_prev_4weeks AND sp.checkins_last_4weeks < 2) AS is_declining,

    -- Attendance pattern for last 8 weeks
    attendance_agg.attendance_pattern,

    -- Recommended action based on belonging status
    CASE
      WHEN sp.last_checkin IS NULL OR sp.last_checkin < v_sixty_days_ago THEN 'PARENT OUTREACH'
      WHEN sp.last_checkin < v_thirty_days_ago THEN 'REACH OUT NOW'
      WHEN sp.checkins_last_4weeks >= 5 THEN 'DEVELOP'  -- Ultra-Core
      WHEN sp.checkins_8weeks >= 4 THEN 'AFFIRM'  -- Core
      WHEN sp.checkins_8weeks >= 2 THEN 'CLOSE THE GAP'  -- Connected
      ELSE 'REACH OUT NOW'
    END AS recommended_action,

    -- Action message
    CASE
      WHEN sp.last_checkin IS NULL OR sp.last_checkin < v_sixty_days_ago THEN
        'Call parent: "We''ve missed ' || s.first_name || ' at youth group. How can we support your family?"'
      WHEN sp.last_checkin < v_thirty_days_ago THEN
        'Text: "Hey ' || s.first_name || '! We noticed you haven''t been around. Everything okay? We''d love to see you Wednesday!"'
      WHEN sp.checkins_last_4weeks >= 5 THEN
        'Invite ' || s.first_name || ' to serve/lead. They''re ready for the next step!'
      WHEN sp.checkins_8weeks >= 4 THEN
        'Affirm ' || s.first_name || '''s consistency. Encourage them to invite a friend!'
      WHEN sp.checkins_8weeks >= 2 THEN
        'Text: "Great to see you last week, ' || s.first_name || '! Hope to see you again Wednesday!"'
      ELSE
        'Reach out: "Hey ' || s.first_name || ', we''d love to connect! What''s been going on?"'
    END AS action_message,

    -- Priority score for sorting (higher = more urgent)
    CASE
      WHEN sp.last_checkin IS NULL OR sp.last_checkin < v_sixty_days_ago THEN 6  -- Missing
      WHEN sp.last_checkin < v_thirty_days_ago THEN 5  -- On Fringe
      WHEN sp.checkins_last_4weeks < sp.checkins_prev_4weeks AND sp.checkins_last_4weeks < 2 THEN 4  -- Declining
      WHEN sp.checkins_8weeks >= 2 AND sp.checkins_8weeks < 4 THEN 3  -- Connected
      WHEN sp.checkins_8weeks >= 4 THEN 2  -- Core
      WHEN sp.checkins_last_4weeks >= 5 THEN 1  -- Ultra-Core
      ELSE 3
    END AS priority_score

  FROM students s
  LEFT JOIN LATERAL (
    SELECT
      -- Count check-ins in last 8 weeks
      COUNT(DISTINCT DATE(ci.checked_in_at))::integer AS checkins_8weeks,

      -- Count check-ins in last 4 weeks
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (
        WHERE ci.checked_in_at >= v_four_weeks_ago
      )::integer AS checkins_last_4weeks,

      -- Count check-ins in previous 4 weeks (weeks 5-8)
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (
        WHERE ci.checked_in_at >= v_eight_weeks_ago AND ci.checked_in_at < v_four_weeks_ago
      )::integer AS checkins_prev_4weeks,

      -- Count Wednesday and Sunday attendance
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (
        WHERE EXTRACT(DOW FROM ci.checked_in_at) = 3  -- Wednesday
      )::integer AS wednesday_checkins,

      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (
        WHERE EXTRACT(DOW FROM ci.checked_in_at) = 0  -- Sunday
      )::integer AS sunday_checkins,

      -- Last check-in date
      MAX(ci.checked_in_at) AS last_checkin

    FROM check_ins ci
    WHERE ci.student_id = s.id
      AND ci.checked_in_at >= v_eight_weeks_ago
  ) sp ON true

  LEFT JOIN LATERAL (
    SELECT
      -- Build attendance pattern for last 8 COMPLETE weeks
      -- One box per week, ordered oldest to newest (left to right in UI)
      jsonb_agg(
        jsonb_build_object(
          'week_start', week_starts.week_start,
          'days_attended', COALESCE(week_checkins.days_count, 0)
        )
        ORDER BY week_starts.week_start ASC  -- Oldest first (will display left to right)
      ) AS attendance_pattern

    FROM generate_series(
      date_trunc('week', v_today) - INTERVAL '8 weeks',
      date_trunc('week', v_today) - INTERVAL '1 week',  -- Stop before current incomplete week
      '1 week'::interval
    ) AS week_starts(week_start)
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT DATE(ci2.checked_in_at))::integer AS days_count
      FROM check_ins ci2
      WHERE ci2.student_id = s.id
        AND ci2.checked_in_at >= week_starts.week_start
        AND ci2.checked_in_at < week_starts.week_start + INTERVAL '1 week'
    ) week_checkins ON true
  ) attendance_agg ON true

  ORDER BY priority_score DESC, s.first_name, s.last_name;
END;
$$;

COMMENT ON FUNCTION public.get_pastoral_analytics IS
'Calculates student belonging status with updated thresholds: Ultra-Core (5+ in 4 weeks), Core (4+ in 8 weeks), Connected (2-3 in 8 weeks), On Fringe (30-60 days), Missing (60+ days)';
