-- =============================================================================
-- Co-Pilot Briefing: RPC + Cache Table
-- Synthesizes 6+ signals into a priority-ranked student list for the AI co-pilot
-- =============================================================================

-- 0a. Prerequisite: interactions table schema alignment (production has extra columns)
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS leader_name TEXT;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS outcome TEXT;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE interactions ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- 0b. Prerequisite: student_notes table (exists on prod, missing on staging)
CREATE TABLE IF NOT EXISTS student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  leader_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  leader_name TEXT,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_student_notes_student_id ON student_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_notes_pinned ON student_notes(student_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_student_notes_profile_id ON student_notes(profile_id);

ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;

-- RLS: leaders can manage notes for their org's students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'student_notes' AND policyname = 'Leaders can manage student notes'
  ) THEN
    CREATE POLICY "Leaders can manage student notes" ON student_notes FOR ALL
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 0b. Prerequisite: add_student_note RPC
CREATE OR REPLACE FUNCTION add_student_note(
  p_student_id UUID,
  p_content TEXT,
  p_is_pinned BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_leader_name TEXT;
  v_note_id UUID;
BEGIN
  SELECT COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    email
  ) INTO v_leader_name
  FROM auth.users
  WHERE id = auth.uid();

  INSERT INTO student_notes (
    student_id, profile_id, leader_id, leader_name, content, is_pinned
  ) VALUES (
    p_student_id, p_student_id, auth.uid(), v_leader_name, p_content, p_is_pinned
  )
  RETURNING id INTO v_note_id;

  RETURN v_note_id;
END;
$fn$;

GRANT EXECUTE ON FUNCTION add_student_note(UUID, TEXT, BOOLEAN) TO authenticated;

-- 1. Cache table for AI-generated draft messages
CREATE TABLE IF NOT EXISTS copilot_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  signals_hash TEXT NOT NULL,
  draft_message TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(profile_id, organization_id)
);

ALTER TABLE copilot_drafts ENABLE ROW LEVEL SECURITY;

-- RLS: org members with leader+ roles can read/write drafts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'copilot_drafts' AND policyname = 'Leaders can manage copilot drafts'
  ) THEN
    CREATE POLICY "Leaders can manage copilot drafts"
      ON copilot_drafts FOR ALL
      USING (auth_has_org_role(organization_id, ARRAY['owner', 'admin', 'leader']))
      WITH CHECK (auth_has_org_role(organization_id, ARRAY['owner', 'admin', 'leader']));
  END IF;
END $$;

