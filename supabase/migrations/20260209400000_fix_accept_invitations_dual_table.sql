-- Fix: accept_pending_invitations now inserts into BOTH organization_members (legacy)
-- AND organization_memberships (new) so the membership is visible in both systems.
-- Also: OrganizationContext now calls accept_pending_invitations on every load,
-- so invitations sent to already-logged-in users get auto-accepted.

CREATE OR REPLACE FUNCTION accept_pending_invitations(p_user_id uuid, p_user_email text, p_display_name text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count INTEGER := 0;
  v_invitation RECORD;
  v_profile_id UUID;
BEGIN
  -- Find or create profile for this user
  SELECT id INTO v_profile_id FROM profiles WHERE user_id = p_user_id LIMIT 1;

  IF v_profile_id IS NULL THEN
    SELECT id INTO v_profile_id FROM profiles WHERE email = p_user_email AND user_id IS NULL LIMIT 1;
    IF v_profile_id IS NOT NULL THEN
      UPDATE profiles SET user_id = p_user_id WHERE id = v_profile_id;
    ELSE
      INSERT INTO profiles (user_id, email, first_name, last_name)
      VALUES (p_user_id, p_user_email, COALESCE(p_display_name, split_part(p_user_email, '@', 1)), '')
      RETURNING id INTO v_profile_id;
    END IF;
  END IF;

  FOR v_invitation IN
    SELECT id, organization_id, role
    FROM organization_invitations
    WHERE email = p_user_email
      AND accepted_at IS NULL
      AND expires_at > NOW()
  LOOP
    -- Legacy table: cast role to org_role enum
    INSERT INTO organization_members (organization_id, user_id, role, status, display_name)
    VALUES (v_invitation.organization_id, p_user_id, v_invitation.role::org_role, 'active', p_display_name)
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        display_name = COALESCE(EXCLUDED.display_name, organization_members.display_name);

    -- New table: role is text, no cast needed
    IF v_profile_id IS NOT NULL THEN
      INSERT INTO organization_memberships (profile_id, organization_id, role, status, display_name, accepted_at)
      VALUES (v_profile_id, v_invitation.organization_id, v_invitation.role, 'active', p_display_name, NOW())
      ON CONFLICT (profile_id, organization_id) DO UPDATE
      SET role = EXCLUDED.role,
          status = 'active',
          display_name = COALESCE(EXCLUDED.display_name, organization_memberships.display_name),
          accepted_at = COALESCE(organization_memberships.accepted_at, NOW());
    END IF;

    UPDATE organization_invitations SET accepted_at = NOW() WHERE id = v_invitation.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
