-- Phone OTP codes table (service role only)
CREATE TABLE IF NOT EXISTS phone_otp_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX idx_phone_otp_codes_phone_expires ON phone_otp_codes (phone, expires_at DESC);

-- RLS: deny all (service role only)
ALTER TABLE phone_otp_codes ENABLE ROW LEVEL SECURITY;
-- No policies = no access for anon/authenticated. Service role bypasses RLS.

-- Prayer responses table
CREATE TABLE IF NOT EXISTS prayer_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  engagement_id UUID NOT NULL REFERENCES devotional_engagements(id) ON DELETE CASCADE,
  responder_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('text', 'voice', 'pray')),
  message TEXT,
  voice_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prayer_responses_engagement ON prayer_responses (engagement_id);
CREATE INDEX idx_prayer_responses_responder ON prayer_responses (responder_profile_id);

-- RLS for prayer_responses
ALTER TABLE prayer_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaders can read prayer responses for their org"
  ON prayer_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devotional_engagements de
      JOIN devotionals d ON d.id = de.devotional_id
      JOIN devotional_series ds ON ds.id = d.series_id
      WHERE de.id = prayer_responses.engagement_id
      AND auth_has_org_role(ds.organization_id, ARRAY['owner', 'admin', 'leader'])
    )
  );

CREATE POLICY "Leaders can insert prayer responses for their org"
  ON prayer_responses FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devotional_engagements de
      JOIN devotionals d ON d.id = de.devotional_id
      JOIN devotional_series ds ON ds.id = d.series_id
      WHERE de.id = prayer_responses.engagement_id
      AND auth_has_org_role(ds.organization_id, ARRAY['owner', 'admin', 'leader'])
    )
  );

-- RPC: Get prayer requests for an org
CREATE OR REPLACE FUNCTION get_org_prayer_requests(
  p_org_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  engagement_id UUID,
  prayer_request TEXT,
  prayed_at TIMESTAMPTZ,
  profile_id UUID,
  first_name TEXT,
  last_name TEXT,
  phone_number TEXT,
  devotional_title TEXT,
  scheduled_date DATE,
  response_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Auth check
  IF NOT auth_has_org_role(p_org_id, ARRAY['owner', 'admin', 'leader']) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    de.id AS engagement_id,
    de.prayer_request,
    de.created_at AS prayed_at,
    p.id AS profile_id,
    p.first_name,
    p.last_name,
    p.phone_number,
    d.title AS devotional_title,
    d.scheduled_date,
    COALESCE(pr_count.cnt, 0) AS response_count
  FROM devotional_engagements de
  JOIN profiles p ON p.id = de.profile_id
  JOIN devotionals d ON d.id = de.devotional_id
  JOIN devotional_series ds ON ds.id = d.series_id
  LEFT JOIN (
    SELECT pr.engagement_id AS eid, COUNT(*) AS cnt
    FROM prayer_responses pr
    GROUP BY pr.engagement_id
  ) pr_count ON pr_count.eid = de.id
  WHERE ds.organization_id = p_org_id
    AND de.prayer_request IS NOT NULL
    AND de.prayer_request != ''
  ORDER BY de.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_org_prayer_requests TO authenticated;

-- RPC: Respond to a prayer request
CREATE OR REPLACE FUNCTION respond_to_prayer(
  p_engagement_id UUID,
  p_response_type TEXT,
  p_message TEXT DEFAULT NULL,
  p_voice_url TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id UUID;
  v_responder_profile_id UUID;
  v_response_id UUID;
BEGIN
  -- Find org from engagement
  SELECT ds.organization_id INTO v_org_id
  FROM devotional_engagements de
  JOIN devotionals d ON d.id = de.devotional_id
  JOIN devotional_series ds ON ds.id = d.series_id
  WHERE de.id = p_engagement_id;

  IF v_org_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Engagement not found');
  END IF;

  -- Auth check
  IF NOT auth_has_org_role(v_org_id, ARRAY['owner', 'admin', 'leader']) THEN
    RETURN json_build_object('success', false, 'error', 'Access denied');
  END IF;

  -- Get responder profile
  SELECT p.id INTO v_responder_profile_id
  FROM profiles p
  WHERE p.user_id = auth.uid();

  IF v_responder_profile_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Profile not found');
  END IF;

  -- Insert response
  INSERT INTO prayer_responses (engagement_id, responder_profile_id, response_type, message, voice_url)
  VALUES (p_engagement_id, v_responder_profile_id, p_response_type, p_message, p_voice_url)
  RETURNING id INTO v_response_id;

  RETURN json_build_object('success', true, 'response_id', v_response_id);
END;
$$;

GRANT EXECUTE ON FUNCTION respond_to_prayer TO authenticated;

-- Storage bucket for prayer voice memos
INSERT INTO storage.buckets (id, name, public)
VALUES ('prayer-voice-memos', 'prayer-voice-memos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Auth users can upload voice memos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'prayer-voice-memos');

CREATE POLICY "Public can read voice memos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'prayer-voice-memos');
