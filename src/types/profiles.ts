/**
 * Unified User Profiles System
 *
 * Every person in the platform has ONE profile. This profile can have multiple roles:
 * org admin, group leader, group member, student. No more separate students vs
 * organization_members concepts.
 */

// =============================================================================
// ROLE TYPES
// =============================================================================

/**
 * Roles in an organization
 * - owner: Full access including billing and organization deletion
 * - admin: Can manage team members, students, and all settings
 * - leader: Can view students and pastoral data, manage check-ins, send SMS
 * - viewer: Read-only access to dashboards and data
 * - student: Participant who checks in at events
 */
export type MembershipRole = 'owner' | 'admin' | 'leader' | 'viewer' | 'student';

/**
 * Status of a membership
 */
export type MembershipStatus = 'active' | 'pending' | 'suspended';

/**
 * Roles in a group
 */
export type GroupRole = 'leader' | 'member';

// =============================================================================
// CORE PROFILE
// =============================================================================

/**
 * Core identity table - one record per human in the system.
 * Can be linked to auth.users when they have an account.
 */
export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  date_of_birth: string | null;
  user_id: string | null; // Links to auth.users when person has auth account
  created_at: string;
  updated_at: string;
}

/**
 * Profile with computed fields (for list views)
 */
export interface ProfileWithStats extends Profile {
  total_points: number;
  current_rank: string;
  last_check_in: string | null;
  days_since_last_check_in: number | null;
  total_check_ins: number;
  groups: Array<{ id: string; name: string; color: string | null }>;
}

// =============================================================================
// ORGANIZATION MEMBERSHIP
// =============================================================================

/**
 * Defines what role a profile has in each organization.
 * Replaces organization_members (but uses profile_id instead of user_id).
 */
export interface OrganizationMembership {
  id: string;
  profile_id: string;
  organization_id: string;
  role: MembershipRole;
  status: MembershipStatus;
  display_name: string | null; // For SMS signatures (e.g., "Pastor Mike")
  created_at: string;
  updated_at: string;
  invited_at: string | null;
  invited_by: string | null;
  accepted_at: string | null;
}

/**
 * Organization membership with profile details (for team lists)
 */
export interface OrganizationMembershipWithProfile extends OrganizationMembership {
  profile: Profile;
}

// =============================================================================
// GROUP MEMBERSHIP
// =============================================================================

/**
 * Defines participation in groups - both leaders and members.
 * Replaces both group_members AND group_leaders tables.
 */
export interface GroupMembership {
  id: string;
  profile_id: string;
  group_id: string;
  role: GroupRole;
  is_primary: boolean; // For primary leader designation
  joined_at: string;
  added_by: string | null;
}

/**
 * Group membership with profile details
 */
export interface GroupMembershipWithProfile extends GroupMembership {
  profile: Profile;
}

// =============================================================================
// STUDENT PROFILE EXTENSION
// =============================================================================

/**
 * Optional extension table for student-specific data.
 * Not everyone has this - only those with role='student' need it.
 */
export interface StudentProfile {
  profile_id: string;
  grade: string | null;
  high_school: string | null;
  instagram_handle: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  profile_pin: string | null; // For kiosk check-in access

  // Parent/guardian info
  father_first_name: string | null;
  father_last_name: string | null;
  father_phone: string | null;
  father_email: string | null;
  mother_first_name: string | null;
  mother_last_name: string | null;
  mother_phone: string | null;
  mother_email: string | null;
  parent_name: string | null; // Legacy fallback single field
  parent_phone: string | null; // Legacy fallback single field

  created_at: string;
  updated_at: string;
}

/**
 * Full profile with student extension data
 */
export interface ProfileWithStudentData extends Profile {
  student_profile: StudentProfile | null;
}

/**
 * Full profile with all related data (for profile views)
 */
export interface FullProfile extends ProfileWithStudentData {
  organization_memberships: OrganizationMembership[];
  group_memberships: GroupMembership[];
  total_points: number;
  current_rank: string;
  last_check_in: string | null;
  total_check_ins: number;
}

// =============================================================================
// HELPER TYPES FOR FORMS
// =============================================================================

/**
 * Data required to create a new profile (e.g., during check-in registration)
 */
export interface CreateProfileInput {
  first_name: string;
  last_name: string;
  email?: string | null;
  phone_number?: string | null;
  date_of_birth?: string | null;
}

/**
 * Data required to create student profile extension
 */
export interface CreateStudentProfileInput {
  grade?: string | null;
  high_school?: string | null;
  instagram_handle?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  father_first_name?: string | null;
  father_last_name?: string | null;
  father_phone?: string | null;
  father_email?: string | null;
  mother_first_name?: string | null;
  mother_last_name?: string | null;
  mother_phone?: string | null;
  mother_email?: string | null;
  parent_name?: string | null;
  parent_phone?: string | null;
}

/**
 * Combined input for creating a student (profile + student_profile + membership)
 */
export interface CreateStudentInput extends CreateProfileInput {
  student_profile?: CreateStudentProfileInput;
  organization_id: string;
}

// =============================================================================
// ROLE HELPERS
// =============================================================================

/**
 * Display names for membership roles
 */
export const membershipRoleDisplayNames: Record<MembershipRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  leader: 'Leader',
  viewer: 'Viewer',
  student: 'Student',
};

/**
 * Descriptions for membership roles
 */
export const membershipRoleDescriptions: Record<MembershipRole, string> = {
  owner: 'Full access including billing and organization deletion',
  admin: 'Can manage team members, students, and all settings',
  leader: 'Can view students and pastoral data, manage check-ins, send SMS',
  viewer: 'Read-only access to dashboards and data',
  student: 'Participant who checks in at events',
};

/**
 * Role hierarchy for permission checks
 */
export const membershipRoleHierarchy: Record<MembershipRole, number> = {
  owner: 5,
  admin: 4,
  leader: 3,
  viewer: 2,
  student: 1,
};

/**
 * Check if a role can access the dashboard
 */
export function canAccessDashboard(role: MembershipRole): boolean {
  return role !== 'student';
}

/**
 * Check if a role can send SMS
 */
export function canSendSms(role: MembershipRole): boolean {
  return role === 'owner' || role === 'admin' || role === 'leader';
}

/**
 * Check if a role can view all students in the org
 */
export function canViewAllStudents(role: MembershipRole): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a role can manage members
 */
export function canManageMembers(role: MembershipRole): boolean {
  return role === 'owner' || role === 'admin';
}
