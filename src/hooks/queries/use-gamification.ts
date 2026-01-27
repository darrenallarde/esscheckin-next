import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { RANKS, RankInfo, getRankByCheckIns } from "@/utils/gamificationDB";

export interface LeaderboardEntry {
  student_id: string;
  first_name: string;
  last_name: string;
  total_check_ins: number;
  total_points: number;
  current_rank: string;
  rank_info: RankInfo;
  position: number;
}

async function fetchLeaderboard(organizationId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  // Get all check-ins for this organization (filtered by org_id on check_ins table)
  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select("student_id")
    .eq("organization_id", organizationId);

  if (checkInsError) throw checkInsError;

  // Count check-ins per student
  const checkInCounts = new Map<string, number>();
  (checkIns || []).forEach((ci) => {
    checkInCounts.set(ci.student_id, (checkInCounts.get(ci.student_id) || 0) + 1);
  });

  // Get student details
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id, first_name, last_name")
    .eq("organization_id", organizationId);

  if (studentsError) throw studentsError;

  // Map and sort by check-in count
  const entries = (students || [])
    .map((student) => {
      const totalCheckIns = checkInCounts.get(student.id) || 0;
      const rankInfo = getRankByCheckIns(totalCheckIns);
      return {
        student_id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        total_check_ins: totalCheckIns,
        total_points: totalCheckIns, // Points are based on check-in count
        current_rank: rankInfo.title,
        rank_info: rankInfo,
        position: 0,
      };
    })
    .sort((a, b) => b.total_check_ins - a.total_check_ins)
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

  // Get all check-ins for this organization (filtered by org_id on check_ins table)
  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select("student_id")
    .eq("organization_id", organizationId);

  if (checkInsError) throw checkInsError;

  // Count check-ins per student
  const checkInCounts = new Map<string, number>();
  (checkIns || []).forEach((ci) => {
    checkInCounts.set(ci.student_id, (checkInCounts.get(ci.student_id) || 0) + 1);
  });

  // Get all students for this organization
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id")
    .eq("organization_id", organizationId);

  if (studentsError) throw studentsError;

  // Count students per rank based on check-in counts
  const rankCounts: Record<string, number> = {};
  (students || []).forEach((student) => {
    const totalCheckIns = checkInCounts.get(student.id) || 0;
    const rankInfo = getRankByCheckIns(totalCheckIns);
    rankCounts[rankInfo.title] = (rankCounts[rankInfo.title] || 0) + 1;
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
