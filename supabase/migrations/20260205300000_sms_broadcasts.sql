-- SMS Broadcasts: Allow admins to send messages to groups
-- Tables: sms_broadcasts, sms_broadcast_recipients

-- ============================================
-- sms_broadcasts: Tracks broadcast campaigns
-- ============================================
CREATE TABLE IF NOT EXISTS sms_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Targeting
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'groups', 'custom')),
  target_group_ids UUID[], -- For 'groups' type
  include_leaders BOOLEAN DEFAULT true,
  include_members BOOLEAN DEFAULT true,

  -- Message
  message_body TEXT NOT NULL,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0
);

-- ============================================
-- sms_broadcast_recipients: Individual recipients
-- ============================================
CREATE TABLE IF NOT EXISTS sms_broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES sms_broadcasts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  phone_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  twilio_sid TEXT -- Track the Twilio message SID for debugging
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_org ON sms_broadcasts(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_status ON sms_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_created_at ON sms_broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_broadcast_recipients_broadcast ON sms_broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_sms_broadcast_recipients_status ON sms_broadcast_recipients(status);

-- ============================================
-- RLS Policies for sms_broadcasts
-- ============================================
ALTER TABLE sms_broadcasts ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user has org role (uses SECURITY DEFINER to avoid recursion)
-- Note: auth_has_org_role already exists from previous migrations

-- Select: Admins and owners can view broadcasts for their org
CREATE POLICY "sms_broadcasts_select_policy"
ON sms_broadcasts FOR SELECT
TO authenticated
USING (
  auth_has_org_role(organization_id, ARRAY['owner', 'admin'])
  OR auth_is_super_admin(auth.uid())
);

-- Insert: Admins and owners can create broadcasts
CREATE POLICY "sms_broadcasts_insert_policy"
ON sms_broadcasts FOR INSERT
TO authenticated
WITH CHECK (
  auth_has_org_role(organization_id, ARRAY['owner', 'admin'])
  OR auth_is_super_admin(auth.uid())
);

-- Update: Admins and owners can update broadcasts
CREATE POLICY "sms_broadcasts_update_policy"
ON sms_broadcasts FOR UPDATE
TO authenticated
USING (
  auth_has_org_role(organization_id, ARRAY['owner', 'admin'])
  OR auth_is_super_admin(auth.uid())
);

-- Delete: Admins and owners can delete broadcasts
CREATE POLICY "sms_broadcasts_delete_policy"
ON sms_broadcasts FOR DELETE
TO authenticated
USING (
  auth_has_org_role(organization_id, ARRAY['owner', 'admin'])
  OR auth_is_super_admin(auth.uid())
);

-- ============================================
-- RLS Policies for sms_broadcast_recipients
-- ============================================
ALTER TABLE sms_broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Select: Can view recipients if can view the broadcast
CREATE POLICY "sms_broadcast_recipients_select_policy"
ON sms_broadcast_recipients FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sms_broadcasts b
    WHERE b.id = sms_broadcast_recipients.broadcast_id
    AND (
      auth_has_org_role(b.organization_id, ARRAY['owner', 'admin'])
      OR auth_is_super_admin(auth.uid())
    )
  )
);

-- Insert: Service role only (edge function handles this)
-- No policy needed for authenticated users

-- Update: Service role only (edge function handles this)
-- No policy needed for authenticated users

