import { useQuery } from "@tanstack/react-query";
import type {
  ActionType,
  UrgencyLevel,
  CopilotBriefingResponse,
} from "@/utils/copilotPrompt";

export type { ActionType, UrgencyLevel };

export interface CopilotStudent {
  profile_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  gender: string | null;
  belonging_status: string;
  days_since_last_seen: number;
  total_checkins_8weeks: number;
  is_declining: boolean;
  primary_parent_name: string | null;
  primary_parent_phone: string | null;
  group_names: string[];
  // AI-generated fields
  rank: number;
  urgency: UrgencyLevel;
  why_insight: string;
  recommended_action: string;
  action_type: ActionType;
  draft_message: string | null;
  pastoral_note: string;
}

interface BriefingResult {
  briefingSummary: string;
  students: CopilotStudent[];
}

async function fetchBriefing(organizationId: string): Promise<BriefingResult> {
  const response = await fetch("/api/copilot/briefing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch copilot briefing");
  }

  const data: CopilotBriefingResponse & {
    students: Array<CopilotStudent>;
  } = await response.json();

  return {
    briefingSummary: data.briefing_summary,
    students: data.students || [],
  };
}

/**
 * Single-stage hook for co-pilot briefing V2.
 * API does all the work: RPC + AI reasoning + caching.
 */
export function useCopilotBriefing(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["copilot-briefing-v2", organizationId],
    queryFn: () => fetchBriefing(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  return {
    briefingSummary: query.data?.briefingSummary ?? "",
    students: query.data?.students ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}
