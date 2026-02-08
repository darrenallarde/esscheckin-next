"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface PrayerResponseDetail {
  response_id: string;
  response_type: "text" | "voice" | "pray";
  message: string | null;
  voice_url: string | null;
  viewed_at: string | null;
  liked_at: string | null;
  created_at: string;
  responder_name: string;
  prayer_request: string;
  devotional_title: string;
  devotional_id: string;
  prayer_author_profile_id: string;
  prayer_author_user_id: string | null;
  organization_id: string;
  comments: {
    id: string;
    comment_text: string;
    created_at: string;
    author_name: string;
  }[];
}

export function usePrayerResponseDetail(responseId: string | null) {
  return useQuery({
    queryKey: ["prayer-response-detail", responseId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_prayer_response_detail", {
        p_response_id: responseId!,
      });
      if (error) throw error;
      return data as unknown as PrayerResponseDetail | null;
    },
    enabled: !!responseId,
  });
}

export function useMarkResponseViewed() {
  return useMutation({
    mutationFn: async (responseId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc(
        "mark_prayer_response_viewed",
        {
          p_response_id: responseId,
        },
      );
      if (error) throw error;
      return data as unknown as { success: boolean; error?: string };
    },
  });
}

export function useLikePrayerResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responseId: string) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("like_prayer_response", {
        p_response_id: responseId,
      });
      if (error) throw error;
      return data as unknown as {
        success: boolean;
        liked: boolean;
        error?: string;
      };
    },
    onSuccess: (_data, responseId) => {
      queryClient.invalidateQueries({
        queryKey: ["prayer-response-detail", responseId],
      });
    },
  });
}

export function useAddPrayerComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      responseId,
      commentText,
    }: {
      responseId: string;
      commentText: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("add_prayer_comment", {
        p_response_id: responseId,
        p_comment_text: commentText,
      });
      if (error) throw error;
      return data as unknown as {
        success: boolean;
        comment_id?: string;
        error?: string;
      };
    },
    onSuccess: (_data, { responseId }) => {
      queryClient.invalidateQueries({
        queryKey: ["prayer-response-detail", responseId],
      });
    },
  });
}