-- ============================================
-- RPC: Get broadcast recipients based on targeting
-- ============================================
CREATE OR REPLACE FUNCTION get_broadcast_recipients(
  p_org_id UUID,
  p_target_type TEXT,
  p_target_group_ids UUID[],
  p_include_leaders BOOLEAN,
  p_include_members BOOLEAN
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
END;
$$;

-- ============================================
-- RPC: Create broadcast with recipients
-- ============================================
CREATE OR REPLACE FUNCTION create_broadcast(
  p_org_id UUID,
  p_message_body TEXT,
  p_target_type TEXT,
  p_target_group_ids UUID[],
  p_include_leaders BOOLEAN,
  p_include_members BOOLEAN
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
    include_leaders,
    include_members,
    status
  ) VALUES (
    p_org_id,
    v_user_profile_id,
    p_message_body,
    p_target_type,
    p_target_group_ids,
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
    p_include_members
  ) r;

  -- Update recipient count
  GET DIAGNOSTICS v_recipient_count = ROW_COUNT;

  UPDATE sms_broadcasts
  SET recipient_count = v_recipient_count
  WHERE id = v_broadcast_id;

  RETURN v_broadcast_id;
END;
$$;

-- ============================================
-- RPC: Get broadcasts for an organization
-- ============================================
CREATE OR REPLACE FUNCTION get_organization_broadcasts(p_org_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  created_by_name TEXT,
  message_body TEXT,
  target_type TEXT,
  target_group_names TEXT[],
  include_leaders BOOLEAN,
  include_members BOOLEAN,
  status TEXT,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER,
  sent_count INTEGER,
  failed_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check permission
  IF NOT (auth_has_org_role(p_org_id, ARRAY['owner', 'admin']) OR auth_is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.created_at,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') AS created_by_name,
    b.message_body,
    b.target_type,
    ARRAY(
      SELECT g.name
      FROM groups g
      WHERE g.id = ANY(b.target_group_ids)
    ) AS target_group_names,
    b.include_leaders,
    b.include_members,
    b.status,
    b.sent_at,
    b.recipient_count,
    b.sent_count,
    b.failed_count
  FROM sms_broadcasts b
  LEFT JOIN profiles p ON p.id = b.created_by
  WHERE b.organization_id = p_org_id
  ORDER BY b.created_at DESC;
END;
$$;

-- ============================================
-- RPC: Get broadcast details with recipients
-- ============================================
CREATE OR REPLACE FUNCTION get_broadcast_details(p_broadcast_id UUID)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  created_at TIMESTAMPTZ,
  created_by_name TEXT,
  message_body TEXT,
  target_type TEXT,
  target_group_names TEXT[],
  include_leaders BOOLEAN,
  include_members BOOLEAN,
  status TEXT,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER,
  sent_count INTEGER,
  failed_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Get org ID to check permission
  SELECT b.organization_id INTO v_org_id
  FROM sms_broadcasts b
  WHERE b.id = p_broadcast_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Broadcast not found';
  END IF;

  -- Check permission
  IF NOT (auth_has_org_role(v_org_id, ARRAY['owner', 'admin']) OR auth_is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  RETURN QUERY
  SELECT
    b.id,
    b.organization_id,
    b.created_at,
    COALESCE(p.first_name || ' ' || p.last_name, 'Unknown') AS created_by_name,
    b.message_body,
    b.target_type,
    ARRAY(
      SELECT g.name
      FROM groups g
      WHERE g.id = ANY(b.target_group_ids)
    ) AS target_group_names,
    b.include_leaders,
    b.include_members,
    b.status,
    b.sent_at,
    b.recipient_count,
    b.sent_count,
    b.failed_count
  FROM sms_broadcasts b
  LEFT JOIN profiles p ON p.id = b.created_by
  WHERE b.id = p_broadcast_id;
END;
$$;

-- ============================================
-- RPC: Update broadcast status (for edge function)
-- ============================================
CREATE OR REPLACE FUNCTION update_broadcast_status(
  p_broadcast_id UUID,
  p_status TEXT,
  p_sent_count INTEGER DEFAULT NULL,
  p_failed_count INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sms_broadcasts
  SET
    status = p_status,
    sent_at = CASE WHEN p_status IN ('sent', 'failed') THEN NOW() ELSE sent_at END,
    sent_count = COALESCE(p_sent_count, sent_count),
    failed_count = COALESCE(p_failed_count, failed_count)
  WHERE id = p_broadcast_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_broadcast_recipients TO authenticated;
GRANT EXECUTE ON FUNCTION create_broadcast TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_broadcasts TO authenticated;
GRANT EXECUTE ON FUNCTION get_broadcast_details TO authenticated;
GRANT EXECUTE ON FUNCTION update_broadcast_status TO service_role;
