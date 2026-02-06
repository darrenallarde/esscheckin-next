"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface PrayerRequest {
  engagement_id: string;
  prayer_request: string;
  prayed_at: string;
  profile_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  devotional_title: string;
  scheduled_date: string;
  response_count: number;
}

export function usePrayerRequests(organizationId: string | null, limit = 50) {
  return useQuery({
    queryKey: ["prayer-requests", organizationId, limit],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_org_prayer_requests", {
        p_org_id: organizationId!,
        p_limit: limit,
      });
      if (error) throw error;
      return (data || []) as PrayerRequest[];
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRespondToPrayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      engagementId,
      responseType,
      message,
      voiceUrl,
    }: {
      engagementId: string;
      responseType: "text" | "voice" | "pray";
      message?: string;
      voiceUrl?: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("respond_to_prayer", {
        p_engagement_id: engagementId,
        p_response_type: responseType,
        p_message: message || null,
        p_voice_url: voiceUrl || null,
      });
      if (error) throw error;
      const result = data as unknown as { success: boolean; error?: string; response_id?: string };
      if (!result.success) throw new Error(result.error || "Failed to respond");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prayer-requests"] });
    },
  });
}
