import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { RecommendationStatus } from "@/types/interactions";

export interface AIRecommendation {
  id: string;
  student_id: string;
  student_name: string;
  key_insight: string;
  action_bullets: string[];
  context_paragraph: string;
  engagement_status: string;
  days_since_last_seen: number | null;
  status: RecommendationStatus;
  assigned_to: string | null;
  assigned_to_name: string | null;
  accepted_at: string | null;
  completed_at: string | null;
  completion_notes: string | null;
  generated_at: string;
  last_interaction_at: string | null;
  interaction_count: number;
}

interface RecommendationsByStatus {
  pending: AIRecommendation[];
  accepted: AIRecommendation[];
  completed: AIRecommendation[];
  no_response: AIRecommendation[];
}

async function fetchAIRecommendations(): Promise<RecommendationsByStatus> {
  const supabase = createClient();

  // Get AI recommendations with student info
  const { data: recommendations, error } = await supabase
    .from("ai_recommendations")
    .select(`
      id,
      student_id,
      profile_id,
      key_insight,
      action_bullets,
      context_paragraph,
      engagement_status,
      days_since_last_seen,
      status,
      assigned_to,
      assigned_to_name,
      accepted_at,
      completed_at,
      completion_notes,
      generated_at,
      profiles(first_name, last_name)
    `)
    .in("status", ["pending", "accepted", "completed", "dismissed"])
    .eq("is_dismissed", false)
    .order("generated_at", { ascending: false });

  if (error) throw error;

  // Get interaction counts for each recommendation
  const recIds = recommendations?.map(r => r.id) || [];
  const { data: interactions } = await supabase
    .from("interactions")
    .select("recommendation_id, created_at")
    .in("recommendation_id", recIds)
    .order("created_at", { ascending: false });

  // Build interaction map
  const interactionMap = new Map<string, { count: number; lastAt: string | null }>();
  (interactions || []).forEach(i => {
    if (!interactionMap.has(i.recommendation_id!)) {
      interactionMap.set(i.recommendation_id!, { count: 0, lastAt: null });
    }
    const entry = interactionMap.get(i.recommendation_id!)!;
    entry.count++;
    if (!entry.lastAt) entry.lastAt = i.created_at;
  });

  // Check for "no response" - accepted recommendations with no_response interactions
  const { data: noResponseInteractions } = await supabase
    .from("interactions")
    .select("recommendation_id")
    .in("recommendation_id", recIds)
    .eq("status", "no_response");

  const noResponseSet = new Set(noResponseInteractions?.map(i => i.recommendation_id) || []);

  // Transform and categorize
  const result: RecommendationsByStatus = {
    pending: [],
    accepted: [],
    completed: [],
    no_response: [],
  };

  (recommendations || []).forEach(rec => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profile = rec.profiles as any;
    const interactionInfo = interactionMap.get(rec.id) || { count: 0, lastAt: null };

    const transformed: AIRecommendation = {
      id: rec.id,
      student_id: rec.profile_id || rec.student_id!,
      student_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown",
      key_insight: rec.key_insight,
      action_bullets: rec.action_bullets || [],
      context_paragraph: rec.context_paragraph,
      engagement_status: rec.engagement_status,
      days_since_last_seen: rec.days_since_last_seen,
      status: rec.status as RecommendationStatus,
      assigned_to: rec.assigned_to,
      assigned_to_name: rec.assigned_to_name,
      accepted_at: rec.accepted_at,
      completed_at: rec.completed_at,
      completion_notes: rec.completion_notes,
      generated_at: rec.generated_at!,
      last_interaction_at: interactionInfo.lastAt,
      interaction_count: interactionInfo.count,
    };

    // Categorize based on status and interaction outcomes
    if (rec.status === "completed") {
      result.completed.push(transformed);
    } else if (rec.status === "accepted" && noResponseSet.has(rec.id)) {
      // Has "no response" interactions - needs retry
      result.no_response.push(transformed);
    } else if (rec.status === "accepted") {
      result.accepted.push(transformed);
    } else {
      result.pending.push(transformed);
    }
  });

  return result;
}

export function useAIRecommendations() {
  return useQuery({
    queryKey: ["ai-recommendations"],
    queryFn: fetchAIRecommendations,
  });
}

// Mutation to update recommendation status
export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      recommendationId,
      status,
      notes
    }: {
      recommendationId: string;
      status: RecommendationStatus;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc("update_recommendation_status", {
        p_recommendation_id: recommendationId,
        p_status: status,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["pastoral-recommendations"] });
    },
  });
}

// Mutation to log an interaction
export function useLogInteraction() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      studentId,
      interactionType,
      content,
      outcome,
      status,
      recommendationId,
      followUpDate,
    }: {
      studentId: string;
      interactionType: string;
      content?: string;
      outcome?: string;
      status?: string;
      recommendationId?: string;
      followUpDate?: string;
    }) => {
      const { data, error } = await supabase.rpc("log_interaction", {
        p_student_id: studentId,
        p_interaction_type: interactionType,
        p_content: content || null,
        p_outcome: outcome || null,
        p_status: status || "completed",
        p_recommendation_id: recommendationId || null,
        p_follow_up_date: followUpDate || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["ai-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["pastoral-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["student-context", variables.studentId] });
    },
  });
}
