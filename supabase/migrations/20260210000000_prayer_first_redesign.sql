-- Prayer-First Devotional Redesign
-- Adds: prayer_comments table, prayer_responses columns (viewed_at, liked_at),
--        new RLS policies for student access, 7 new RPCs
-- Does NOT drop journal columns (historical data preserved)

-- ============================================================================
-- 1. Add columns to prayer_responses
-- ============================================================================

ALTER TABLE prayer_responses
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS liked_at TIMESTAMPTZ;

-- ============================================================================
-- 2. Create prayer_comments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS prayer_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  prayer_response_id UUID NOT NULL REFERENCES prayer_responses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prayer_comments_response ON prayer_comments (prayer_response_id);
CREATE INDEX idx_prayer_comments_profile ON prayer_comments (profile_id);

ALTER TABLE prayer_comments ENABLE ROW LEVEL SECURITY;

-- Students can read comments on responses to their own prayers
CREATE POLICY "students_read_own_prayer_comments"
  ON prayer_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM prayer_responses pr
      JOIN devotional_engagements de ON de.id = pr.engagement_id
      WHERE pr.id = prayer_comments.prayer_response_id
        AND de.profile_id = (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    )
  );

-- Students can insert comments on responses to their own prayers
CREATE POLICY "students_insert_own_prayer_comments"
  ON prayer_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    profile_id = (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM prayer_responses pr
      JOIN devotional_engagements de ON de.id = pr.engagement_id
      WHERE pr.id = prayer_comments.prayer_response_id
        AND de.profile_id = (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    )
  );

-- Leaders can read comments in their org
CREATE POLICY "leaders_read_org_prayer_comments"
  ON prayer_comments FOR SELECT
  TO authenticated
  USING (
    auth_has_org_role(organization_id, ARRAY['owner', 'admin', 'leader'])
  );

-- ============================================================================
-- 3. New RLS on prayer_responses for student access
-- ============================================================================

-- Students can read responses to their own prayer requests
CREATE POLICY "students_read_own_prayer_responses"
  ON prayer_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devotional_engagements de
      WHERE de.id = prayer_responses.engagement_id
        AND de.profile_id = (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    )
  );

-- Students can update viewed_at/liked_at on responses to their own prayers
CREATE POLICY "students_update_own_prayer_responses"
  ON prayer_responses FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devotional_engagements de
      WHERE de.id = prayer_responses.engagement_id
        AND de.profile_id = (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devotional_engagements de
      WHERE de.id = prayer_responses.engagement_id
        AND de.profile_id = (SELECT p.id FROM profiles p WHERE p.user_id = auth.uid())
    )
  );

-- ============================================================================
-- 4. RPC: get_prayer_response_detail
-- ============================================================================

CREATE OR REPLACE FUNCTION get_prayer_response_detail(p_response_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'response_id', pr.id,
    'response_type', pr.response_type,
    'message', pr.message,
    'voice_url', pr.voice_url,
    'viewed_at', pr.viewed_at,
    'liked_at', pr.liked_at,
    'created_at', pr.created_at,
    'responder_name', COALESCE(rp.first_name, 'Someone'),
    'prayer_request', de.prayer_request,
    'devotional_title', d.title,
    'devotional_id', d.id,
    'prayer_author_profile_id', de.profile_id,
    'prayer_author_user_id', author.user_id,
    'organization_id', ds.organization_id,
    'comments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pc.id,
        'comment_text', pc.comment_text,
        'created_at', pc.created_at,
        'author_name', COALESCE(cp.first_name, 'Someone')
      ) ORDER BY pc.created_at ASC)
      FROM prayer_comments pc
      JOIN profiles cp ON cp.id = pc.profile_id
      WHERE pc.prayer_response_id = pr.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM prayer_responses pr
  JOIN devotional_engagements de ON de.id = pr.engagement_id
  JOIN devotionals d ON d.id = de.devotional_id
  JOIN devotional_series ds ON ds.id = d.series_id
  JOIN profiles rp ON rp.id = pr.responder_profile_id
  JOIN profiles author ON author.id = de.profile_id
  WHERE pr.id = p_response_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_prayer_response_detail(UUID) TO anon, authenticated;

