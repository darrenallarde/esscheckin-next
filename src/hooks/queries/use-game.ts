"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface PublicGameData {
  game: {
    id: string;
    organization_id: string;
    devotional_id: string;
    scripture_verses: string;
    historical_facts: { fact: string; source?: string }[];
    fun_facts: { fact: string }[];
    core_question: string;
    status: "generating" | "ready" | "active" | "completed";
    opens_at: string | null;
    closes_at: string | null;
    created_at: string;
  };
  organization: {
    id: string;
    name: string;
    display_name: string | null;
    slug: string;
    theme_id: string | null;
  };
  player_count: number;
}

async function fetchGame(gameId: string): Promise<PublicGameData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_public_game", {
    p_game_id: gameId,
  });

  if (error) throw error;
  if (!data) throw new Error("Game not found");

  return data as unknown as PublicGameData;
}

export function useGame(gameId: string | null) {
  return useQuery({
    queryKey: ["game", gameId],
    queryFn: () => fetchGame(gameId!),
    enabled: !!gameId,
  });
}
