// Organization-related types
// Note: For the new unified profile system, see ./profiles.ts

export type OrgRole = 'owner' | 'admin' | 'leader' | 'viewer' | 'student';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  member_id: string;
  user_id: string;
  email: string;
  role: OrgRole;
  status: 'pending' | 'active' | 'suspended';
  invited_at: string | null;
  accepted_at: string | null;
}

export interface OrganizationInvitation {
  invitation_id: string;
  email: string;
  role: OrgRole;
  expires_at: string;
  invited_by_email: string;
  created_at: string;
}

export interface UserOrganization {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  user_role: OrgRole;
}

// Helper to get display name for roles
export const roleDisplayNames: Record<OrgRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  leader: 'Leader',
  viewer: 'Viewer',
  student: 'Student',
};

// Helper to get role descriptions
export const roleDescriptions: Record<OrgRole, string> = {
  owner: 'Full access including billing and organization deletion',
  admin: 'Can manage team members, students, and all settings',
  leader: 'Can view students and pastoral data, manage check-ins',
  viewer: 'Read-only access to dashboards and data',
  student: 'Participant who checks in at events',
};

// Role hierarchy for permission checks
export const roleHierarchy: Record<OrgRole, number> = {
  owner: 5,
  admin: 4,
  leader: 3,
  viewer: 2,
  student: 1,
};

export function canManageRole(userRole: OrgRole, targetRole: OrgRole): boolean {
  // Owners can manage anyone except other owners
  if (userRole === 'owner') return targetRole !== 'owner';
  // Admins can manage leaders and viewers
  if (userRole === 'admin') return targetRole === 'leader' || targetRole === 'viewer';
  // Others cannot manage roles
  return false;
}

export function canInviteRole(userRole: OrgRole, inviteRole: OrgRole): boolean {
  // Owners can invite admins, leaders, viewers
  if (userRole === 'owner') return inviteRole !== 'owner';
  // Admins can invite leaders and viewers
  if (userRole === 'admin') return inviteRole === 'leader' || inviteRole === 'viewer';
  // Others cannot invite
  return false;
}
