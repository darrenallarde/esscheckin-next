-- Fix get_organization_parents to return correct parent_type (mother/father/guardian)
-- from parent_student_links.relationship instead of always returning 'guardian' from om.role
--
-- Root cause: om.role is always 'guardian' for all parents in organization_memberships.
-- The actual mother/father distinction is stored in parent_student_links.relationship,
-- but the RPC was reading from om.role instead.

CREATE OR REPLACE FUNCTION public.get_organization_parents(p_organization_id UUID)
RETURNS TABLE (
  parent_id UUID,
  parent_type TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  children JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS parent_id,
    COALESCE(
      (SELECT psl.relationship
       FROM parent_student_links psl
       WHERE psl.parent_profile_id = p.id
       LIMIT 1),
      'guardian'
    ) AS parent_type,
    p.first_name,
    p.last_name,
    p.phone_number AS phone,
    p.email,
    (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'student_id', child.id,
        'first_name', child.first_name,
        'last_name', child.last_name,
        'grade', sp.grade,
        'relationship', psl.relationship
      )), '[]'::jsonb)
      FROM parent_student_links psl
      JOIN profiles child ON child.id = psl.student_profile_id
      LEFT JOIN student_profiles sp ON sp.profile_id = child.id
      WHERE psl.parent_profile_id = p.id
    ) AS children
  FROM profiles p
  JOIN organization_memberships om ON om.profile_id = p.id
  WHERE om.organization_id = p_organization_id
    AND om.role = 'guardian'
    -- Exclude phantom guardians - must have valid contact OR be claimed
    AND (is_valid_phone(p.phone_number) OR is_valid_email(p.email) OR p.user_id IS NOT NULL)
  ORDER BY p.first_name, p.last_name;
$$;
