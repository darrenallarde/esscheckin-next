-- Fix: is_org_admin and is_org_member now check BOTH tables.
-- Also fix assign_group_leader which had swapped parameter order.

CREATE OR REPLACE FUNCTION is_org_admin(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_org_id
    AND role IN ('owner', 'admin') AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM organization_memberships om
    JOIN profiles p ON p.id = om.profile_id
    WHERE p.user_id = p_user_id AND om.organization_id = p_org_id
    AND om.role IN ('owner', 'admin') AND om.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_org_member(p_user_id uuid, p_org_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE user_id = p_user_id AND organization_id = p_org_id AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM organization_memberships om
    JOIN profiles p ON p.id = om.profile_id
    WHERE p.user_id = p_user_id AND om.organization_id = p_org_id AND om.status = 'active'
  );
$$;

-- Fix assign_group_leader: parameter order was swapped in the is_org_admin/is_org_member calls
CREATE OR REPLACE FUNCTION assign_group_leader(p_group_id uuid, p_user_id uuid, p_role text DEFAULT 'leader')
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_leader_id uuid;
BEGIN
  SELECT organization_id INTO v_org_id FROM groups WHERE id = p_group_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Group not found';
  END IF;

  -- Fix: correct parameter order (user_id, org_id)
  IF NOT is_super_admin(auth.uid()) AND NOT is_org_admin(auth.uid(), v_org_id) THEN
    RAISE EXCEPTION 'Permission denied: org admin required';
  END IF;

  IF NOT is_org_member(p_user_id, v_org_id) THEN
    RAISE EXCEPTION 'User must be a member of the organization';
  END IF;

  INSERT INTO group_leaders (group_id, user_id, role)
  VALUES (p_group_id, p_user_id, p_role)
  ON CONFLICT (group_id, user_id) DO UPDATE SET role = p_role
  RETURNING id INTO v_leader_id;

  RETURN v_leader_id;
END;
$$;
