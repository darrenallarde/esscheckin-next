-- SMS Inbox Feature Migration
-- Adds read_at column and get_sms_conversations RPC function

-- Add read_at column to sms_messages for tracking unread status
ALTER TABLE sms_messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ DEFAULT NULL;

-- Create index for efficient unread queries
CREATE INDEX IF NOT EXISTS idx_sms_messages_read_at
ON sms_messages(organization_id, read_at)
WHERE read_at IS NULL;

-- Create index for conversation grouping queries
CREATE INDEX IF NOT EXISTS idx_sms_messages_org_phone_created
ON sms_messages(organization_id, from_number, created_at DESC);

-- RPC Function: Get SMS conversations grouped by phone number
-- Returns conversations for an organization with student info, last message, and unread count
CREATE OR REPLACE FUNCTION get_sms_conversations(p_org_id UUID)
RETURNS TABLE (
  phone_number TEXT,
  student_id UUID,
  student_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  last_message_direction TEXT,
  unread_count BIGINT,
  total_message_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH conversation_stats AS (
    -- Get aggregated stats per phone number (using from_number for inbound)
    SELECT
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END AS conv_phone,
      m.student_id AS conv_student_id,
      MAX(m.created_at) AS max_created_at,
      COUNT(*) FILTER (WHERE m.direction = 'inbound' AND m.read_at IS NULL) AS conv_unread_count,
      COUNT(*) AS conv_total_count
    FROM sms_messages m
    WHERE m.organization_id = p_org_id
    GROUP BY
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END,
      m.student_id
  ),
  latest_messages AS (
    -- Get the latest message for each conversation
    SELECT DISTINCT ON (
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END,
      m.student_id
    )
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END AS conv_phone,
      m.student_id AS conv_student_id,
      m.body AS latest_body,
      m.direction AS latest_direction
    FROM sms_messages m
    WHERE m.organization_id = p_org_id
    ORDER BY
      CASE
        WHEN m.direction = 'inbound' THEN m.from_number
        ELSE m.to_number
      END,
      m.student_id,
      m.created_at DESC
  )
  SELECT
    cs.conv_phone AS phone_number,
    cs.conv_student_id AS student_id,
    COALESCE(s.first_name || ' ' || COALESCE(s.last_name, ''), NULL) AS student_name,
    lm.latest_body AS last_message,
    cs.max_created_at AS last_message_at,
    lm.latest_direction AS last_message_direction,
    cs.conv_unread_count AS unread_count,
    cs.conv_total_count AS total_message_count
  FROM conversation_stats cs
  JOIN latest_messages lm
    ON cs.conv_phone = lm.conv_phone
    AND (cs.conv_student_id = lm.conv_student_id OR (cs.conv_student_id IS NULL AND lm.conv_student_id IS NULL))
  LEFT JOIN students s ON cs.conv_student_id = s.id
  ORDER BY cs.max_created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_sms_conversations(UUID) TO authenticated;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_conversation_read(
  p_org_id UUID,
  p_phone_number TEXT,
  p_student_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE sms_messages
  SET read_at = NOW()
  WHERE organization_id = p_org_id
    AND direction = 'inbound'
    AND read_at IS NULL
    AND from_number = p_phone_number
    AND (
      (p_student_id IS NULL AND student_id IS NULL) OR
      student_id = p_student_id
    );

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID, TEXT, UUID) TO authenticated;
