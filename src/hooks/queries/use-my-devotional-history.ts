"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface MyDevotionalEntry {
  devotional_id: string;
  title: string;
  scheduled_date: string;
  opened_at: string;
  reflected: boolean;
  prayed: boolean;
  has_prayer_request: boolean;
}

export function useMyDevotionalHistory(limit = 20) {
  return useQuery({
    queryKey: ["my-devotional-history", limit],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_recent_devotionals", {
        p_limit: limit,
      });
      if (error) throw error;
      return (data || []) as unknown as MyDevotionalEntry[];
    },
    staleTime: 2 * 60 * 1000,
  });
}
