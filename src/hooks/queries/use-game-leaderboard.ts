"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface LeaderboardPlayer {
  profile_id: string;
  first_name: string;
  last_name: string;
  total_score: number;
  completed_at: string | null;
  player_rank: number;
}

async function fetchGameLeaderboard(
  gameId: string,
): Promise<LeaderboardPlayer[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_game_leaderboard", {
    p_game_id: gameId,
  });

  if (error) throw error;
  return (data ?? []) as LeaderboardPlayer[];
}

export function useGameLeaderboard(gameId: string | null) {
  return useQuery({
    queryKey: ["game-leaderboard", gameId],
    queryFn: () => fetchGameLeaderboard(gameId!),
    enabled: !!gameId,
  });
}
