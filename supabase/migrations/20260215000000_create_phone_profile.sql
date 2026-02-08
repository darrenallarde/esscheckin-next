-- Create a profile for new players who sign in via phone OTP on the game page.
-- Used when link_phone_to_profile returns "no profile found" — meaning the
-- student doesn't exist in the system yet.

CREATE OR REPLACE FUNCTION public.create_phone_profile(
  p_phone TEXT,
  p_org_id UUID,
  p_first_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_normalized TEXT;
  v_profile_id UUID;
  v_existing RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Normalize phone
  v_normalized := regexp_replace(p_phone, '[^0-9]', '', 'g');
  IF length(v_normalized) = 10 THEN
    v_normalized := '+1' || v_normalized;
  ELSIF length(v_normalized) = 11 AND left(v_normalized, 1) = '1' THEN
    v_normalized := '+' || v_normalized;
  ELSIF left(p_phone, 1) = '+' THEN
    v_normalized := '+' || v_normalized;
  END IF;

  -- Double check: maybe profile exists now (race condition guard)
  SELECT id, first_name, user_id INTO v_existing
  FROM profiles
  WHERE phone_number = v_normalized OR phone_number = p_phone
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    -- Link if not already linked
    IF v_existing.user_id IS NULL THEN
      UPDATE profiles SET user_id = v_user_id, updated_at = now() WHERE id = v_existing.id;
    END IF;
    RETURN jsonb_build_object('success', true, 'profile_id', v_existing.id, 'first_name', v_existing.first_name);
  END IF;

  -- Validate org exists
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Organization not found');
  END IF;

  -- Create the profile
  INSERT INTO profiles (phone_number, first_name, user_id, organization_id)
  VALUES (v_normalized, trim(p_first_name), v_user_id, p_org_id)
  RETURNING id INTO v_profile_id;

  -- Create organization membership as 'student'
  INSERT INTO organization_memberships (profile_id, organization_id, role)
  VALUES (v_profile_id, p_org_id, 'student')
  ON CONFLICT (profile_id, organization_id) DO NOTHING;

  RETURN jsonb_build_object('success', true, 'profile_id', v_profile_id, 'first_name', trim(p_first_name));
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_phone_profile(TEXT, UUID, TEXT) TO authenticated;