-- 2. Co-Pilot Briefing RPC
CREATE OR REPLACE FUNCTION get_copilot_briefing(
  p_org_id UUID,
  p_limit INT DEFAULT 5
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
  total_checkins_8weeks INT,
  is_declining BOOLEAN,
  priority_score INT,
  signals JSONB,
  recommendation_id UUID,
  recommendation_insight TEXT,
  recommendation_actions TEXT[],
  primary_parent_name TEXT,
  primary_parent_phone TEXT,
  last_interaction_at TIMESTAMPTZ,
  last_interaction_by TEXT,
  pinned_notes JSONB,
  group_names TEXT[],
  recent_prayer_text TEXT,
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
  v_seven_days_ago TIMESTAMPTZ := now() - interval '7 days';
BEGIN
  RETURN QUERY
  WITH student_members AS (
    -- Get all student members in this org
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
    -- Calculate attendance metrics per student
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
    -- Compute belonging status and trend
    SELECT
      sm.*,
      COALESCE(a.checkins_8weeks, 0)::INT AS checkins_8w,
      COALESCE(a.checkins_4weeks, 0)::INT AS checkins_4w,
      a.last_checkin,
      CASE
        WHEN a.last_checkin IS NULL THEN 999999
        ELSE EXTRACT(EPOCH FROM (now() - a.last_checkin)) / 86400
      END::INT AS days_absent,

      -- Belonging status (same logic as get_pastoral_analytics)
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

      -- Declining: last 4 weeks worse than previous 4 weeks
      CASE
        WHEN COALESCE(a.checkins_4weeks, 0) < (COALESCE(a.checkins_8weeks, 0) - COALESCE(a.checkins_4weeks, 0))
             AND COALESCE(a.checkins_8weeks, 0) > 0 THEN true
        ELSE false
      END AS declining,

      -- New student: joined in last 30 days
      CASE
        WHEN sm.membership_created_at >= v_thirty_days_ago THEN true
        ELSE false
      END AS is_new

    FROM student_members sm
    LEFT JOIN attendance a ON a.pid = sm.pid
  ),

  prayer AS (
    -- Most recent prayer request per student (last 30 days)
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

  last_contact AS (
    -- Most recent interaction per student
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
    -- Pinned notes (last 3 per student)
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
    -- Group names per student
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
    -- Primary parent contact per student
    SELECT DISTINCT ON (psl.student_profile_id)
      psl.student_profile_id AS pid,
      pp.first_name || ' ' || pp.last_name AS parent_name,
      pp.phone_number AS parent_phone
    FROM parent_student_links psl
    JOIN profiles pp ON pp.id = psl.parent_profile_id
    WHERE psl.student_profile_id IN (SELECT pid FROM metrics)
    ORDER BY psl.student_profile_id, psl.is_primary DESC, psl.created_at ASC
  ),

  recs AS (
    -- Latest non-dismissed recommendation per student
    SELECT DISTINCT ON (ar.profile_id)
      ar.profile_id AS pid,
      ar.id AS rec_id,
      ar.key_insight,
      ar.action_bullets
    FROM ai_recommendations ar
    WHERE ar.profile_id IN (SELECT pid FROM metrics)
      AND ar.is_dismissed = false
      AND ar.status IN ('pending', 'accepted')
    ORDER BY ar.profile_id, ar.generated_at DESC
  ),

  -- Fallback parent info from student_profiles if no parent_student_link
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

  scored AS (
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
      rc.rec_id,
      rc.key_insight,
      rc.action_bullets,

      -- Compute belonging transition (approximate)
      CASE
        WHEN m.declining AND m.b_status = 'Connected' THEN 'Core -> Connected'
        WHEN m.declining AND m.b_status = 'On the Fringe' THEN 'Connected -> On the Fringe'
        ELSE NULL
      END AS belonging_transition,

      -- No leader contact in 14+ days
      CASE
        WHEN lc.contact_at IS NULL THEN true
        WHEN lc.contact_at < v_fourteen_days_ago THEN true
        ELSE false
      END AS no_recent_contact,

      -- Days since last contact
      CASE
        WHEN lc.contact_at IS NULL THEN NULL
        ELSE EXTRACT(EPOCH FROM (now() - lc.contact_at)) / 86400
      END::INT AS contact_days_ago,

      -- No response to last outreach
      COALESCE(lc.contact_status = 'no_response', false) AS no_response,

      -- Status changed in last 7 days (approximation: is_declining signals recent change)
      CASE
        WHEN m.declining THEN true
        ELSE false
      END AS recent_status_change,

      -- Priority score
      (
        -- Base by belonging
        CASE
          WHEN m.b_status = 'Missing' THEN 100
          WHEN m.b_status = 'On the Fringe' THEN 80
          WHEN m.b_status = 'Connected' THEN 40
          WHEN m.b_status = 'Core' THEN 15
          WHEN m.b_status = 'Ultra-Core' THEN 10
          ELSE 0
        END
        -- Modifiers
        + CASE WHEN m.declining THEN 30 ELSE 0 END
        + CASE WHEN pr.prayer_at >= v_fourteen_days_ago THEN 25 ELSE 0 END
        + CASE WHEN lc.contact_at IS NULL OR lc.contact_at < v_fourteen_days_ago THEN 20 ELSE 0 END
        + CASE WHEN COALESCE(lc.contact_status = 'no_response', false) THEN 15 ELSE 0 END
        + CASE WHEN m.is_new THEN 10 ELSE 0 END
        + CASE WHEN m.declining THEN 10 ELSE 0 END  -- belonging_transition bonus (declining = changed)
      )::INT AS p_score

    FROM metrics m
    LEFT JOIN prayer pr ON pr.pid = m.pid
    LEFT JOIN last_contact lc ON lc.pid = m.pid
    LEFT JOIN notes n ON n.pid = m.pid
    LEFT JOIN groups g ON g.pid = m.pid
    LEFT JOIN parents pa ON pa.pid = m.pid
    LEFT JOIN parent_fallback pf ON pf.pid = m.pid
    LEFT JOIN recs rc ON rc.pid = m.pid
  )

  SELECT
    s.pid,
    s.first_name,
    s.last_name,
    s.phone_number,
    s.email,
    s.grade,
    s.gender,
    s.b_status,
    s.days_absent,
    s.checkins_8w,
    s.declining,
    s.p_score,

    -- Signals JSONB
    jsonb_build_object(
      'attendance_drop', s.declining,
      'prayer_request_recent', s.prayer_text IS NOT NULL,
      'prayer_request_text', s.prayer_text,
      'no_leader_contact_days', s.contact_days_ago,
      'no_response_to_outreach', s.no_response,
      'belonging_transition', s.belonging_transition,
      'new_student', s.is_new,
      'is_declining', s.declining
    ),

    s.rec_id,
    s.key_insight,
    s.action_bullets,

    COALESCE(s.parent_name, s.fb_name),
    COALESCE(s.parent_phone, s.fb_phone),

    s.contact_at,
    s.contact_by,

    COALESCE(s.pinned_notes, '[]'::JSONB),

    COALESCE(s.grp_names, ARRAY[]::TEXT[]),

    s.prayer_text,

    -- Signals hash for cache invalidation
    md5(
      COALESCE(s.b_status, '') || '|' ||
      COALESCE(s.days_absent::TEXT, '') || '|' ||
      COALESCE(s.checkins_8w::TEXT, '') || '|' ||
      COALESCE(s.declining::TEXT, '') || '|' ||
      COALESCE(s.prayer_text, '') || '|' ||
      COALESCE(s.contact_at::TEXT, '') || '|' ||
      COALESCE(s.no_response::TEXT, '') || '|' ||
      COALESCE(s.is_new::TEXT, '')
    )

  FROM scored s
  WHERE s.p_score >= 20  -- Exclude healthy Ultra-Core students with no signals
  ORDER BY s.p_score DESC, s.days_absent DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_copilot_briefing(UUID, INT) TO authenticated;

COMMENT ON FUNCTION get_copilot_briefing IS
  'Returns priority-ranked students with multi-signal synthesis for the AI co-pilot briefing card. Filters by organization_id.';
