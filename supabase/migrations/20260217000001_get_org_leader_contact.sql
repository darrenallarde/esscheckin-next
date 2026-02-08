-- Get the org owner's contact info for "Message Pastor" button in Hi-Lo game
CREATE OR REPLACE FUNCTION get_org_leader_contact(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'first_name', p.first_name,
    'phone_number', p.phone_number
  ) INTO result
  FROM organization_memberships om
  JOIN profiles p ON p.id = om.profile_id
  WHERE om.organization_id = p_org_id
    AND om.role = 'owner'
    AND om.status = 'active'
  LIMIT 1;

  RETURN result;
END;
$$;
