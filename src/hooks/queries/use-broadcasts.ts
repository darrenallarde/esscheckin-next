import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type BroadcastTargetType = "all" | "groups" | "profiles";
export type BroadcastStatus = "draft" | "sending" | "sent" | "failed";

export interface Broadcast {
  id: string;
  createdAt: string;
  createdByName: string;
  messageBody: string;
  targetType: BroadcastTargetType;
  targetGroupNames: string[];
  includeLeaders: boolean;
  includeMembers: boolean;
  status: BroadcastStatus;
  sentAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
}

export interface BroadcastRecipient {
  profileId: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  role: "leader" | "member";
}

interface RpcBroadcastRow {
  id: string;
  created_at: string;
  created_by_name: string;
  message_body: string;
  target_type: string;
  target_group_names: string[];
  include_leaders: boolean;
  include_members: boolean;
  status: string;
  sent_at: string | null;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
}

interface RpcRecipientRow {
  profile_id: string;
  phone_number: string;
  first_name: string;
  last_name: string;
  role: string;
}

// Fetch all broadcasts for an organization
async function fetchBroadcasts(orgId: string): Promise<Broadcast[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_organization_broadcasts", {
    p_org_id: orgId,
  });

  if (error) throw error;

  return (data as RpcBroadcastRow[] || []).map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    createdByName: row.created_by_name,
    messageBody: row.message_body,
    targetType: row.target_type as BroadcastTargetType,
    targetGroupNames: row.target_group_names || [],
    includeLeaders: row.include_leaders,
    includeMembers: row.include_members,
    status: row.status as BroadcastStatus,
    sentAt: row.sent_at,
    recipientCount: row.recipient_count,
    sentCount: row.sent_count,
    failedCount: row.failed_count,
  }));
}

export function useBroadcasts(orgId: string | null) {
  return useQuery({
    queryKey: ["broadcasts", orgId],
    queryFn: () => fetchBroadcasts(orgId!),
    enabled: !!orgId,
  });
}

// Preview recipients based on targeting criteria
async function fetchRecipientPreview(
  orgId: string,
  targetType: BroadcastTargetType,
  targetGroupIds: string[],
  includeLeaders: boolean,
  includeMembers: boolean
): Promise<BroadcastRecipient[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_broadcast_recipients", {
    p_org_id: orgId,
    p_target_type: targetType,
    p_target_group_ids: targetGroupIds,
    p_include_leaders: includeLeaders,
    p_include_members: includeMembers,
  });

  if (error) throw error;

  return (data as RpcRecipientRow[] || []).map((row) => ({
    profileId: row.profile_id,
    phoneNumber: row.phone_number,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role as "leader" | "member",
  }));
}

export function useRecipientPreview(
  orgId: string | null,
  targetType: BroadcastTargetType,
  targetGroupIds: string[],
  includeLeaders: boolean,
  includeMembers: boolean
) {
  return useQuery({
    queryKey: ["broadcast-recipients", orgId, targetType, targetGroupIds, includeLeaders, includeMembers],
    queryFn: () => fetchRecipientPreview(orgId!, targetType, targetGroupIds, includeLeaders, includeMembers),
    enabled: !!orgId && (includeLeaders || includeMembers),
  });
}

// Create and send a broadcast
export function useCreateBroadcast() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: {
      orgId: string;
      messageBody: string;
      targetType: BroadcastTargetType;
      targetGroupIds: string[];
      includeLeaders: boolean;
      includeMembers: boolean;
    }) => {
      // Create the broadcast (this also populates recipients)
      const { data: broadcastId, error } = await supabase.rpc("create_broadcast", {
        p_org_id: data.orgId,
        p_message_body: data.messageBody,
        p_target_type: data.targetType,
        p_target_group_ids: data.targetGroupIds,
        p_include_leaders: data.includeLeaders,
        p_include_members: data.includeMembers,
      });

      if (error) throw error;

      return { broadcastId, orgId: data.orgId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", result.orgId] });
    },
  });
}

// Send a broadcast (trigger the edge function)
export function useSendBroadcast() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ broadcastId, orgId }: { broadcastId: string; orgId: string }) => {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();

      // Call the send-broadcast edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ broadcastId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send broadcast");
      }

      const result = await response.json();
      return { ...result, orgId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", result.orgId] });
    },
  });
}

// Combined create and send
export function useCreateAndSendBroadcast() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (data: {
      orgId: string;
      messageBody: string;
      targetType: BroadcastTargetType;
      targetGroupIds: string[];
      targetProfileIds?: string[];
      includeLeaders: boolean;
      includeMembers: boolean;
    }) => {
      // Create the broadcast
      const { data: broadcastId, error } = await supabase.rpc("create_broadcast", {
        p_org_id: data.orgId,
        p_message_body: data.messageBody,
        p_target_type: data.targetType,
        p_target_group_ids: data.targetGroupIds,
        p_target_profile_ids: data.targetProfileIds || [],
        p_include_leaders: data.includeLeaders,
        p_include_members: data.includeMembers,
      });

      if (error) throw error;

      // Get session for auth
      const { data: sessionData } = await supabase.auth.getSession();

      // Send the broadcast
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-broadcast`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ broadcastId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send broadcast");
      }

      const result = await response.json();
      return { ...result, orgId: data.orgId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", result.orgId] });
    },
  });
}

// Refresh broadcasts
export function useRefreshBroadcasts() {
  const queryClient = useQueryClient();

  return (orgId: string) => {
    queryClient.invalidateQueries({ queryKey: ["broadcasts", orgId] });
  };
}

// Fetch recipients by profile IDs
async function fetchRecipientsByProfileIds(
  orgId: string,
  profileIds: string[]
): Promise<BroadcastRecipient[]> {
  const supabase = createClient();

  // Query profiles directly to get phone numbers
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      last_name,
      phone_number,
      organization_memberships!inner(organization_id, role)
    `)
    .in("id", profileIds)
    .eq("organization_memberships.organization_id", orgId)
    .not("phone_number", "is", null);

  if (error) throw error;

  return (data || [])
    .filter((p) => p.phone_number)
    .map((p) => ({
      profileId: p.id,
      phoneNumber: p.phone_number!,
      firstName: p.first_name || "",
      lastName: p.last_name || "",
      role: (p.organization_memberships as { role: string }[])?.[0]?.role === "leader" ? "leader" as const : "member" as const,
    }));
}

export function useRecipientsByProfileIds(
  orgId: string | null,
  profileIds: string[]
) {
  return useQuery({
    queryKey: ["broadcast-recipients-by-profile", orgId, profileIds],
    queryFn: () => fetchRecipientsByProfileIds(orgId!, profileIds),
    enabled: !!orgId && profileIds.length > 0,
  });
}
