-- Fix belonging spectrum thresholds to match correct definitions:
-- Missing: Not seen in 60+ days
-- On the Fringe: Not seen in 30-60 days
-- Connected: Seen ~1x per 30 days (2-3x in 8 weeks)
-- Core: Seen ~1x per week (6-8x in 8 weeks)
-- Ultra-Core: Seen >1x per week (12+ in 8 weeks, both Wed & Sun)

CREATE OR REPLACE FUNCTION public.get_pastoral_analytics()
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

  -- Attendance metrics
  total_checkins_8weeks integer,
  total_checkins_30days integer,
  total_checkins_60days integer,
  days_since_last_seen integer,
  last_checkin_date timestamp with time zone,

  -- Attendance pattern (last 8 weeks, oldest to newest)
  attendance_pattern jsonb,

  -- Day of week patterns
  wednesday_count integer,
  sunday_count integer,

  -- Trend indicators
  is_declining boolean,
  previous_status text,

  -- Action recommendation
  recommended_action text,
  action_priority integer,
  action_message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_eight_weeks_ago timestamp with time zone := now() - interval '8 weeks';
  v_thirty_days_ago timestamp with time zone := now() - interval '30 days';
  v_sixty_days_ago timestamp with time zone := now() - interval '60 days';
  v_four_weeks_ago timestamp with time zone := now() - interval '4 weeks';
