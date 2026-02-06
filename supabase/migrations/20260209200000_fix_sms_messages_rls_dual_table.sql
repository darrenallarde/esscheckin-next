-- Fix: sms_messages RLS policies now check BOTH organization_members (legacy)
-- AND organization_memberships (new) for org membership.
-- Previously only checked via students → organization_members join,
-- so users only in organization_memberships couldn't see messages.

DROP POLICY IF EXISTS "Org members can view sms messages" ON sms_messages;
DROP POLICY IF EXISTS "Org members can insert sms messages" ON sms_messages;

CREATE POLICY "Org members can view sms messages" ON sms_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role)
    OR
    organization_id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid())
    OR
    organization_id = ANY(auth_profile_org_ids())
  );

CREATE POLICY "Org members can insert sms messages" ON sms_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::app_role)
    OR
    organization_id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid())
    OR
    organization_id = ANY(auth_profile_org_ids())
  );
