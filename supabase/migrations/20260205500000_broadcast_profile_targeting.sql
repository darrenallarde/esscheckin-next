-- Support targeting specific profiles in broadcasts (for Insights "Message All" action)
-- This enables sending broadcasts to a specific list of profile IDs

-- ============================================
-- Add target_profile_ids column to sms_broadcasts
-- ============================================
ALTER TABLE sms_broadcasts
ADD COLUMN IF NOT EXISTS target_profile_ids UUID[];

-- Update target_type check constraint to include 'profiles'
ALTER TABLE sms_broadcasts DROP CONSTRAINT IF EXISTS sms_broadcasts_target_type_check;
ALTER TABLE sms_broadcasts ADD CONSTRAINT sms_broadcasts_target_type_check
  CHECK (target_type IN ('all', 'groups', 'profiles'));

-- ============================================
-- Update get_broadcast_recipients to support profile targeting
-- ============================================
CREATE OR REPLACE FUNCTION get_broadcast_recipients(
  p_org_id UUID,
  p_target_type TEXT,
  p_target_group_ids UUID[],
  p_include_leaders BOOLEAN,
  p_include_members BOOLEAN,
  p_target_profile_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
  profile_id UUID,
  phone_number TEXT,
  first_name TEXT,
  last_name TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If targeting specific profiles, return those directly
  IF p_target_type = 'profiles' AND p_target_profile_ids IS NOT NULL AND array_length(p_target_profile_ids, 1) > 0 THEN
    RETURN QUERY
    SELECT DISTINCT
      p.id AS profile_id,
      p.phone_number,
      p.first_name,
      p.last_name,
      COALESCE(
        (
          SELECT
            CASE WHEN gm.role = 'leader' THEN 'leader' ELSE 'member' END
          FROM group_memberships gm
          INNER JOIN groups g ON g.id = gm.group_id
          WHERE gm.profile_id = p.id AND g.organization_id = p_org_id
          LIMIT 1
        ),
        'member'
      )::TEXT AS role
    FROM profiles p
    INNER JOIN organization_memberships om ON om.profile_id = p.id
    WHERE om.organization_id = p_org_id
      AND p.id = ANY(p_target_profile_ids)
      AND p.phone_number IS NOT NULL
      AND p.phone_number != '';
  ELSE
    -- Original group-based targeting
    RETURN QUERY
    SELECT DISTINCT
      p.id AS profile_id,
      p.phone_number,
      p.first_name,
      p.last_name,
      CASE
        WHEN gm.role = 'leader' THEN 'leader'::TEXT
        ELSE 'member'::TEXT
      END AS role
    FROM profiles p
    INNER JOIN group_memberships gm ON gm.profile_id = p.id
    INNER JOIN groups g ON g.id = gm.group_id
    WHERE g.organization_id = p_org_id
      AND p.phone_number IS NOT NULL
      AND p.phone_number != ''
      AND (
        p_target_type = 'all'
        OR (p_target_type = 'groups' AND g.id = ANY(p_target_group_ids))
      )
      AND (
        (p_include_leaders AND gm.role = 'leader')
        OR (p_include_members AND gm.role = 'member')
      );
  END IF;
END;
$$;

-- ============================================
-- Update create_broadcast to support profile targeting
-- ============================================
CREATE OR REPLACE FUNCTION create_broadcast(
  p_org_id UUID,
  p_message_body TEXT,
  p_target_type TEXT,
  p_target_group_ids UUID[],
  p_include_leaders BOOLEAN,
  p_include_members BOOLEAN,
  p_target_profile_ids UUID[] DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broadcast_id UUID;
  v_user_profile_id UUID;
  v_recipient_count INTEGER;
BEGIN
  -- Get the current user's profile
  SELECT p.id INTO v_user_profile_id
  FROM profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_user_profile_id IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Check permission
  IF NOT (auth_has_org_role(p_org_id, ARRAY['owner', 'admin']) OR auth_is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  -- Create the broadcast
  INSERT INTO sms_broadcasts (
    organization_id,
    created_by,
    message_body,
    target_type,
    target_group_ids,
    target_profile_ids,
    include_leaders,
    include_members,
    status
  ) VALUES (
    p_org_id,
    v_user_profile_id,
    p_message_body,
    p_target_type,
    p_target_group_ids,
    p_target_profile_ids,
    p_include_leaders,
    p_include_members,
    'draft'
  )
  RETURNING id INTO v_broadcast_id;

  -- Populate recipients
  INSERT INTO sms_broadcast_recipients (broadcast_id, profile_id, phone_number)
  SELECT
    v_broadcast_id,
    r.profile_id,
    r.phone_number
  FROM get_broadcast_recipients(
    p_org_id,
    p_target_type,
    p_target_group_ids,
    p_include_leaders,
    p_include_members,
    p_target_profile_ids
  ) r;

  -- Update recipient count
  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;

  UPDATE sms_broadcasts
  SET recipient_count = v_recipient_count
  WHERE id = v_broadcast_id;

  RETURN v_broadcast_id;
END;
$$;

-- Grant execute permissions (re-grant to ensure they're set)
GRANT EXECUTE ON FUNCTION get_broadcast_recipients(UUID, TEXT, UUID[], BOOLEAN, BOOLEAN, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION create_broadcast(UUID, TEXT, TEXT, UUID[], BOOLEAN, BOOLEAN, UUID[]) TO authenticated;
