-- =============================================================================
-- Phase 2: Student Auth + Devotional Engagement
-- =============================================================================
-- Tables: student_auth_usernames, devotional_engagements
-- RPCs: link_phone_to_profile, link_email_to_profile, check_username_available,
--       find_profile_for_signup, record_devotional_engagement, get_my_devotional_engagement
-- =============================================================================

-- 1. student_auth_usernames: username/password login mapping
CREATE TABLE IF NOT EXISTS student_auth_usernames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, username)
);

ALTER TABLE student_auth_usernames ENABLE ROW LEVEL SECURITY;

-- RLS: service role only (managed via API route)
CREATE POLICY "Service role full access on student_auth_usernames"
  ON student_auth_usernames FOR ALL
  USING (false)
  WITH CHECK (false);

-- 2. devotional_engagements: track student engagement with devotionals
CREATE TABLE IF NOT EXISTS devotional_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devotional_id UUID NOT NULL REFERENCES devotionals(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reflected BOOLEAN DEFAULT false,
  prayed BOOLEAN DEFAULT false,
  journal_entry TEXT,
  opened_at TIMESTAMPTZ DEFAULT now(),
  reflected_at TIMESTAMPTZ,
  prayed_at TIMESTAMPTZ,
  journaled_at TIMESTAMPTZ,
  UNIQUE(devotional_id, profile_id)
);

ALTER TABLE devotional_engagements ENABLE ROW LEVEL SECURITY;

-- RLS: Students can manage their own engagements
CREATE POLICY "Users can read own engagements"
  ON devotional_engagements FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own engagements"
  ON devotional_engagements FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own engagements"
  ON devotional_engagements FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IN (
      SELECT id FROM profiles WHERE user_id = auth.uid()
    )
  );

-- Leaders can read engagements for students in their org
CREATE POLICY "Leaders can read org engagements"
  ON devotional_engagements FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM organization_memberships om
      JOIN profiles p ON p.user_id = auth.uid()
      WHERE om.profile_id = p.id
        AND om.role IN ('owner', 'admin', 'leader')
        AND om.status = 'active'
        AND om.organization_id IN (
          SELECT om2.organization_id
          FROM organization_memberships om2
          WHERE om2.profile_id = devotional_engagements.profile_id
            AND om2.status = 'active'
        )
    )
  );

-- =============================================================================
-- RPC Functions
-- =============================================================================

