-- Fix find_recent_conversation to find outbound messages (broadcasts, DMs from pastor)
-- Previously only matched inbound messages by from_number, missing broadcast replies entirely
CREATE OR REPLACE FUNCTION find_recent_conversation(p_phone text)
RETURNS TABLE(organization_id uuid, group_id uuid, student_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (m.organization_id)
    m.organization_id,
    m.group_id,
    COALESCE(m.profile_id, m.student_id) as student_id
  FROM sms_messages m
  WHERE (
    -- Inbound: message FROM this phone
    (m.direction = 'inbound' AND phone_last_10(m.from_number) = phone_last_10(p_phone))
    OR
    -- Outbound: message TO this phone (broadcasts, DMs from pastor)
    (m.direction = 'outbound' AND phone_last_10(m.to_number) = phone_last_10(p_phone))
  )
    AND m.created_at > NOW() - INTERVAL '24 hours'
    AND m.organization_id IS NOT NULL
  ORDER BY m.organization_id, m.created_at DESC
  LIMIT 1;
END;
$function$;

-- Partial index for efficient outbound message lookup by to_number
CREATE INDEX IF NOT EXISTS idx_sms_messages_outbound_to_number
  ON sms_messages (to_number, created_at DESC)
  WHERE direction = 'outbound';

-- Add pending_org to sms_sessions status check constraint
-- (for multi-org selection flow when known phone has multiple orgs)
ALTER TABLE sms_sessions DROP CONSTRAINT IF EXISTS sms_sessions_status_check;
ALTER TABLE sms_sessions ADD CONSTRAINT sms_sessions_status_check
  CHECK (status = ANY (ARRAY['pending_group', 'active', 'ended', 'pending_switch', 'pending_org']));

-- Add pending_org_list column to store org choices during multi-org selection
ALTER TABLE sms_sessions ADD COLUMN IF NOT EXISTS pending_org_list jsonb;
