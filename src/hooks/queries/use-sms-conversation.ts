import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
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

const PAGE_SIZE = 50;

async function fetchSmsConversation(
  profileId: string,
  offset: number = 0,
  limit: number = PAGE_SIZE
): Promise<SmsMessage[]> {
  const supabase = createClient();

  // Fetch messages with pagination (newest first, then reverse for display)
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
    .or(`profile_id.eq.${profileId},student_id.eq.${profileId}`)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  // Reverse to chronological order for display
  const chronological = (messages || []).reverse();

  // Get sender names for outbound messages
  const senderIds = Array.from(new Set(
    chronological
      .filter((m) => m.direction === "outbound" && m.sent_by)
      .map((m) => m.sent_by)
  ));

  const senderNames: Record<string, string> = {};

  if (senderIds.length > 0) {
    const orgId = chronological.find((m) => m.organization_id)?.organization_id;

    if (orgId) {
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

    senderIds.forEach((id) => {
      if (!senderNames[id]) {
        senderNames[id] = "Staff";
      }
    });
  }

  const { data: { user } } = await supabase.auth.getUser();

  return chronological.map((msg) => ({
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

export function useSmsConversation(profileId: string | null) {
  return useQuery({
    queryKey: ["sms-conversation", profileId],
    queryFn: () => fetchSmsConversation(profileId!),
    enabled: !!profileId,
    refetchInterval: 3000, // Poll every 3s for live updates (realtime is best-effort backup)
  });
}

/**
 * Hook to load earlier messages for pagination.
 * Returns messages loaded so far (prepended) and a function to load more.
 */
export function useSmsConversationPagination(profileId: string | null) {
  const [earlierMessages, setEarlierMessages] = useState<SmsMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);

  // Reset when profile changes
  useEffect(() => {
    setEarlierMessages([]);
    setHasMore(true);
  }, [profileId]);

  const loadEarlier = useCallback(async (currentCount: number) => {
    if (!profileId || isLoadingEarlier || !hasMore) return;
    setIsLoadingEarlier(true);

    try {
      const offset = currentCount + earlierMessages.length;
      const older = await fetchSmsConversation(profileId, offset, PAGE_SIZE);

      if (older.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (older.length > 0) {
        setEarlierMessages((prev) => [...older, ...prev]);
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsLoadingEarlier(false);
    }
  }, [profileId, isLoadingEarlier, hasMore, earlierMessages.length]);

  return { earlierMessages, hasMore, isLoadingEarlier, loadEarlier };
}

// Hook to refresh conversation after sending
export function useRefreshConversation() {
  const queryClient = useQueryClient();

  return (profileId: string) => {
    queryClient.invalidateQueries({ queryKey: ["sms-conversation", profileId] });
  };
}

/**
 * Realtime subscription for SMS conversation updates.
 * Invalidates query cache when new messages arrive for the given profile.
 */
export function useSmsRealtimeConversation(orgId: string | null, profileId: string | null) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  useEffect(() => {
    if (!orgId || !profileId) return;

    const supabase = createClient();
    console.log("[Realtime] Subscribing to sms-conversation for profile:", profileId, "org:", orgId);

    const channel = supabase
      .channel(`sms-conversation-${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sms_messages",
          filter: `organization_id=eq.${orgId}`,
        },
        (payload) => {
          console.log("[Realtime] Got sms_messages INSERT:", payload.new);
          const newMsg = payload.new as { profile_id?: string; student_id?: string };
          if (newMsg.profile_id === profileId || newMsg.student_id === profileId) {
            console.log("[Realtime] Matches current conversation, invalidating queries");
            queryClient.invalidateQueries({ queryKey: ["sms-conversation", profileId] });
            queryClient.invalidateQueries({ queryKey: ["sms-inbox", orgId] });
          }
        }
      )
      .subscribe((status, err) => {
        console.log("[Realtime] Subscription status:", status, err || "");
      });

    channelRef.current = channel;

    return () => {
      console.log("[Realtime] Unsubscribing from sms-conversation for profile:", profileId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [orgId, profileId, queryClient]);
}
