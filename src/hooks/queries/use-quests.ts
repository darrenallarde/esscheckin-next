import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface QuestBoard {
  completions: Record<string, boolean>;
  streak: {
    current: number;
    longest: number;
    lastCompleted: string | null;
  };
  context: {
    unreadMessages: number;
    newStudents: number;
    urgentPastoral: number;
  };
}

export interface MiaStudent {
  profileId: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  daysSinceCheckin: number;
  lastCheckinDate: string | null;
}

export interface Quest {
  id: string;
  type: "daily" | "priority";
  icon: string;
  title: string;
  description?: string;
  completed: boolean;
  actions: QuestAction[];
  metadata?: {
    studentIds?: string[];
    count?: number;
  };
}

export interface QuestAction {
  label: string;
  type: "navigate" | "inline" | "modal" | "skip";
  path?: string;
  handler?: string;
}

interface RpcMiaRow {
  profile_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  days_since_checkin: number;
  last_checkin_date: string | null;
}

// Fetch quest board data
async function fetchQuestBoard(orgId: string): Promise<QuestBoard> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_quest_board", {
    p_org_id: orgId,
  });

  if (error) {
    console.error("[fetchQuestBoard] RPC error:", error);
    throw error;
  }

  // Validate the response structure
  if (!data || typeof data !== 'object') {
    console.error("[fetchQuestBoard] Invalid response - expected object, got:", typeof data, data);
    throw new Error("Invalid quest board response from server");
  }

  // Ensure all required fields exist with proper defaults
  const board: QuestBoard = {
    completions: data.completions || {},
    streak: {
      current: data.streak?.current ?? 0,
      longest: data.streak?.longest ?? 0,
      lastCompleted: data.streak?.lastCompleted ?? null,
    },
    context: {
      unreadMessages: data.context?.unreadMessages ?? 0,
      newStudents: data.context?.newStudents ?? 0,
      urgentPastoral: data.context?.urgentPastoral ?? 0,
    },
  };

  console.log("[fetchQuestBoard] Parsed board:", board);
  return board;
}

export function useQuestBoard(orgId: string | null) {
  return useQuery({
    queryKey: ["quest-board", orgId],
    queryFn: () => fetchQuestBoard(orgId!),
    enabled: !!orgId,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
  });
}

// Fetch MIA students for priority quests
async function fetchMiaStudents(orgId: string, limit: number = 5): Promise<MiaStudent[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_mia_students_for_quests", {
    p_org_id: orgId,
    p_days_threshold: 14,
    p_limit: limit,
  });

  if (error) throw error;

  return (data as RpcMiaRow[] || []).map((row) => ({
    profileId: row.profile_id,
    firstName: row.first_name,
    lastName: row.last_name,
    phoneNumber: row.phone_number,
    daysSinceCheckin: row.days_since_checkin,
    lastCheckinDate: row.last_checkin_date,
  }));
}

export function useMiaStudents(orgId: string | null, limit: number = 5) {
  return useQuery({
    queryKey: ["mia-students", orgId, limit],
    queryFn: () => fetchMiaStudents(orgId!, limit),
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Complete a quest
export function useCompleteQuest() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      orgId,
      questType,
      questKey,
    }: {
      orgId: string;
      questType: string;
      questKey?: string;
    }) => {
      const { data, error } = await supabase.rpc("complete_quest", {
        p_org_id: orgId,
        p_quest_type: questType,
        p_quest_key: questKey ?? null,
      });

      if (error) throw error;
      return { result: data, orgId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["quest-board", data.orgId] });
    },
  });
}

/**
 * Generate the list of quests based on board data and context
 *
 * IMPORTANT: Quests should NOT auto-complete when counts are 0.
 * Instead, show them with "(all clear ✓)" to indicate no action needed,
 * but let the user manually mark them complete to track engagement.
 */
