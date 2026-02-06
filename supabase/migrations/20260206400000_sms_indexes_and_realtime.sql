-- Add indexes to speed up SMS conversation queries
CREATE INDEX IF NOT EXISTS idx_sms_messages_org_created
  ON sms_messages (organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sms_messages_org_profile_created
  ON sms_messages (organization_id, profile_id, created_at DESC);

-- Enable realtime on sms_messages for live message updates
ALTER PUBLICATION supabase_realtime ADD TABLE sms_messages;
