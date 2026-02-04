-- Add columns to sms_sessions for NPC router improvements
-- is_first_message: Track whether this is the first message after connecting (for welcome vs footer response)
-- pending_switch_org_id: Store the org being switched to when awaiting YES confirmation

ALTER TABLE sms_sessions
ADD COLUMN IF NOT EXISTS is_first_message BOOLEAN DEFAULT true;

ALTER TABLE sms_sessions
ADD COLUMN IF NOT EXISTS pending_switch_org_id UUID DEFAULT NULL;

-- Add foreign key constraint for pending_switch_org_id
ALTER TABLE sms_sessions
ADD CONSTRAINT sms_sessions_pending_switch_org_id_fkey
FOREIGN KEY (pending_switch_org_id) REFERENCES organizations(id) ON DELETE SET NULL;

-- Add new status value for pending_switch
ALTER TABLE sms_sessions
DROP CONSTRAINT IF EXISTS sms_sessions_status_check;

ALTER TABLE sms_sessions
ADD CONSTRAINT sms_sessions_status_check
CHECK (status = ANY (ARRAY['pending_group'::text, 'active'::text, 'ended'::text, 'pending_switch'::text]));

-- Add index on pending_switch_org_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_sessions_pending_switch
ON sms_sessions(phone_number, pending_switch_org_id)
WHERE pending_switch_org_id IS NOT NULL;