-- ============================================================================
-- 5. RPC: mark_prayer_response_viewed
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_prayer_response_viewed(p_response_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_prayer_author_id UUID;
BEGIN
  -- Get caller's profile
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Verify caller owns the prayer
  SELECT de.profile_id INTO v_prayer_author_id
  FROM prayer_responses pr
  JOIN devotional_engagements de ON de.id = pr.engagement_id
  WHERE pr.id = p_response_id;

  IF v_prayer_author_id IS NULL OR v_prayer_author_id != v_profile_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Set viewed_at only if not already set
  UPDATE prayer_responses
  SET viewed_at = COALESCE(viewed_at, NOW())
  WHERE id = p_response_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION mark_prayer_response_viewed(UUID) TO authenticated;

-- ============================================================================
-- 6. RPC: like_prayer_response (toggle)
-- ============================================================================

CREATE OR REPLACE FUNCTION like_prayer_response(p_response_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_prayer_author_id UUID;
  v_current_liked TIMESTAMPTZ;
BEGIN
  -- Get caller's profile
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Verify caller owns the prayer
  SELECT de.profile_id, pr.liked_at INTO v_prayer_author_id, v_current_liked
  FROM prayer_responses pr
  JOIN devotional_engagements de ON de.id = pr.engagement_id
  WHERE pr.id = p_response_id;

  IF v_prayer_author_id IS NULL OR v_prayer_author_id != v_profile_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Toggle liked_at
  IF v_current_liked IS NULL THEN
    UPDATE prayer_responses SET liked_at = NOW() WHERE id = p_response_id;
    RETURN jsonb_build_object('success', true, 'liked', true);
  ELSE
    UPDATE prayer_responses SET liked_at = NULL WHERE id = p_response_id;
    RETURN jsonb_build_object('success', true, 'liked', false);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION like_prayer_response(UUID) TO authenticated;

-- ============================================================================
-- 7. RPC: add_prayer_comment
-- ============================================================================

CREATE OR REPLACE FUNCTION add_prayer_comment(p_response_id UUID, p_comment_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_prayer_author_id UUID;
  v_org_id UUID;
  v_comment_id UUID;
BEGIN
  -- Get caller's profile
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Verify caller owns the prayer + get org_id
  SELECT de.profile_id, ds.organization_id INTO v_prayer_author_id, v_org_id
  FROM prayer_responses pr
  JOIN devotional_engagements de ON de.id = pr.engagement_id
  JOIN devotionals d ON d.id = de.devotional_id
  JOIN devotional_series ds ON ds.id = d.series_id
  WHERE pr.id = p_response_id;

  IF v_prayer_author_id IS NULL OR v_prayer_author_id != v_profile_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Insert comment
  INSERT INTO prayer_comments (prayer_response_id, profile_id, organization_id, comment_text)
  VALUES (p_response_id, v_profile_id, v_org_id, p_comment_text)
  RETURNING id INTO v_comment_id;

  RETURN jsonb_build_object('success', true, 'comment_id', v_comment_id);
END;
$$;

GRANT EXECUTE ON FUNCTION add_prayer_comment(UUID, TEXT) TO authenticated;

-- ============================================================================
-- 8. RPC: get_my_prayer_requests
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_prayer_requests()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(prayer_row ORDER BY prayed_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'engagement_id', de.id,
      'prayer_request', de.prayer_request,
      'prayed_at', de.prayed_at,
      'devotional_title', d.title,
      'devotional_id', d.id,
      'scheduled_date', d.scheduled_date,
      'responses', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'response_id', pr.id,
          'response_type', pr.response_type,
          'message', pr.message,
          'voice_url', pr.voice_url,
          'viewed_at', pr.viewed_at,
          'liked_at', pr.liked_at,
          'created_at', pr.created_at,
          'responder_name', COALESCE(rp.first_name, 'Someone'),
          'comment_count', (SELECT COUNT(*) FROM prayer_comments pc WHERE pc.prayer_response_id = pr.id)
        ) ORDER BY pr.created_at ASC)
        FROM prayer_responses pr
        JOIN profiles rp ON rp.id = pr.responder_profile_id
        WHERE pr.engagement_id = de.id
      ), '[]'::jsonb)
    ) AS prayer_row,
    de.prayed_at
    FROM devotional_engagements de
    JOIN devotionals d ON d.id = de.devotional_id
    WHERE de.profile_id = v_profile_id
      AND de.prayer_request IS NOT NULL
      AND de.prayer_request != ''
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_prayer_requests() TO authenticated;

-- ============================================================================
-- 9. RPC: get_my_recent_devotionals
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_recent_devotionals(p_limit INT DEFAULT 20)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_result JSONB;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(devo_row ORDER BY opened_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'devotional_id', d.id,
      'title', d.title,
      'scheduled_date', d.scheduled_date,
      'opened_at', de.opened_at,
      'reflected', de.reflected,
      'prayed', de.prayed,
      'has_prayer_request', (de.prayer_request IS NOT NULL AND de.prayer_request != '')
    ) AS devo_row,
    de.opened_at
    FROM devotional_engagements de
    JOIN devotionals d ON d.id = de.devotional_id
    WHERE de.profile_id = v_profile_id
    LIMIT p_limit
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_recent_devotionals(INT) TO authenticated;

-- ============================================================================
-- 10. RPC: update_my_profile
-- ============================================================================

CREATE OR REPLACE FUNCTION update_my_profile(
  p_first_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_grade TEXT DEFAULT NULL,
  p_high_school TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = auth.uid();
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Update profiles table
  UPDATE profiles SET
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    email = COALESCE(p_email, email),
    phone_number = COALESCE(p_phone_number, phone_number),
    updated_at = NOW()
  WHERE id = v_profile_id;

  -- Update student_profiles if grade or school provided
  IF p_grade IS NOT NULL OR p_high_school IS NOT NULL THEN
    INSERT INTO student_profiles (profile_id, grade, high_school)
    VALUES (v_profile_id, p_grade, p_high_school)
    ON CONFLICT (profile_id) DO UPDATE SET
      grade = COALESCE(p_grade, student_profiles.grade),
      high_school = COALESCE(p_high_school, student_profiles.high_school);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION update_my_profile(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
