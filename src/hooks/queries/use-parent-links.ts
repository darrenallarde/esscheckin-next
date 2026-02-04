import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Types for parent-student relationships
export type ParentRelationship = "father" | "mother" | "guardian" | "other";

// Child linked to a parent
export interface LinkedChild {
  student_profile_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  gender: string | null;
  high_school: string | null;
  campus_name: string | null;
  relationship: ParentRelationship;
  is_primary: boolean;
  last_check_in: string | null;
  total_check_ins: number;
  total_points: number;
  current_rank: string;
}

// Parent linked to a student
export interface LinkedParent {
  parent_profile_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  relationship: ParentRelationship;
  is_primary: boolean;
  is_claimed: boolean;
  status: string;
}

// =============================================================================
// GET PARENT'S CHILDREN
// =============================================================================

async function fetchParentChildren(
  parentProfileId: string,
  organizationId: string
): Promise<LinkedChild[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_parent_children", {
    p_parent_profile_id: parentProfileId,
    p_org_id: organizationId,
  });

  if (error) throw error;
  return (data as LinkedChild[]) || [];
}

export function useParentChildren(
  parentProfileId: string | null,
  organizationId: string | null
) {
  return useQuery({
    queryKey: ["parent-children", parentProfileId, organizationId],
    queryFn: () => fetchParentChildren(parentProfileId!, organizationId!),
    enabled: !!parentProfileId && !!organizationId,
  });
}

// =============================================================================
// GET STUDENT'S PARENTS
// =============================================================================

async function fetchStudentParents(
  studentProfileId: string,
  organizationId: string
): Promise<LinkedParent[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_student_parents", {
    p_student_profile_id: studentProfileId,
    p_org_id: organizationId,
  });

  if (error) throw error;
  return (data as LinkedParent[]) || [];
}

export function useStudentParents(
  studentProfileId: string | null,
  organizationId: string | null
) {
  return useQuery({
    queryKey: ["student-parents", studentProfileId, organizationId],
    queryFn: () => fetchStudentParents(studentProfileId!, organizationId!),
    enabled: !!studentProfileId && !!organizationId,
  });
}

// =============================================================================
// LINK PARENT TO STUDENT
// =============================================================================

interface LinkParentParams {
  parentProfileId: string;
  studentProfileId: string;
  relationship: ParentRelationship;
  isPrimary?: boolean;
}

async function linkParentToStudent(
  params: LinkParentParams
): Promise<{ success: boolean; message: string; link_id: string | null }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("link_parent_to_student", {
    p_parent_profile_id: params.parentProfileId,
    p_student_profile_id: params.studentProfileId,
    p_relationship: params.relationship,
    p_is_primary: params.isPrimary ?? false,
  });

  if (error) throw error;
  const result = (data as { success: boolean; message: string; link_id: string | null }[])?.[0];
  if (!result?.success) {
    throw new Error(result?.message || "Failed to link parent");
  }
  return result;
}

export function useLinkParentToStudent(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: linkParentToStudent,
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["parent-children", variables.parentProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["student-parents", variables.studentProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["people", organizationId],
      });
    },
  });
}

// =============================================================================
// UNLINK PARENT FROM STUDENT
// =============================================================================

interface UnlinkParentParams {
  parentProfileId: string;
  studentProfileId: string;
}

async function unlinkParentFromStudent(
  params: UnlinkParentParams
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("unlink_parent_from_student", {
    p_parent_profile_id: params.parentProfileId,
    p_student_profile_id: params.studentProfileId,
  });

  if (error) throw error;
  const result = (data as { success: boolean; message: string }[])?.[0];
  if (!result?.success) {
    throw new Error(result?.message || "Failed to unlink parent");
  }
  return result;
}

export function useUnlinkParentFromStudent(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: unlinkParentFromStudent,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["parent-children", variables.parentProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["student-parents", variables.studentProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["people", organizationId],
      });
    },
  });
}

// =============================================================================
// INVITE GUARDIAN TO CLAIM PROFILE
// =============================================================================

interface InviteGuardianParams {
  guardianProfileId: string;
  organizationId: string;
}

interface InviteGuardianResult {
  success: boolean;
  message: string;
  invitation_id: string | null;
  invitation_token: string | null;
  guardian_email: string | null;
}

async function inviteGuardianToClaim(
  params: InviteGuardianParams
): Promise<InviteGuardianResult> {
  const supabase = createClient();

  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase.rpc("invite_guardian_to_claim", {
    p_guardian_profile_id: params.guardianProfileId,
    p_org_id: params.organizationId,
    p_invited_by: user.id,
  });

  if (error) throw error;
  const result = (data as InviteGuardianResult[])?.[0];
  if (!result?.success) {
    throw new Error(result?.message || "Failed to invite guardian");
  }
  return result;
}

export function useInviteGuardianToClaim(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inviteGuardianToClaim,
    onSuccess: () => {
      // Invalidate people queries to show updated invitation status
      queryClient.invalidateQueries({
        queryKey: ["people", organizationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["pending-invitations", organizationId],
      });
    },
  });
}

// =============================================================================
// CREATE GUARDIAN PROFILES FROM STUDENT (Manual trigger)
// =============================================================================

interface CreateGuardiansParams {
  studentProfileId: string;
  organizationId: string;
  campusId?: string;
}

interface CreateGuardiansResult {
  success: boolean;
  message: string;
  father_profile_id: string | null;
  mother_profile_id: string | null;
  guardian_profile_id: string | null;
}

async function createGuardianProfiles(
  params: CreateGuardiansParams
): Promise<CreateGuardiansResult> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc(
    "create_guardian_profiles_from_student",
    {
      p_student_profile_id: params.studentProfileId,
      p_org_id: params.organizationId,
      p_campus_id: params.campusId || null,
    }
  );

  if (error) throw error;
  const result = (data as CreateGuardiansResult[])?.[0];
  if (!result?.success) {
    throw new Error(result?.message || "Failed to create guardian profiles");
  }
  return result;
}

export function useCreateGuardianProfiles(organizationId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createGuardianProfiles,
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({
        queryKey: ["student-parents", variables.studentProfileId],
      });
      queryClient.invalidateQueries({
        queryKey: ["people", organizationId],
      });
    },
  });
}
