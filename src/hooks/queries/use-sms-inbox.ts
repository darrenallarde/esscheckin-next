import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface SmsConversation {
  phoneNumber: string;
  studentId: string | null;
  studentName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageDirection: "inbound" | "outbound";
  unreadCount: number;
  totalMessageCount: number;
}

interface RpcConversationRow {
  phone_number: string;
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

  const { data, error } = await supabase.rpc("get_sms_conversations", {
    p_org_id: orgId,
  });

  if (error) throw error;

  return (data as RpcConversationRow[] || []).map((row) => ({
    phoneNumber: row.phone_number,
    studentId: row.student_id,
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
