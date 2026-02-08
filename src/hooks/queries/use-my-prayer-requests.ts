"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface MyPrayerResponse {
  response_id: string;
  response_type: "text" | "voice" | "pray";
  message: string | null;
  voice_url: string | null;
  viewed_at: string | null;
  liked_at: string | null;
  created_at: string;
  responder_name: string;
  comment_count: number;
}

export interface MyPrayerRequest {
  engagement_id: string;
  prayer_request: string;
  prayed_at: string;
  devotional_title: string;
  devotional_id: string;
  scheduled_date: string;
  responses: MyPrayerResponse[];
}

export function useMyPrayerRequests() {
  return useQuery({
    queryKey: ["my-prayer-requests"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_prayer_requests");
      if (error) throw error;
      return (data || []) as unknown as MyPrayerRequest[];
    },
    staleTime: 2 * 60 * 1000,
  });
}
