import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { RANKS, RankInfo } from "@/utils/gamificationDB";

export interface LeaderboardEntry {
  student_id: string;
  first_name: string;
  last_name: string;
  total_points: number;
  current_rank: string;
  rank_info: RankInfo;
  position: number;
}

async function fetchLeaderboard(organizationId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  // Join students with their game stats for this organization
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      student_game_stats(total_points, current_rank)
    `)
    .eq("organization_id", organizationId)
    .order("first_name")
    .limit(limit * 2); // Fetch more to sort properly

  if (error) throw error;

  // Map and sort by points
  const entries = (data || [])
    .map((student) => {
      const gameStats = (student.student_game_stats as Array<{ total_points: number; current_rank: string }>)?.[0];
      return {
        student_id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        total_points: gameStats?.total_points || 0,
        current_rank: gameStats?.current_rank || "Newcomer",
        rank_info: RANKS.find((r) => r.title === (gameStats?.current_rank || "Newcomer")) || RANKS[0],
        position: 0, // Will be set after sorting
      };
    })
    .sort((a, b) => b.total_points - a.total_points)
    .slice(0, limit)
    .map((entry, index) => ({ ...entry, position: index + 1 }));

  return entries;
}

export function useLeaderboard(organizationId: string | null, limit: number = 10) {
  return useQuery({
    queryKey: ["leaderboard", organizationId, limit],
    queryFn: () => fetchLeaderboard(organizationId!, limit),
    enabled: !!organizationId,
  });
}

export interface RankDistribution {
  rank: string;
  count: number;
  emoji: string;
  color: string;
}

async function fetchRankDistribution(organizationId: string): Promise<RankDistribution[]> {
  const supabase = createClient();

  // Get count of students per rank for this organization
  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      student_game_stats(current_rank)
    `)
    .eq("organization_id", organizationId);

  if (error) throw error;

  // Count students per rank
  const rankCounts: Record<string, number> = {};
  (data || []).forEach((student) => {
    const gameStats = (student.student_game_stats as Array<{ current_rank: string }>)?.[0];
    const rank = gameStats?.current_rank || "Newcomer";
    rankCounts[rank] = (rankCounts[rank] || 0) + 1;
  });

  // Map to RankDistribution with RANKS info
  return RANKS.map((rank) => ({
    rank: rank.title,
    count: rankCounts[rank.title] || 0,
    emoji: rank.emoji,
    color: rank.color,
  }));
}

export function useRankDistribution(organizationId: string | null) {
  return useQuery({
    queryKey: ["rank-distribution", organizationId],
    queryFn: () => fetchRankDistribution(organizationId!),
    enabled: !!organizationId,
  });
}

export interface AchievementSummary {
  id: string;
  title: string;
  description: string;
  emoji: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  earned_count: number;
}

async function fetchAchievementsSummary(organizationId: string): Promise<AchievementSummary[]> {
  const supabase = createClient();

  // Get all student achievements for this organization
  const { data, error } = await supabase
    .from("student_achievements")
    .select(`
      achievement_id,
      achievement_title,
      achievement_description,
      achievement_emoji,
      rarity
    `)
    .eq("organization_id", organizationId);

  if (error) throw error;

  // Count achievements by id
  const achievementCounts: Record<string, { count: number; title: string; description: string; emoji: string; rarity: string }> = {};
  (data || []).forEach((achievement) => {
    if (!achievementCounts[achievement.achievement_id]) {
      achievementCounts[achievement.achievement_id] = {
        count: 0,
        title: achievement.achievement_title,
        description: achievement.achievement_description,
        emoji: achievement.achievement_emoji,
        rarity: achievement.rarity || "common",
      };
    }
    achievementCounts[achievement.achievement_id].count++;
  });

  return Object.entries(achievementCounts).map(([id, data]) => ({
    id,
    title: data.title,
    description: data.description,
    emoji: data.emoji,
    rarity: data.rarity as "common" | "rare" | "epic" | "legendary",
    earned_count: data.count,
  }));
}

export function useAchievementsSummary(organizationId: string | null) {
  return useQuery({
    queryKey: ["achievements-summary", organizationId],
    queryFn: () => fetchAchievementsSummary(organizationId!),
    enabled: !!organizationId,
  });
}
