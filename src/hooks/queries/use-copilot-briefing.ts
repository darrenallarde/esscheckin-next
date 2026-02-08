import { useQuery } from "@tanstack/react-query";
import type {
  ActionType,
  UrgencyLevelV3,
  CopilotBriefingResponseV3,
  MinistryInsights,
} from "@/utils/copilotPromptV3";

export type { ActionType, UrgencyLevelV3 as UrgencyLevel, MinistryInsights };

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
  last_seen_at: string | null;
  total_checkins_8weeks: number;
  is_declining: boolean;
  primary_parent_name: string | null;
  primary_parent_phone: string | null;
  group_names: string[];
  // AI-generated fields (V3)
  rank: number;
  urgency: UrgencyLevelV3;
  situation_summary: string;
  recommended_action: string;
  action_type: ActionType;
  student_text: string | null;
  parent_text: string | null;
  pastoral_note: string;
  // Backward compat aliases
  why_insight: string;
  draft_message: string | null;
}

interface BriefingResult {
  briefingSummary: string;
  students: CopilotStudent[];
  ministryInsights: MinistryInsights;
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

  const data = (await response.json()) as CopilotBriefingResponseV3 & {
    students: Array<Record<string, unknown>>;
  };

  // Map students with backward-compat aliases
  const students: CopilotStudent[] = (data.students || []).map((s) => {
    const raw = s as Partial<CopilotStudent>;
    return {
      ...raw,
      why_insight: raw.situation_summary || raw.why_insight || "",
      draft_message: raw.student_text || raw.draft_message || null,
      situation_summary: raw.situation_summary || raw.why_insight || "",
      student_text: raw.student_text || raw.draft_message || null,
    } as CopilotStudent;
  });

  return {
    briefingSummary: data.briefing_summary,
    students,
    ministryInsights: data.ministry_insights || {
      teaching_recommendation: "",
      growth_opportunities: [],
      strategic_assessment: "",
    },
  };
}

/**
 * Single-stage hook for co-pilot briefing V3.
 * API does all the work: RPC + AI reasoning + caching.
 */
export function useCopilotBriefing(organizationId: string | null) {
  const query = useQuery({
    queryKey: ["copilot-briefing-v3", organizationId],
    queryFn: () => fetchBriefing(organizationId!),
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000, // 5 min
  });

  return {
    briefingSummary: query.data?.briefingSummary ?? "",
    students: query.data?.students ?? [],
    ministryInsights: query.data?.ministryInsights ?? {
      teaching_recommendation: "",
      growth_opportunities: [],
      strategic_assessment: "",
    },
    isLoading: query.isLoading,
    error: query.error,
  };
}
