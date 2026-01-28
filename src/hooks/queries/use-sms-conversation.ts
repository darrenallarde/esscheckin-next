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
      sent_by
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
    // Get user emails from auth.users via organization_members
    const { data: members } = await supabase
      .from("organization_members")
      .select("user_id")
      .in("user_id", senderIds);

    // For now, just use "You" or show the user ID
    // In a real app, you'd join to a profiles table
    senderNames = senderIds.reduce((acc, id) => {
      acc[id] = "Staff";
      return acc;
    }, {} as Record<string, string>);
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
