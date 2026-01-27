import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface GroupLeader {
  id: string;
  group_id: string;
  user_id: string;
  role: "leader" | "co-leader";
  created_at: string;
  email: string;
}

async function fetchGroupLeaders(groupId: string): Promise<GroupLeader[]> {
  const supabase = createClient();

  // Get group leaders with user email from organization_members
  const { data, error } = await supabase
    .from("group_leaders")
    .select(`
      id,
      group_id,
      user_id,
      role,
      created_at
    `)
    .eq("group_id", groupId);

  if (error) throw error;

  // Fetch emails for the leaders from auth.users via organization_members
  const userIds = (data || []).map((l) => l.user_id);

  if (userIds.length === 0) return [];

  const { data: members, error: membersError } = await supabase
    .from("organization_members")
    .select("user_id")
    .in("user_id", userIds);

  if (membersError) {
    console.error("Error fetching member info:", membersError);
  }

  // Get emails from get_organization_members RPC for the group's organization
  const { data: groupData } = await supabase
    .from("groups")
    .select("organization_id")
    .eq("id", groupId)
    .single();

  if (!groupData) {
    throw new Error("Group not found");
  }

  const { data: orgMembers } = await supabase.rpc("get_organization_members", {
    p_organization_id: groupData.organization_id,
  });

  // Create a map of user_id to email
  const emailMap = new Map<string, string>();
  (orgMembers || []).forEach((m: { user_id: string; email: string }) => {
    emailMap.set(m.user_id, m.email);
  });

  return (data || []).map((leader) => ({
    ...leader,
    role: leader.role as "leader" | "co-leader",
    email: emailMap.get(leader.user_id) || "Unknown",
  }));
}

export function useGroupLeaders(groupId: string | null) {
  return useQuery({
    queryKey: ["group-leaders", groupId],
    queryFn: () => fetchGroupLeaders(groupId!),
    enabled: !!groupId,
  });
}

export interface AvailableLeader {
  user_id: string;
  email: string;
  role: string;
  isAlreadyLeader: boolean;
}

async function fetchAvailableLeaders(
  organizationId: string,
  groupId: string
): Promise<AvailableLeader[]> {
  const supabase = createClient();

  // Get all organization members who can be leaders (admin, leader, owner roles)
  const { data: orgMembers, error: orgError } = await supabase.rpc(
    "get_organization_members",
    {
      p_organization_id: organizationId,
    }
  );

  if (orgError) throw orgError;

  // Get existing leaders for this group
  const { data: existingLeaders, error: leadersError } = await supabase
    .from("group_leaders")
    .select("user_id")
    .eq("group_id", groupId);

  if (leadersError) throw leadersError;

  const existingLeaderIds = new Set((existingLeaders || []).map((l) => l.user_id));

  // Filter to only members who can be leaders (not viewers)
  return (orgMembers || [])
    .filter(
      (m: { role: string; status: string }) =>
        m.status === "active" && ["owner", "admin", "leader"].includes(m.role)
    )
    .map((m: { user_id: string; email: string; role: string }) => ({
      user_id: m.user_id,
      email: m.email,
      role: m.role,
      isAlreadyLeader: existingLeaderIds.has(m.user_id),
    }));
}

export function useAvailableLeaders(
  organizationId: string | null,
  groupId: string | null
) {
  return useQuery({
    queryKey: ["available-leaders", organizationId, groupId],
    queryFn: () => fetchAvailableLeaders(organizationId!, groupId!),
    enabled: !!organizationId && !!groupId,
  });
}

export function useAssignGroupLeader() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      role = "leader",
    }: {
      groupId: string;
      userId: string;
      role?: "leader" | "co-leader";
    }) => {
      const { data, error } = await supabase.rpc("assign_group_leader", {
        p_group_id: groupId,
        p_user_id: userId,
        p_role: role,
      });

      if (error) throw error;
      if (!data || !data[0]?.success) {
        throw new Error(data?.[0]?.message || "Failed to assign leader");
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group-leaders", variables.groupId] });
      queryClient.invalidateQueries({
        queryKey: ["available-leaders"],
      });
    },
  });
}

export function useRemoveGroupLeader() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { data, error } = await supabase.rpc("remove_group_leader", {
        p_group_id: groupId,
        p_user_id: userId,
      });

      if (error) throw error;
      if (!data || !data[0]?.success) {
        throw new Error(data?.[0]?.message || "Failed to remove leader");
      }

      return data[0];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["group-leaders", variables.groupId] });
      queryClient.invalidateQueries({
        queryKey: ["available-leaders"],
      });
    },
  });
}
