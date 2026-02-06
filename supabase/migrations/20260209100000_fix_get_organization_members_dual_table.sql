-- Fix: get_organization_members now queries BOTH organization_members (legacy)
-- AND organization_memberships (new) so team members in either table show up.
-- Deduplicates by user_id. Only shows team roles (owner/admin/leader/viewer).

CREATE OR REPLACE FUNCTION get_organization_members(p_organization_id uuid)
RETURNS TABLE(
  member_id uuid,
  user_id uuid,
  email text,
  display_name text,
  role text,
  status text,
  invited_at timestamptz,
  accepted_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Old table: organization_members (legacy)
  SELECT
    om.id AS member_id,
    om.user_id,
    COALESCE(u.email, '') AS email,
    om.display_name,
    om.role::text,
    om.status,
    om.created_at AS invited_at,
    CASE WHEN om.status = 'active' THEN om.created_at ELSE NULL END AS accepted_at
  FROM organization_members om
  LEFT JOIN auth.users u ON u.id = om.user_id
  WHERE om.organization_id = p_organization_id

  UNION

  -- New table: organization_memberships (via profiles)
  -- Only team roles, exclude student/guardian
  -- Exclude anyone already in old table to avoid duplicates
  SELECT
    oms.id AS member_id,
    p.user_id,
    COALESCE(u.email, p.email, '') AS email,
    COALESCE(oms.display_name, CONCAT_WS(' ', p.first_name, p.last_name)) AS display_name,
    oms.role,
    oms.status,
    COALESCE(oms.invited_at, oms.created_at) AS invited_at,
    CASE WHEN oms.status = 'active' THEN COALESCE(oms.accepted_at, oms.created_at) ELSE NULL END AS accepted_at
  FROM organization_memberships oms
  JOIN profiles p ON p.id = oms.profile_id
  LEFT JOIN auth.users u ON u.id = p.user_id
  WHERE oms.organization_id = p_organization_id
    AND oms.role IN ('owner', 'admin', 'leader', 'viewer')
    AND NOT EXISTS (
      SELECT 1 FROM organization_members om2
      WHERE om2.organization_id = p_organization_id
        AND om2.user_id = p.user_id
        AND p.user_id IS NOT NULL
    )

  ORDER BY invited_at ASC;
$$;
