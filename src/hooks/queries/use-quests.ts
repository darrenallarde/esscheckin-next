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

  if (error) throw error;

  return data as QuestBoard;
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
 */
export function generateQuests(
  board: QuestBoard | undefined,
  miaStudents: MiaStudent[] | undefined,
  orgSlug: string | undefined
): { dailyQuests: Quest[]; priorityQuests: Quest[] } {
  if (!board) {
    return { dailyQuests: [], priorityQuests: [] };
  }

  const dailyQuests: Quest[] = [
    {
      id: "daily_messages",
      type: "daily",
      icon: "💬",
      title: `Check messages (${board.context.unreadMessages} conversations)`,
      completed: board.completions.daily_messages || board.context.unreadMessages === 0,
      actions: [
        { label: "Inbox →", type: "navigate", path: `/${orgSlug}/messages` },
      ],
    },
    {
      id: "daily_new_students",
      type: "daily",
      icon: "🆕",
      title: `Review new students (${board.context.newStudents} pending)`,
      completed: board.completions.daily_new_students || board.context.newStudents === 0,
      actions: [
        { label: "View", type: "navigate", path: `/${orgSlug}/people?filter=new` },
        { label: "✓", type: "inline", handler: "markComplete" },
      ],
    },
    {
      id: "daily_pastoral",
      type: "daily",
      icon: "🩺",
      title: `Check pastoral queue (${board.context.urgentPastoral} urgent)`,
      completed: board.completions.daily_pastoral || board.context.urgentPastoral === 0,
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
