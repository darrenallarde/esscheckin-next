-- Migration: Add display_name to organization_members for SMS sender identity
-- Applied: 2026-02-03

-- Add display_name column to organization_members
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS display_name TEXT;

COMMENT ON COLUMN organization_members.display_name IS 'Team member display name for messaging (e.g., "Pastor Mike")';

-- Drop existing function to update return type
DROP FUNCTION IF EXISTS get_organization_members(UUID);

-- Recreate get_organization_members RPC with display_name
CREATE OR REPLACE FUNCTION get_organization_members(p_organization_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT,
  status TEXT,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    om.id AS member_id,
    om.user_id,
    COALESCE(u.email, '') AS email,
    om.display_name,
    om.role,
    om.status,
    om.created_at AS invited_at,
    CASE WHEN om.status = 'active' THEN om.created_at ELSE NULL END AS accepted_at
  FROM organization_members om
  LEFT JOIN auth.users u ON u.id = om.user_id
  WHERE om.organization_id = p_organization_id
  ORDER BY om.created_at ASC;
$$;

-- Add function to update member's display_name
CREATE OR REPLACE FUNCTION update_member_display_name(
  p_organization_id UUID,
  p_user_id UUID,
  p_display_name TEXT
)
RETURNS TABLE (success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Get the current user
  v_caller_id := auth.uid();

  -- Check if caller is the user themselves or an admin/owner
  IF v_caller_id = p_user_id THEN
    -- User updating their own name - always allowed
    UPDATE organization_members
    SET display_name = p_display_name
    WHERE organization_id = p_organization_id
      AND user_id = p_user_id;

    IF NOT FOUND THEN
      RETURN QUERY SELECT false, 'Member not found';
      RETURN;
    END IF;

    RETURN QUERY SELECT true, 'Display name updated';
    RETURN;
  END IF;

  -- Check if caller is admin/owner of the org
  SELECT role INTO v_caller_role
  FROM organization_members
  WHERE organization_id = p_organization_id
    AND user_id = v_caller_id
    AND status = 'active';

  IF v_caller_role NOT IN ('admin', 'owner') THEN
    RETURN QUERY SELECT false, 'Permission denied';
    RETURN;
  END IF;

  UPDATE organization_members
  SET display_name = p_display_name
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Member not found';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'Display name updated';
END;
$$;

-- Add function to get current user's profile for an org
CREATE OR REPLACE FUNCTION get_my_org_profile(p_organization_id UUID)
RETURNS TABLE (
  member_id UUID,
  user_id UUID,
  email TEXT,
  display_name TEXT,
  role TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    om.id AS member_id,
    om.user_id,
    COALESCE(u.email, '') AS email,
    om.display_name,
    om.role
  FROM organization_members om
  LEFT JOIN auth.users u ON u.id = om.user_id
  WHERE om.organization_id = p_organization_id
    AND om.user_id = auth.uid()
    AND om.status = 'active'
  LIMIT 1;
$$;

-- Drop existing accept_pending_invitations to change signature
DROP FUNCTION IF EXISTS accept_pending_invitations(UUID, TEXT);

-- Recreate with display_name parameter
CREATE OR REPLACE FUNCTION accept_pending_invitations(
  p_user_id UUID,
  p_user_email TEXT,
  p_display_name TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_invitation RECORD;
BEGIN
  -- Find all pending invitations for this email
  FOR v_invitation IN
    SELECT id, organization_id, role
    FROM organization_invitations
    WHERE email = p_user_email
      AND accepted_at IS NULL
      AND expires_at > NOW()
  LOOP
    -- Create the organization membership
    INSERT INTO organization_members (organization_id, user_id, role, status, display_name)
    VALUES (v_invitation.organization_id, p_user_id, v_invitation.role::TEXT, 'active', p_display_name)
    ON CONFLICT (organization_id, user_id) DO UPDATE
    SET role = EXCLUDED.role,
        status = 'active',
        display_name = COALESCE(EXCLUDED.display_name, organization_members.display_name);

    -- Mark invitation as accepted
    UPDATE organization_invitations
    SET accepted_at = NOW()
    WHERE id = v_invitation.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Add unique constraint on organization_id + user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_members_organization_id_user_id_key'
  ) THEN
    ALTER TABLE organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key
    UNIQUE (organization_id, user_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