-- 3. link_phone_to_profile: After phone OTP, link auth user to profile
CREATE OR REPLACE FUNCTION link_phone_to_profile(p_phone TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Normalize phone: strip everything except digits, then add +1 if 10 digits
  DECLARE
    v_normalized TEXT;
  BEGIN
    v_normalized := regexp_replace(p_phone, '[^0-9]', '', 'g');
    IF length(v_normalized) = 10 THEN
      v_normalized := '+1' || v_normalized;
    ELSIF length(v_normalized) = 11 AND left(v_normalized, 1) = '1' THEN
      v_normalized := '+' || v_normalized;
    ELSIF left(p_phone, 1) = '+' THEN
      v_normalized := '+' || v_normalized;
    END IF;

    -- Find profile by phone
    SELECT p.id, p.first_name, p.user_id
    INTO v_profile
    FROM profiles p
    WHERE p.phone_number = v_normalized
      OR p.phone_number = p_phone
    LIMIT 1;
  END;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No profile found with this phone number');
  END IF;

  IF v_profile.user_id IS NOT NULL AND v_profile.user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is already linked to another account');
  END IF;

  IF v_profile.user_id = v_user_id THEN
    RETURN jsonb_build_object('success', true, 'profile_id', v_profile.id, 'first_name', v_profile.first_name, 'already_linked', true);
  END IF;

  -- Link profile to auth user
  UPDATE profiles SET user_id = v_user_id, updated_at = now()
  WHERE id = v_profile.id;

  RETURN jsonb_build_object('success', true, 'profile_id', v_profile.id, 'first_name', v_profile.first_name, 'already_linked', false);
END;
$$;

GRANT EXECUTE ON FUNCTION link_phone_to_profile(TEXT) TO authenticated;

-- 4. link_email_to_profile: After email OTP, link auth user to profile
CREATE OR REPLACE FUNCTION link_email_to_profile(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_normalized TEXT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  v_normalized := lower(trim(p_email));

  SELECT p.id, p.first_name, p.user_id
  INTO v_profile
  FROM profiles p
  WHERE lower(trim(p.email)) = v_normalized
  LIMIT 1;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No profile found with this email address');
  END IF;

  IF v_profile.user_id IS NOT NULL AND v_profile.user_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'This profile is already linked to another account');
  END IF;

  IF v_profile.user_id = v_user_id THEN
    RETURN jsonb_build_object('success', true, 'profile_id', v_profile.id, 'first_name', v_profile.first_name, 'already_linked', true);
  END IF;

  UPDATE profiles SET user_id = v_user_id, updated_at = now()
  WHERE id = v_profile.id;

  RETURN jsonb_build_object('success', true, 'profile_id', v_profile.id, 'first_name', v_profile.first_name, 'already_linked', false);
END;
$$;

GRANT EXECUTE ON FUNCTION link_email_to_profile(TEXT) TO authenticated;

-- 5. check_username_available: Live validation for username signup
CREATE OR REPLACE FUNCTION check_username_available(p_org_id UUID, p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM student_auth_usernames
    WHERE organization_id = p_org_id
      AND lower(username) = lower(trim(p_username))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_username_available(UUID, TEXT) TO anon, authenticated;

-- 6. find_profile_for_signup: Identify a student by phone or email (minimal data)
CREATE OR REPLACE FUNCTION find_profile_for_signup(p_org_id UUID, p_identifier TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_normalized_phone TEXT;
  v_normalized_email TEXT;
BEGIN
  -- Try as phone first: strip non-digits, normalize
  v_normalized_phone := regexp_replace(trim(p_identifier), '[^0-9]', '', 'g');
  IF length(v_normalized_phone) = 10 THEN
    v_normalized_phone := '+1' || v_normalized_phone;
  ELSIF length(v_normalized_phone) = 11 AND left(v_normalized_phone, 1) = '1' THEN
    v_normalized_phone := '+' || v_normalized_phone;
  END IF;

  -- Try as email
  v_normalized_email := lower(trim(p_identifier));

  -- Search for matching profile in this org
  SELECT p.id, p.first_name, p.user_id
  INTO v_profile
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  WHERE om.organization_id = p_org_id
    AND om.status = 'active'
    AND (
      (length(v_normalized_phone) >= 10 AND (p.phone_number = v_normalized_phone OR p.phone_number = p_identifier))
      OR (v_normalized_email LIKE '%@%' AND lower(trim(p.email)) = v_normalized_email)
    )
  LIMIT 1;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF v_profile.user_id IS NOT NULL THEN
    RETURN jsonb_build_object('found', true, 'already_linked', true, 'first_name', v_profile.first_name);
  END IF;

  RETURN jsonb_build_object('found', true, 'already_linked', false, 'profile_id', v_profile.id, 'first_name', v_profile.first_name);
END;
$$;

GRANT EXECUTE ON FUNCTION find_profile_for_signup(UUID, TEXT) TO anon, authenticated;

-- 7. record_devotional_engagement: Upsert engagement actions
CREATE OR REPLACE FUNCTION record_devotional_engagement(
  p_devotional_id UUID,
  p_action TEXT,
  p_journal_text TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_engagement RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No profile linked to this account');
  END IF;

  -- Upsert base engagement row
  INSERT INTO devotional_engagements (devotional_id, profile_id)
  VALUES (p_devotional_id, v_profile_id)
  ON CONFLICT (devotional_id, profile_id) DO NOTHING;

  -- Apply action
  CASE p_action
    WHEN 'opened' THEN
      -- opened_at is set on insert, nothing to update
      NULL;
    WHEN 'reflected' THEN
      UPDATE devotional_engagements
      SET reflected = NOT reflected,
          reflected_at = CASE WHEN NOT reflected THEN now() ELSE NULL END
      WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;
    WHEN 'prayed' THEN
      UPDATE devotional_engagements
      SET prayed = NOT prayed,
          prayed_at = CASE WHEN NOT prayed THEN now() ELSE NULL END
      WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;
    WHEN 'journaled' THEN
      UPDATE devotional_engagements
      SET journal_entry = p_journal_text,
          journaled_at = CASE WHEN p_journal_text IS NOT NULL AND p_journal_text != '' THEN now() ELSE NULL END
      WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid action: ' || p_action);
  END CASE;

  -- Return current state
  SELECT * INTO v_engagement
  FROM devotional_engagements
  WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'engagement', jsonb_build_object(
      'reflected', v_engagement.reflected,
      'prayed', v_engagement.prayed,
      'journal_entry', v_engagement.journal_entry,
      'opened_at', v_engagement.opened_at,
      'reflected_at', v_engagement.reflected_at,
      'prayed_at', v_engagement.prayed_at,
      'journaled_at', v_engagement.journaled_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_devotional_engagement(UUID, TEXT, TEXT) TO authenticated;

-- 8. get_my_devotional_engagement: Get current user's engagement for a devotional
CREATE OR REPLACE FUNCTION get_my_devotional_engagement(p_devotional_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile_id UUID;
  v_engagement RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT id INTO v_profile_id FROM profiles WHERE user_id = v_user_id;
  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT * INTO v_engagement
  FROM devotional_engagements
  WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;

  IF v_engagement IS NULL THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'engagement', jsonb_build_object(
      'reflected', v_engagement.reflected,
      'prayed', v_engagement.prayed,
      'journal_entry', v_engagement.journal_entry,
      'opened_at', v_engagement.opened_at,
      'reflected_at', v_engagement.reflected_at,
      'prayed_at', v_engagement.prayed_at,
      'journaled_at', v_engagement.journaled_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_devotional_engagement(UUID) TO authenticated;
