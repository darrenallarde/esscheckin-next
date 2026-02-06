-- =============================================================================
-- Add prayer_request column to devotional_engagements
-- Changes "prayed" from a toggle to a typed prayer request
-- =============================================================================

-- 1. Add prayer_request column
ALTER TABLE devotional_engagements ADD COLUMN IF NOT EXISTS prayer_request TEXT;

-- 2. Update record_devotional_engagement to handle prayer_request text
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
  v_profile_id UUID;
  v_engagement RECORD;
BEGIN
  -- Get profile for current user
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

  IF v_profile_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No profile found');
  END IF;

  -- Ensure engagement row exists
  INSERT INTO devotional_engagements (devotional_id, profile_id)
  VALUES (p_devotional_id, v_profile_id)
  ON CONFLICT (devotional_id, profile_id) DO NOTHING;

  -- Apply action
  CASE p_action
    WHEN 'opened' THEN
      -- Just ensure the row exists (done above)
      NULL;
    WHEN 'reflected' THEN
      UPDATE devotional_engagements
      SET reflected = NOT reflected,
          reflected_at = CASE WHEN NOT reflected THEN now() ELSE NULL END
      WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;
    WHEN 'prayed' THEN
      -- Now saves prayer request text instead of just toggling
      UPDATE devotional_engagements
      SET prayed = true,
          prayer_request = p_journal_text,
          prayed_at = now()
      WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;
    WHEN 'journaled' THEN
      UPDATE devotional_engagements
      SET journal_entry = p_journal_text,
          journaled_at = CASE WHEN p_journal_text IS NOT NULL AND p_journal_text != '' THEN now() ELSE NULL END
      WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Invalid action: ' || p_action);
  END CASE;

  -- Return updated engagement
  SELECT * INTO v_engagement
  FROM devotional_engagements
  WHERE devotional_id = p_devotional_id AND profile_id = v_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'engagement', jsonb_build_object(
      'reflected', v_engagement.reflected,
      'prayed', v_engagement.prayed,
      'journal_entry', v_engagement.journal_entry,
      'prayer_request', v_engagement.prayer_request,
      'opened_at', v_engagement.opened_at,
      'reflected_at', v_engagement.reflected_at,
      'prayed_at', v_engagement.prayed_at,
      'journaled_at', v_engagement.journaled_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION record_devotional_engagement(UUID, TEXT, TEXT) TO authenticated;

-- 3. Update get_my_devotional_engagement to return prayer_request
CREATE OR REPLACE FUNCTION get_my_devotional_engagement(p_devotional_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id UUID;
  v_engagement RECORD;
BEGIN
  SELECT id INTO v_profile_id
  FROM profiles
  WHERE user_id = auth.uid();

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
      'prayer_request', v_engagement.prayer_request,
      'opened_at', v_engagement.opened_at,
      'reflected_at', v_engagement.reflected_at,
      'prayed_at', v_engagement.prayed_at,
      'journaled_at', v_engagement.journaled_at
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_devotional_engagement(UUID) TO authenticated;
