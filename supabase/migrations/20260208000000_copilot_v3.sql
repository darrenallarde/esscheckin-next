-- =============================================================================
-- Co-Pilot V3: Full Pastoral Intelligence Briefing
-- Adds ministry_priorities to organizations, creates get_copilot_briefing_v3 RPC
-- with signal + healthy tiers, recent SMS bodies, parent outbound tracking
-- =============================================================================

-- 1. Add ministry_priorities column to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS ministry_priorities TEXT;

-- 2. New V3 RPC — keeps V2 for rollback safety
-- Changes from V2:
--   - Removes relevance >= 1 filter (returns ALL active students)
--   - Two-tier output: signal candidates (relevance >= 1) + healthy roster (relevance = 0)
--   - New column: last_seen_at (actual check-in timestamp)
--   - New CTE: recent_sms (last 3 SMS per student as JSONB array)
--   - New CTE: parent_sms (last outbound SMS to parent)
--   - New columns: recent_sms_bodies, parent_last_outbound, is_signal_candidate
CREATE OR REPLACE FUNCTION get_copilot_briefing_v3(
  p_org_id UUID,
  p_signal_limit INT DEFAULT 30,
  p_healthy_limit INT DEFAULT 50
)
RETURNS TABLE(
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  email TEXT,
  grade TEXT,
  gender TEXT,
  belonging_status TEXT,
  days_since_last_seen INT,
  last_seen_at TIMESTAMPTZ,
  total_checkins_8weeks INT,
  checkins_last_4weeks INT,
  is_declining BOOLEAN,
  is_new BOOLEAN,
  is_signal_candidate BOOLEAN,
  signals JSONB,
  recommendation_insight TEXT,
  primary_parent_name TEXT,
  primary_parent_phone TEXT,
  last_interaction_at TIMESTAMPTZ,
  last_interaction_by TEXT,
  last_interaction_status TEXT,
  pinned_notes JSONB,
  group_names TEXT[],
  recent_prayer_text TEXT,
  devotional_engagement JSONB,
  sms_activity JSONB,
  recent_sms_bodies JSONB,
  parent_last_outbound TIMESTAMPTZ,
  signals_hash TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eight_weeks_ago TIMESTAMPTZ := now() - interval '8 weeks';
  v_four_weeks_ago TIMESTAMPTZ := now() - interval '4 weeks';
  v_thirty_days_ago TIMESTAMPTZ := now() - interval '30 days';
  v_sixty_days_ago TIMESTAMPTZ := now() - interval '60 days';
  v_fourteen_days_ago TIMESTAMPTZ := now() - interval '14 days';
BEGIN
  RETURN QUERY
  WITH student_members AS (
    SELECT
      p.id AS pid,
      p.first_name,
      p.last_name,
      p.phone_number,
      p.email,
      sp.grade,
      COALESCE(spe.gender, CASE WHEN sp.profile_id IS NOT NULL THEN NULL END) AS gender,
      om.created_at AS membership_created_at
    FROM organization_memberships om
    JOIN profiles p ON p.id = om.profile_id
    LEFT JOIN student_profiles sp ON sp.profile_id = p.id
    LEFT JOIN student_profiles_extended spe ON spe.profile_id = p.id
    WHERE om.organization_id = p_org_id
      AND om.role = 'student'
      AND om.status = 'active'
  ),

  attendance AS (
    SELECT
      ci.profile_id AS pid,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (WHERE ci.checked_in_at >= v_eight_weeks_ago) AS checkins_8weeks,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (WHERE ci.checked_in_at >= v_four_weeks_ago) AS checkins_4weeks,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (
        WHERE ci.checked_in_at >= v_eight_weeks_ago
        AND EXTRACT(DOW FROM ci.checked_in_at) = 3
      ) AS wednesday_count,
      COUNT(DISTINCT DATE(ci.checked_in_at)) FILTER (
        WHERE ci.checked_in_at >= v_eight_weeks_ago
        AND EXTRACT(DOW FROM ci.checked_in_at) = 0
      ) AS sunday_count,
      MAX(ci.checked_in_at) AS last_checkin
    FROM check_ins ci
    WHERE ci.organization_id = p_org_id
    GROUP BY ci.profile_id
  ),

  metrics AS (
    SELECT
      sm.*,
      COALESCE(a.checkins_8weeks, 0)::INT AS checkins_8w,
      COALESCE(a.checkins_4weeks, 0)::INT AS checkins_4w,
      COALESCE(a.wednesday_count, 0)::INT AS wed_count,
      COALESCE(a.sunday_count, 0)::INT AS sun_count,
      a.last_checkin,
      CASE
        WHEN a.last_checkin IS NULL THEN 999999
        ELSE EXTRACT(EPOCH FROM (now() - a.last_checkin)) / 86400
      END::INT AS days_absent,

      -- Belonging status
      CASE
        WHEN COALESCE(a.checkins_8weeks, 0) >= 12
             AND COALESCE(a.wednesday_count, 0) >= 4
             AND COALESCE(a.sunday_count, 0) >= 4 THEN 'Ultra-Core'
        WHEN COALESCE(a.checkins_8weeks, 0) >= 6 THEN 'Core'
        WHEN COALESCE(a.checkins_8weeks, 0) >= 3 THEN 'Connected'
        WHEN a.last_checkin IS NOT NULL
             AND a.last_checkin < v_thirty_days_ago
             AND a.last_checkin >= v_sixty_days_ago THEN 'On the Fringe'
        ELSE 'Missing'
      END AS b_status,

      -- Declining trend
      CASE
        WHEN COALESCE(a.checkins_4weeks, 0) < (COALESCE(a.checkins_8weeks, 0) - COALESCE(a.checkins_4weeks, 0))
             AND COALESCE(a.checkins_8weeks, 0) > 0 THEN true
        ELSE false
      END AS declining,

      -- New student
      CASE
        WHEN sm.membership_created_at >= v_thirty_days_ago THEN true
        ELSE false
      END AS is_new_student

    FROM student_members sm
    LEFT JOIN attendance a ON a.pid = sm.pid
  ),

  prayer AS (
    SELECT DISTINCT ON (de.profile_id)
      de.profile_id AS pid,
      de.prayer_request AS prayer_text,
      de.prayed_at AS prayer_at
    FROM devotional_engagements de
    WHERE de.prayer_request IS NOT NULL
      AND de.prayer_request != ''
      AND de.prayed_at >= v_thirty_days_ago
    ORDER BY de.profile_id, de.prayed_at DESC
  ),

  -- Devotional engagement depth (30 days)
  devo_engagement AS (
    SELECT
      de.profile_id AS pid,
      COUNT(*) FILTER (WHERE de.opened_at IS NOT NULL) AS opened_count,
      COUNT(*) FILTER (WHERE de.reflected_at IS NOT NULL) AS reflected_count,
      COUNT(*) FILTER (WHERE de.prayed_at IS NOT NULL) AS prayed_count,
      COUNT(*) FILTER (WHERE de.journaled_at IS NOT NULL) AS journaled_count,
      MAX(de.opened_at) AS last_opened
    FROM devotional_engagements de
    JOIN devotionals d ON d.id = de.devotional_id
    JOIN devotional_series ds ON ds.id = d.series_id
    WHERE ds.organization_id = p_org_id
      AND de.opened_at >= v_thirty_days_ago
    GROUP BY de.profile_id
  ),

  -- SMS activity summary
  sms AS (
    SELECT
      sm2.profile_id AS pid,
      COUNT(*) AS total_messages,
      COUNT(*) FILTER (WHERE sm2.direction = 'outbound') AS outbound_count,
      COUNT(*) FILTER (WHERE sm2.direction = 'inbound') AS inbound_count,
      MAX(sm2.created_at) FILTER (WHERE sm2.direction = 'outbound') AS last_outbound,
      MAX(sm2.created_at) FILTER (WHERE sm2.direction = 'inbound') AS last_inbound
    FROM sms_messages sm2
    WHERE sm2.organization_id = p_org_id
      AND sm2.created_at >= v_sixty_days_ago
    GROUP BY sm2.profile_id
  ),

  -- NEW: Recent SMS bodies (last 3 messages per student)
  recent_sms AS (
    SELECT
      rsm.profile_id AS pid,
      jsonb_agg(
        jsonb_build_object(
          'direction', rsm.direction,
          'body', LEFT(rsm.body, 200),
          'date', rsm.created_at
        )
        ORDER BY rsm.created_at DESC
      ) AS sms_bodies
    FROM (
      SELECT sm3.*,
        ROW_NUMBER() OVER (PARTITION BY sm3.profile_id ORDER BY sm3.created_at DESC) AS rn
      FROM sms_messages sm3
      WHERE sm3.organization_id = p_org_id
        AND sm3.created_at >= v_sixty_days_ago
    ) rsm
    WHERE rsm.rn <= 3
    GROUP BY rsm.profile_id
  ),

  last_contact AS (
    SELECT DISTINCT ON (i.profile_id)
      i.profile_id AS pid,
      i.created_at AS contact_at,
      i.leader_name AS contact_by,
      i.status AS contact_status
    FROM interactions i
    WHERE i.profile_id IN (SELECT pid FROM metrics)
    ORDER BY i.profile_id, i.created_at DESC
  ),

  notes AS (
    SELECT
      sn.profile_id AS pid,
      jsonb_agg(
        jsonb_build_object(
          'content', sn.content,
          'leader_name', sn.leader_name
        )
        ORDER BY sn.created_at DESC
      ) AS pinned_notes
    FROM (
      SELECT sn2.*,
        ROW_NUMBER() OVER (PARTITION BY sn2.profile_id ORDER BY sn2.created_at DESC) AS rn
      FROM student_notes sn2
      WHERE sn2.is_pinned = true
        AND sn2.profile_id IN (SELECT pid FROM metrics)
    ) sn
    WHERE sn.rn <= 3
    GROUP BY sn.profile_id
  ),

  groups AS (
    SELECT
      gm.profile_id AS pid,
      array_agg(g.name ORDER BY g.name) AS grp_names
    FROM group_memberships gm
    JOIN groups g ON g.id = gm.group_id
    WHERE gm.profile_id IN (SELECT pid FROM metrics)
      AND g.organization_id = p_org_id
      AND g.is_active = true
    GROUP BY gm.profile_id
  ),

  parents AS (
    SELECT DISTINCT ON (psl.student_profile_id)
      psl.student_profile_id AS pid,
      pp.first_name || ' ' || pp.last_name AS parent_name,
      pp.phone_number AS parent_phone
    FROM parent_student_links psl
    JOIN profiles pp ON pp.id = psl.parent_profile_id
    WHERE psl.student_profile_id IN (SELECT pid FROM metrics)
    ORDER BY psl.student_profile_id, psl.is_primary DESC, psl.created_at ASC
  ),

  parent_fallback AS (
    SELECT
      sp.profile_id AS pid,
      COALESCE(sp.father_first_name || ' ' || sp.father_last_name,
               sp.mother_first_name || ' ' || sp.mother_last_name,
               sp.parent_name) AS fb_name,
      COALESCE(sp.father_phone, sp.mother_phone, sp.parent_phone) AS fb_phone
    FROM student_profiles sp
    WHERE sp.profile_id IN (SELECT pid FROM metrics)
      AND (sp.parent_name IS NOT NULL OR sp.father_first_name IS NOT NULL OR sp.mother_first_name IS NOT NULL)
  ),

  -- NEW: Last outbound SMS to parent's phone number
  parent_sms AS (
    SELECT DISTINCT ON (pp_phone.pid)
      pp_phone.pid,
      sm4.created_at AS parent_last_out
    FROM (
      SELECT pa.pid, COALESCE(pa.parent_phone, pf.fb_phone) AS parent_ph
      FROM parents pa
      FULL OUTER JOIN parent_fallback pf ON pf.pid = pa.pid
      WHERE COALESCE(pa.parent_phone, pf.fb_phone) IS NOT NULL
    ) pp_phone
    JOIN sms_messages sm4 ON sm4.to_number = pp_phone.parent_ph
      AND sm4.organization_id = p_org_id
      AND sm4.direction = 'outbound'
    ORDER BY pp_phone.pid, sm4.created_at DESC
  ),

  recs AS (
    SELECT DISTINCT ON (ar.profile_id)
      ar.profile_id AS pid,
      ar.key_insight
    FROM ai_recommendations ar
    WHERE ar.profile_id IN (SELECT pid FROM metrics)
      AND ar.is_dismissed = false
      AND ar.status IN ('pending', 'accepted')
    ORDER BY ar.profile_id, ar.generated_at DESC
  ),

  combined AS (
    SELECT
      m.*,
      pr.prayer_text,
      pr.prayer_at,
      lc.contact_at,
      lc.contact_by,
      lc.contact_status,
      n.pinned_notes,
      g.grp_names,
      pa.parent_name,
      pa.parent_phone,
      pf.fb_name,
      pf.fb_phone,
      rc.key_insight,
      dv.opened_count,
      dv.reflected_count,
      dv.prayed_count,
      dv.journaled_count,
      dv.last_opened,
      s.total_messages AS sms_total,
      s.outbound_count AS sms_outbound,
      s.inbound_count AS sms_inbound,
      s.last_outbound AS sms_last_outbound,
      s.last_inbound AS sms_last_inbound,
      rs.sms_bodies,
      ps.parent_last_out,

      -- Simple relevance score for tiering (NOT for ranking — Claude ranks)
      (
        CASE WHEN m.b_status IN ('Missing', 'On the Fringe') THEN 3
             WHEN m.b_status = 'Connected' THEN 2
             WHEN m.b_status = 'Core' THEN 1
             ELSE 0
        END
        + CASE WHEN m.declining THEN 2 ELSE 0 END
        + CASE WHEN pr.prayer_at >= v_fourteen_days_ago THEN 2 ELSE 0 END
        + CASE WHEN lc.contact_at IS NULL OR lc.contact_at < v_fourteen_days_ago THEN 1 ELSE 0 END
        + CASE WHEN COALESCE(lc.contact_status = 'no_response', false) THEN 1 ELSE 0 END
        + CASE WHEN m.is_new_student THEN 1 ELSE 0 END
      ) AS relevance

    FROM metrics m
    LEFT JOIN prayer pr ON pr.pid = m.pid
    LEFT JOIN devo_engagement dv ON dv.pid = m.pid
    LEFT JOIN sms s ON s.pid = m.pid
    LEFT JOIN recent_sms rs ON rs.pid = m.pid
    LEFT JOIN last_contact lc ON lc.pid = m.pid
    LEFT JOIN notes n ON n.pid = m.pid
    LEFT JOIN groups g ON g.pid = m.pid
    LEFT JOIN parents pa ON pa.pid = m.pid
    LEFT JOIN parent_fallback pf ON pf.pid = m.pid
    LEFT JOIN parent_sms ps ON ps.pid = m.pid
    LEFT JOIN recs rc ON rc.pid = m.pid
  ),

  -- Two-tier selection: signal candidates + healthy roster
  signal_candidates AS (
    SELECT * FROM combined WHERE relevance >= 1
    ORDER BY relevance DESC, days_absent DESC
    LIMIT p_signal_limit
  ),
  healthy_roster AS (
    SELECT * FROM combined WHERE relevance = 0
    ORDER BY last_checkin DESC NULLS LAST
    LIMIT p_healthy_limit
  ),
  all_students AS (
    SELECT *, true AS is_signal FROM signal_candidates
    UNION ALL
    SELECT *, false AS is_signal FROM healthy_roster
  )

  SELECT
    c.pid,
    c.first_name,
    c.last_name,
    c.phone_number,
    c.email,
    c.grade,
    c.gender,
    c.b_status,
    c.days_absent,
    c.last_checkin,  -- last_seen_at
    c.checkins_8w,
    c.checkins_4w,
    c.declining,
    c.is_new_student,
    c.is_signal,  -- is_signal_candidate

    -- Signals JSONB (raw data for Claude)
    jsonb_build_object(
      'attendance_drop', c.declining,
      'checkins_last_4_weeks', c.checkins_4w,
      'checkins_previous_4_weeks', c.checkins_8w - c.checkins_4w,
      'wednesday_count', c.wed_count,
      'sunday_count', c.sun_count,
      'prayer_request_recent', c.prayer_text IS NOT NULL,
      'prayer_request_text', c.prayer_text,
      'prayer_request_date', c.prayer_at,
      'no_leader_contact_days', CASE
        WHEN c.contact_at IS NULL THEN NULL
        ELSE EXTRACT(EPOCH FROM (now() - c.contact_at)) / 86400
      END::INT,
      'no_response_to_outreach', COALESCE(c.contact_status = 'no_response', false),
      'new_student', c.is_new_student,
      'membership_days', EXTRACT(EPOCH FROM (now() - c.membership_created_at)) / 86400
    ),

    c.key_insight,

    COALESCE(c.parent_name, c.fb_name),
    COALESCE(c.parent_phone, c.fb_phone),

    c.contact_at,
    c.contact_by,
    c.contact_status,

    COALESCE(c.pinned_notes, '[]'::JSONB),

    COALESCE(c.grp_names, ARRAY[]::TEXT[]),

    c.prayer_text,

    -- Devotional engagement JSONB
    jsonb_build_object(
      'opened_count', COALESCE(c.opened_count, 0),
      'reflected_count', COALESCE(c.reflected_count, 0),
      'prayed_count', COALESCE(c.prayed_count, 0),
      'journaled_count', COALESCE(c.journaled_count, 0),
      'last_opened', c.last_opened
    ),

    -- SMS activity JSONB
    jsonb_build_object(
      'total_messages', COALESCE(c.sms_total, 0),
      'outbound_count', COALESCE(c.sms_outbound, 0),
      'inbound_count', COALESCE(c.sms_inbound, 0),
      'last_outbound', c.sms_last_outbound,
      'last_inbound', c.sms_last_inbound
    ),

    -- Recent SMS bodies JSONB array (last 3 messages)
    COALESCE(c.sms_bodies, '[]'::JSONB),

    -- Parent last outbound SMS
    c.parent_last_out,

    -- Signals hash for cache invalidation
    md5(
      COALESCE(c.b_status, '') || '|' ||
      COALESCE(c.days_absent::TEXT, '') || '|' ||
      COALESCE(c.checkins_8w::TEXT, '') || '|' ||
      COALESCE(c.checkins_4w::TEXT, '') || '|' ||
      COALESCE(c.declining::TEXT, '') || '|' ||
      COALESCE(c.prayer_text, '') || '|' ||
      COALESCE(c.contact_at::TEXT, '') || '|' ||
      COALESCE(c.contact_status, '') || '|' ||
      COALESCE(c.is_new_student::TEXT, '') || '|' ||
      COALESCE(c.opened_count::TEXT, '0') || '|' ||
      COALESCE(c.sms_inbound::TEXT, '0')
    )

  FROM all_students c
  ORDER BY c.is_signal DESC, c.relevance DESC, c.days_absent DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_copilot_briefing_v3(UUID, INT, INT) TO authenticated;

COMMENT ON FUNCTION get_copilot_briefing_v3 IS
  'V3: Returns signal candidates (relevance >= 1) + healthy roster (relevance = 0) with recent SMS bodies and parent outbound tracking. Two-tier output for AI co-pilot pastoral intelligence briefing.';
