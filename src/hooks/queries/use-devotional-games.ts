"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface DevotionalGame {
  id: string;
  devotional_id: string;
  status: string;
  core_question: string | null;
}

/**
 * Fetches all games for an organization, keyed by devotional_id.
 * Used on the curriculum page to show existing game links.
 */
export function useDevotionalGames(organizationId: string | null) {
  return useQuery({
    queryKey: ["devotional-games", organizationId],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("games")
        .select("id, devotional_id, status, core_question")
        .eq("organization_id", organizationId!)
        .in("status", ["active", "ready"]);

      if (error) throw error;

      // Build a map: devotionalId → game (most recent per devotional)
      const map: Record<string, DevotionalGame> = {};
      for (const game of data || []) {
        map[game.devotional_id] = game;
      }
      return map;
    },
    enabled: !!organizationId,
  });
}
