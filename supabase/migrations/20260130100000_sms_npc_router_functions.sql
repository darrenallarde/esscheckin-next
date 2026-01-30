-- SMS NPC Router Functions
-- Required for the receive-sms Edge Function to work

-- Helper function to normalize phone numbers (strip to last 10 digits)
CREATE OR REPLACE FUNCTION phone_last_10(phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10)
$$;

-- 1. Find recent conversation for auto-routing replies
-- Looks for messages from this phone number in the last 24 hours
CREATE OR REPLACE FUNCTION find_recent_conversation(p_phone text)
RETURNS TABLE(
  organization_id uuid,
  group_id uuid,
  student_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (m.organization_id)
    m.organization_id,
    m.group_id,
    m.student_id
  FROM sms_messages m
  WHERE phone_last_10(m.from_number) = phone_last_10(p_phone)
    AND m.created_at > NOW() - INTERVAL '24 hours'
    AND m.organization_id IS NOT NULL
  ORDER BY m.organization_id, m.created_at DESC
  LIMIT 1;
END;
$$;

-- 2. Find all groups a student belongs to (by phone number)
-- Returns all group memberships for routing decisions
CREATE OR REPLACE FUNCTION find_student_groups(p_phone text)
RETURNS TABLE(
  student_id uuid,
  org_id uuid,
  org_name text,
  group_id uuid,
  group_name text,
  group_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id AS student_id,
    o.id AS org_id,
    COALESCE(o.display_name, o.name) AS org_name,
    g.id AS group_id,
    g.name AS group_name,
    g.short_code AS group_code
  FROM students s
  INNER JOIN organizations o ON o.id = s.organization_id
  INNER JOIN group_members gm ON gm.student_id = s.id
  INNER JOIN groups g ON g.id = gm.group_id AND g.is_active = true
  WHERE phone_last_10(s.phone_number) = phone_last_10(p_phone)
     OR phone_last_10(s.secondary_phone) = phone_last_10(p_phone)
  ORDER BY g.name;
END;
$$;

-- 3. Get active SMS session for a phone number
CREATE OR REPLACE FUNCTION get_active_sms_session(p_phone text)
RETURNS TABLE(
  session_id uuid,
  organization_id uuid,
  group_id uuid,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ss.id AS session_id,
    ss.organization_id,
    ss.group_id,
    ss.status
  FROM sms_sessions ss
  WHERE ss.phone_number = p_phone
    AND ss.status IN ('pending_group', 'active')
  ORDER BY ss.started_at DESC
  LIMIT 1;
END;
$$;

-- 4. Find organization by short code
CREATE OR REPLACE FUNCTION find_org_by_code(p_code text)
RETURNS TABLE(
  org_id uuid,
  org_name text,
  org_slug text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS org_id,
    COALESCE(o.display_name, o.name) AS org_name,
    o.slug AS org_slug
  FROM organizations o
  WHERE LOWER(o.short_code) = LOWER(p_code)
    AND o.status = 'active'
  LIMIT 1;
END;
$$;

-- 5. List active groups for an organization (for SMS group selection)
CREATE OR REPLACE FUNCTION list_org_groups_for_sms(p_org_id uuid)
RETURNS TABLE(
  group_id uuid,
  group_name text,
  group_code text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id AS group_id,
    g.name AS group_name,
    g.short_code AS group_code
  FROM groups g
  WHERE g.organization_id = p_org_id
    AND g.is_active = true
  ORDER BY g.name;
END;
$$;

-- Grant execute permissions to anon and service_role
GRANT EXECUTE ON FUNCTION phone_last_10(text) TO anon, service_role;
GRANT EXECUTE ON FUNCTION find_recent_conversation(text) TO anon, service_role;
GRANT EXECUTE ON FUNCTION find_student_groups(text) TO anon, service_role;
GRANT EXECUTE ON FUNCTION get_active_sms_session(text) TO anon, service_role;
GRANT EXECUTE ON FUNCTION find_org_by_code(text) TO anon, service_role;
GRANT EXECUTE ON FUNCTION list_org_groups_for_sms(uuid) TO anon, service_role;
