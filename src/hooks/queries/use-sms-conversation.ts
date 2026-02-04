import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface SmsMessage {
  id: string;
  direction: "inbound" | "outbound";
  body: string;
  created_at: string;
  from_number: string;
  to_number: string;
  status: string | null;
  sent_by_name: string | null;
}

async function fetchSmsConversation(studentId: string): Promise<SmsMessage[]> {
  const supabase = createClient();

  // Get all messages for this student
  const { data: messages, error } = await supabase
    .from("sms_messages")
    .select(`
      id,
      direction,
      body,
      created_at,
      from_number,
      to_number,
      status,
      sent_by,
      organization_id
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Get sender names for outbound messages
  const senderIds = Array.from(new Set(
    (messages || [])
      .filter((m) => m.direction === "outbound" && m.sent_by)
      .map((m) => m.sent_by)
  ));

  let senderNames: Record<string, string> = {};

  if (senderIds.length > 0) {
    // Get organization ID from first message
    const orgId = messages?.find((m) => m.organization_id)?.organization_id;

    if (orgId) {
      // Fetch display names from organization_members
      const { data: members } = await supabase
        .from("organization_members")
        .select("user_id, display_name")
        .eq("organization_id", orgId)
        .in("user_id", senderIds);

      if (members) {
        members.forEach((member) => {
          if (member.user_id) {
            senderNames[member.user_id] = member.display_name || "Staff";
          }
        });
      }
    }

    // Fall back to "Staff" for any sender without a display name
    senderIds.forEach((id) => {
      if (!senderNames[id]) {
        senderNames[id] = "Staff";
      }
    });
  }

  // Get current user to show "You" for their messages
  const { data: { user } } = await supabase.auth.getUser();

  return (messages || []).map((msg) => ({
    id: msg.id,
    direction: msg.direction as "inbound" | "outbound",
    body: msg.body,
    created_at: msg.created_at,
    from_number: msg.from_number,
    to_number: msg.to_number,
    status: msg.status,
    sent_by_name: msg.direction === "outbound" && msg.sent_by
      ? (msg.sent_by === user?.id ? "You" : senderNames[msg.sent_by] || "Staff")
      : null,
  }));
}

export function useSmsConversation(studentId: string | null) {
  return useQuery({
    queryKey: ["sms-conversation", studentId],
    queryFn: () => fetchSmsConversation(studentId!),
    enabled: !!studentId,
  });
}

// Hook to refresh conversation after sending
export function useRefreshConversation() {
  const queryClient = useQueryClient();

  return (studentId: string) => {
    queryClient.invalidateQueries({ queryKey: ["sms-conversation", studentId] });
  };
}
