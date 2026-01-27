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

async function fetchLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("students")
    .select("id, first_name, last_name, total_points, current_rank")
    .order("total_points", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data || []).map((student, index) => ({
    student_id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    total_points: student.total_points || 0,
    current_rank: student.current_rank || "Newcomer",
    rank_info: RANKS.find((r) => r.title === (student.current_rank || "Newcomer")) || RANKS[0],
    position: index + 1,
  }));
}

export function useLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: () => fetchLeaderboard(limit),
  });
}

export interface RankDistribution {
  rank: string;
  count: number;
  emoji: string;
  color: string;
}

async function fetchRankDistribution(): Promise<RankDistribution[]> {
  const supabase = createClient();

  // Get count of students per rank
  const { data, error } = await supabase
    .from("students")
    .select("current_rank");

  if (error) throw error;

  // Count students per rank
  const rankCounts: Record<string, number> = {};
  (data || []).forEach((student) => {
    const rank = student.current_rank || "Newcomer";
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

export function useRankDistribution() {
  return useQuery({
    queryKey: ["rank-distribution"],
    queryFn: fetchRankDistribution,
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

async function fetchAchievementsSummary(): Promise<AchievementSummary[]> {
  const supabase = createClient();

  // Get all achievements with count of students who earned them
  const { data, error } = await supabase
    .from("achievements")
    .select(`
      id,
      title,
      description,
      emoji,
      rarity,
      student_achievements(count)
    `);

  if (error) throw error;

  return (data || []).map((achievement) => ({
    id: achievement.id,
    title: achievement.title,
    description: achievement.description,
    emoji: achievement.emoji,
    rarity: achievement.rarity as "common" | "rare" | "epic" | "legendary",
    earned_count: (achievement.student_achievements as unknown as { count: number }[])?.[0]?.count || 0,
  }));
}

export function useAchievementsSummary() {
  return useQuery({
    queryKey: ["achievements-summary"],
    queryFn: fetchAchievementsSummary,
  });
}
