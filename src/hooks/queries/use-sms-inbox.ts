import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface SmsConversation {
  phoneNumber: string;
  profileId: string | null; // New: unified profile ID
  studentId: string | null; // Kept for backward compatibility
  studentName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageDirection: "inbound" | "outbound";
  unreadCount: number;
  totalMessageCount: number;
}

interface RpcConversationRow {
  phone_number: string;
  profile_id: string | null;
  student_id: string | null;
  student_name: string | null;
  last_message: string;
  last_message_at: string;
  last_message_direction: string;
  unread_count: number;
  total_message_count: number;
}

async function fetchSmsConversations(orgId: string): Promise<SmsConversation[]> {
  const supabase = createClient();

  // Use the new v2 function that includes profile_id
  const { data, error } = await supabase.rpc("get_sms_conversations_v2", {
    p_org_id: orgId,
  });

  if (error) {
    // Fallback to old function if v2 doesn't exist
    const { data: fallbackData, error: fallbackError } = await supabase.rpc("get_sms_conversations", {
      p_org_id: orgId,
    });
    if (fallbackError) throw fallbackError;
    return (fallbackData as RpcConversationRow[] || []).map((row) => ({
      phoneNumber: row.phone_number,
      profileId: row.student_id, // Use student_id as profile_id for old data
      studentId: row.student_id,
      studentName: row.student_name,
      lastMessage: row.last_message,
      lastMessageAt: row.last_message_at,
      lastMessageDirection: row.last_message_direction as "inbound" | "outbound",
      unreadCount: Number(row.unread_count),
      totalMessageCount: Number(row.total_message_count),
    }));
  }

  return (data as RpcConversationRow[] || []).map((row) => ({
    phoneNumber: row.phone_number,
    profileId: row.profile_id,
    studentId: row.student_id, // Backward compat
    studentName: row.student_name,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    lastMessageDirection: row.last_message_direction as "inbound" | "outbound",
    unreadCount: Number(row.unread_count),
    totalMessageCount: Number(row.total_message_count),
  }));
}

export function useSmsInbox(orgId: string | null) {
  return useQuery({
    queryKey: ["sms-inbox", orgId],
    queryFn: () => fetchSmsConversations(orgId!),
    enabled: !!orgId,
    refetchInterval: 3000, // Poll every 3s for live inbox updates
  });
}

// Hook to mark a conversation as read
async function markConversationRead(
  orgId: string,
  phoneNumber: string,
  studentId: string | null
): Promise<number> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("mark_conversation_read", {
    p_org_id: orgId,
    p_phone_number: phoneNumber,
    p_student_id: studentId,
  });

  if (error) throw error;
  return data as number;
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgId,
      phoneNumber,
      studentId,
    }: {
      orgId: string;
      phoneNumber: string;
      studentId: string | null;
    }) => markConversationRead(orgId, phoneNumber, studentId),
    onSuccess: (_, variables) => {
      // Invalidate inbox to refresh unread counts
      queryClient.invalidateQueries({ queryKey: ["sms-inbox", variables.orgId] });
    },
  });
}

// Hook to refresh the inbox
export function useRefreshSmsInbox() {
  const queryClient = useQueryClient();

  return (orgId: string) => {
    queryClient.invalidateQueries({ queryKey: ["sms-inbox", orgId] });
  };
}

/**
 * Realtime subscription for SMS inbox updates.
 * Invalidates inbox query when any new message arrives in the org.
 */
export function useSmsRealtimeInbox(orgId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    if (!orgId) return;

    const supabase = createClient();
    console.log("[Realtime] Subscribing to sms-inbox for org:", orgId);

    const channel = supabase
      .channel(`sms-inbox-${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sms_messages",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          console.log("[Realtime] Inbox got sms_messages INSERT:", payload.new);
          queryClient.invalidateQueries({ queryKey: ["sms-inbox", orgId] });
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] Inbox subscription status:", status, err || "");
      });

    channelRef.current = channel;

    return () => {
      console.log("[Realtime] Unsubscribing from sms-inbox for org:", orgId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [orgId, queryClient]);
}
