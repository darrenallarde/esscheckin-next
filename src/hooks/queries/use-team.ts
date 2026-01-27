import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type OrgRole = Database["public"]["Enums"]["org_role"];

export interface TeamMember {
  member_id: string;
  user_id: string;
  email: string;
  role: OrgRole;
  status: string;
  invited_at: string | null;
  accepted_at: string | null;
}

export interface PendingInvitation {
  invitation_id: string;
  email: string;
  role: OrgRole;
  invited_by_email: string;
  created_at: string;
  expires_at: string;
}

async function fetchTeamMembers(organizationId: string): Promise<TeamMember[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_organization_members", {
    p_organization_id: organizationId,
  });

  if (error) throw error;

  return (data || []).map((member: {
    member_id: string;
    user_id: string;
    email: string;
    role: OrgRole;
    status: string;
    invited_at: string;
    accepted_at: string;
  }) => ({
    member_id: member.member_id,
    user_id: member.user_id,
    email: member.email,
    role: member.role,
    status: member.status,
    invited_at: member.invited_at,
    accepted_at: member.accepted_at,
  }));
}

export function useTeamMembers(organizationId: string | null) {
  return useQuery({
    queryKey: ["team-members", organizationId],
    queryFn: () => fetchTeamMembers(organizationId!),
    enabled: !!organizationId,
  });
}

async function fetchPendingInvitations(organizationId: string): Promise<PendingInvitation[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_pending_invitations", {
    p_organization_id: organizationId,
  });

  if (error) throw error;

  return (data || []).map((invitation: {
    invitation_id: string;
    email: string;
    role: OrgRole;
    invited_by_email: string;
    created_at: string;
    expires_at: string;
  }) => ({
    invitation_id: invitation.invitation_id,
    email: invitation.email,
    role: invitation.role,
    invited_by_email: invitation.invited_by_email,
    created_at: invitation.created_at,
    expires_at: invitation.expires_at,
  }));
}

export function usePendingInvitations(organizationId: string | null) {
  return useQuery({
    queryKey: ["pending-invitations", organizationId],
    queryFn: () => fetchPendingInvitations(organizationId!),
    enabled: !!organizationId,
  });
}

export interface InviteInput {
  organizationId: string;
  email: string;
  role: OrgRole;
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: InviteInput) => {
      const { data, error } = await supabase.rpc("create_organization_invitation", {
        p_organization_id: input.organizationId,
        p_email: input.email,
        p_role: input.role,
      });

      if (error) throw error;
      if (!data || !data[0]?.success) {
        throw new Error(data?.[0]?.message || "Failed to send invitation");
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations", variables.organizationId] });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
      newRole,
    }: {
      organizationId: string;
      userId: string;
      newRole: OrgRole;
    }) => {
      const { data, error } = await supabase.rpc("update_member_role", {
        p_organization_id: organizationId,
        p_user_id: userId,
        p_new_role: newRole,
      });

      if (error) throw error;
      if (!data || !data[0]?.success) {
        throw new Error(data?.[0]?.message || "Failed to update role");
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-members", variables.organizationId] });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      organizationId,
      userId,
    }: {
      organizationId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase.rpc("remove_organization_member", {
        p_organization_id: organizationId,
        p_user_id: userId,
      });

      if (error) throw error;
      if (!data || !data[0]?.success) {
        throw new Error(data?.[0]?.message || "Failed to remove member");
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["team-members", variables.organizationId] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      invitationId,
      organizationId,
    }: {
      invitationId: string;
      organizationId: string;
    }) => {
      const { data, error } = await supabase.rpc("resend_organization_invitation", {
        p_invitation_id: invitationId,
      });

      if (error) throw error;
      if (!data || !data[0]?.success) {
        throw new Error(data?.[0]?.message || "Failed to resend invitation");
      }

      return { ...data[0], organizationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations", result.organizationId] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      invitationId,
      organizationId,
    }: {
      invitationId: string;
      organizationId: string;
    }) => {
      // Delete the invitation directly
      const { error } = await supabase
        .from("organization_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;
      return { organizationId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pending-invitations", result.organizationId] });
    },
  });
}