export function generateQuests(
  board: QuestBoard | undefined,
  miaStudents: MiaStudent[] | undefined,
  orgSlug: string | undefined
): { dailyQuests: Quest[]; priorityQuests: Quest[] } {
  // Fallback quests when board data is unavailable (RPC failed or loading)
  if (!board) {
    console.log("[generateQuests] No board data, returning fallback quests");
    return {
      dailyQuests: [
        {
          id: "daily_messages",
          type: "daily",
          icon: "💬",
          title: "Check messages",
          completed: false,
          actions: [
            { label: "Inbox →", type: "navigate", path: `/${orgSlug}/messages` },
          ],
        },
        {
          id: "daily_new_students",
          type: "daily",
          icon: "🆕",
          title: "Review new students",
          completed: false,
          actions: [
            { label: "View", type: "navigate", path: `/${orgSlug}/people?filter=new` },
            { label: "✓", type: "inline", handler: "markComplete" },
          ],
        },
        {
          id: "daily_pastoral",
          type: "daily",
          icon: "🩺",
          title: "Check pastoral queue",
          completed: false,
          actions: [
            { label: "Queue →", type: "navigate", path: `/${orgSlug}/pastoral` },
          ],
        },
      ],
      priorityQuests: [],
    };
  }

  // Generate titles with status - show "(all clear ✓)" when count is 0
  const messagesTitle = board.context.unreadMessages === 0
    ? "Check messages (all clear ✓)"
    : `Check messages (${board.context.unreadMessages} conversations)`;

  const newStudentsTitle = board.context.newStudents === 0
    ? "Review new students (all clear ✓)"
    : `Review new students (${board.context.newStudents} pending)`;

  const pastoralTitle = board.context.urgentPastoral === 0
    ? "Check pastoral queue (all clear ✓)"
    : `Check pastoral queue (${board.context.urgentPastoral} urgent)`;

  // Only mark as completed if explicitly completed by user (from completions record)
  // Do NOT auto-complete when counts are 0
  const dailyQuests: Quest[] = [
    {
      id: "daily_messages",
      type: "daily",
      icon: "💬",
      title: messagesTitle,
      completed: !!board.completions.daily_messages,
      actions: [
        { label: "Inbox →", type: "navigate", path: `/${orgSlug}/messages` },
      ],
    },
    {
      id: "daily_new_students",
      type: "daily",
      icon: "🆕",
      title: newStudentsTitle,
      completed: !!board.completions.daily_new_students,
      actions: [
        { label: "View", type: "navigate", path: `/${orgSlug}/people?filter=new` },
        { label: "✓", type: "inline", handler: "markComplete" },
      ],
    },
    {
      id: "daily_pastoral",
      type: "daily",
      icon: "🩺",
      title: pastoralTitle,
      completed: !!board.completions.daily_pastoral,
      actions: [
        { label: "Queue →", type: "navigate", path: `/${orgSlug}/pastoral` },
      ],
    },
  ];

  // Generate priority quests based on MIA students
  const priorityQuests: Quest[] = [];

  if (miaStudents && miaStudents.length > 0) {
    const studentNames = miaStudents.slice(0, 3).map((s) => s.firstName).join(", ");
    const moreCount = miaStudents.length > 3 ? ` +${miaStudents.length - 3} more` : "";

    priorityQuests.push({
      id: `priority_mia_${Date.now()}`,
      type: "priority",
      icon: "⚡",
      title: `Text ${miaStudents.length} MIA students (14+ days)`,
      description: `${studentNames}${moreCount}`,
      completed: false,
      metadata: {
        studentIds: miaStudents.map((s) => s.profileId),
        count: miaStudents.length,
      },
      actions: [
        { label: "📱 Send Text", type: "modal", handler: "openGroupText" },
        { label: "View", type: "navigate", path: `/${orgSlug}/people?status=MIA` },
        { label: "Skip", type: "inline", handler: "skipQuest" },
      ],
    });
  }

  return { dailyQuests, priorityQuests };
}