BEGIN
  RETURN QUERY
  WITH student_checkins AS (
    -- Get all check-ins for each student in the last 8 weeks
    SELECT
      s.id,
      s.first_name,
      s.last_name,
      s.phone_number,
      s.email,
      s.grade,
      s.high_school,
      s.parent_name,
      s.parent_phone,
      COALESCE(array_agg(ci.checked_in_at ORDER BY ci.checked_in_at) FILTER (WHERE ci.checked_in_at >= v_eight_weeks_ago), ARRAY[]::timestamp[]) AS checkin_dates,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (WHERE ci.checked_in_at >= v_eight_weeks_ago) AS checkins_8weeks,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (WHERE ci.checked_in_at >= v_thirty_days_ago) AS checkins_30days,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (WHERE ci.checked_in_at >= v_sixty_days_ago) AS checkins_60days,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (WHERE ci.checked_in_at >= v_four_weeks_ago) AS checkins_4weeks,
      MAX(ci.checked_in_at) AS last_checkin,

      -- Count Wednesday vs Sunday attendance (Wednesday = 3, Sunday = 0)
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (
        WHERE ci.checked_in_at >= v_eight_weeks_ago
        AND EXTRACT(DOW FROM ci.checked_in_at) = 3
      ) AS wednesday_checkins,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (
        WHERE ci.checked_in_at >= v_eight_weeks_ago
        AND EXTRACT(DOW FROM ci.checked_in_at) = 0
      ) AS sunday_checkins
    FROM public.students s
    LEFT JOIN public.check_ins ci ON s.id = ci.student_id
    GROUP BY s.id, s.first_name, s.last_name, s.phone_number, s.email, s.grade, s.high_school, s.parent_name, s.parent_phone
  ),

  student_metrics AS (
    SELECT
      *,
      CASE
        WHEN last_checkin IS NULL THEN 999999
        ELSE EXTRACT(EPOCH FROM (now() - last_checkin)) / 86400
      END::integer AS days_since_last,

      -- Determine belonging status based on attendance frequency
      CASE
        -- Missing: Not seen in 60+ days (or never)
        WHEN last_checkin IS NULL OR last_checkin < v_sixty_days_ago THEN 'Missing'

        -- On the Fringe: Not seen in 30-60 days
        WHEN last_checkin < v_thirty_days_ago THEN 'On the Fringe'

        -- Ultra-Core: More than 1x/week (12+ check-ins in 8 weeks, attending both Wed & Sun)
        WHEN checkins_8weeks >= 12 AND wednesday_checkins >= 4 AND sunday_checkins >= 4 THEN 'Ultra-Core'

        -- Core: ~1x/week (6-11 check-ins in 8 weeks)
        WHEN checkins_8weeks >= 6 THEN 'Core'

        -- Connected: ~1x per 30 days (2-5 check-ins in 8 weeks)
        WHEN checkins_8weeks >= 2 THEN 'Connected'

        -- On the Fringe: Seen in last 30 days but less than 2x in 8 weeks
        ELSE 'On the Fringe'
      END AS belonging_status,

      -- Detect declining trend (comparing last 4 weeks to previous 4 weeks)
      CASE
        WHEN checkins_4weeks < (checkins_8weeks - checkins_4weeks) AND checkins_8weeks > 0 THEN true
        ELSE false
      END AS declining

    FROM student_checkins
  ),

  student_patterns AS (
    SELECT
      sm.*,
      -- Generate 8-week attendance pattern (week by week)
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'week_start', week_start,
            'attended', attended
          )
          ORDER BY week_start
        )
        FROM (
          SELECT
            date_trunc('week', week_series)::date AS week_start,
            EXISTS(
              SELECT 1
              FROM unnest(sm.checkin_dates) AS cd
              WHERE date_trunc('week', cd) = date_trunc('week', week_series)
            ) AS attended
          FROM generate_series(
            date_trunc('week', v_eight_weeks_ago)::timestamp,
            date_trunc('week', now())::timestamp,
            interval '1 week'
          ) AS week_series
        ) weeks
      ) AS attendance_pattern
    FROM student_metrics sm
  )

  SELECT
    sp.id,
    sp.first_name,
    sp.last_name,
    sp.phone_number,
    sp.email,
    sp.grade,
    sp.high_school,
    sp.parent_name,
    sp.parent_phone,
    sp.belonging_status,
    sp.checkins_8weeks::integer,
    sp.checkins_30days::integer,
    sp.checkins_60days::integer,
    sp.days_since_last::integer,
    sp.last_checkin,
    sp.attendance_pattern,
    sp.wednesday_checkins::integer,
    sp.sunday_checkins::integer,
    sp.declining,

    -- Previous status (approximate based on trend)
    CASE
      WHEN sp.declining AND sp.belonging_status = 'Connected' THEN 'Core'
      WHEN sp.declining AND sp.belonging_status = 'On the Fringe' THEN 'Connected'
      ELSE sp.belonging_status
    END AS previous_status,

    -- Recommended action based on status
    CASE
      WHEN sp.belonging_status = 'Ultra-Core' THEN 'DEVELOP'
      WHEN sp.belonging_status = 'Core' THEN 'AFFIRM'
      WHEN sp.belonging_status = 'Connected' THEN 'CLOSE THE GAP'
      WHEN sp.belonging_status = 'On the Fringe' THEN 'REACH OUT NOW'
      WHEN sp.belonging_status = 'Missing' THEN 'PARENT OUTREACH'
      ELSE 'NONE'
    END AS recommended_action,

    -- Priority (lower number = more urgent)
    CASE
      WHEN sp.belonging_status = 'Missing' THEN 1
      WHEN sp.belonging_status = 'On the Fringe' THEN 2
      WHEN sp.belonging_status = 'Connected' AND sp.declining THEN 3
      WHEN sp.belonging_status = 'Connected' THEN 4
      WHEN sp.belonging_status = 'Core' THEN 5
      WHEN sp.belonging_status = 'Ultra-Core' THEN 6
      ELSE 99
    END AS action_priority,

    -- Action message template
    CASE
      WHEN sp.belonging_status = 'Ultra-Core' THEN
        sp.first_name || ', I''ve noticed your consistency and growth. Would love to talk about some leadership opportunities. Coffee this week?'

      WHEN sp.belonging_status = 'Core' THEN
        sp.first_name || ', love seeing you every week! Your presence makes a difference. Want to invite a friend next Sunday?'

      WHEN sp.belonging_status = 'Connected' AND sp.declining THEN
        'Hey ' || sp.first_name || '! Used to see you more often. Is everything okay? We miss you!'

      WHEN sp.belonging_status = 'Connected' THEN
        'Hey ' || sp.first_name || '! Great to see you when you''re here. Would love to see you more often!'

      WHEN sp.belonging_status = 'On the Fringe' THEN
        'Hey ' || sp.first_name || '! Haven''t seen you in a few weeks. Is everything okay? We miss you! Want to grab boba after school this week?'

      WHEN sp.belonging_status = 'Missing' THEN
        'Hi ' || COALESCE(sp.parent_name, 'Parent') || ', just checking in—haven''t seen ' || sp.first_name || ' at youth group in about ' || sp.days_since_last || ' days. Is everything alright? Would love to reconnect.'

      ELSE 'No action needed'
    END AS action_message

  FROM student_patterns sp
  ORDER BY action_priority, sp.days_since_last DESC;

END;
$function$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pastoral_analytics() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_pastoral_analytics IS 'Calculates student belonging status with proper thresholds: Missing (60+ days), On Fringe (30-60 days), Connected (2-5x/8wk), Core (6-11x/8wk), Ultra-Core (12+x/8wk)';
