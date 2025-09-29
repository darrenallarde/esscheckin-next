// Database-powered gamification system
import { supabase } from "@/integrations/supabase/client";
import { Achievement, BibleVerse, getRandomVerse } from "@/utils/bibleVerses";

export interface StudentGameProfile {
  student_id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  total_points: number;
  current_rank: string;
  achievements_count: number;
  recent_achievements: Achievement[];
  total_check_ins: number;
  last_check_in: string | null;
  wednesday_streak: number;
  sunday_streak: number;
  total_streak: number;
}

export interface CheckinReward {
  points_awarded: number;
  total_points: number;
  rank_changed: boolean;
  current_rank: string;
  achievements: Achievement[];
  is_first_time: boolean;
  bible_verse: BibleVerse;
}

export interface RankInfo {
  title: string;
  emoji: string;
  color: string;
  minPoints: number;
}

export const RANKS: RankInfo[] = [
  { title: "Newcomer", emoji: "🌱", color: "#22c55e", minPoints: 0 },
  { title: "Regular", emoji: "⭐", color: "#3b82f6", minPoints: 100 },
  { title: "Committed", emoji: "🔥", color: "#f59e0b", minPoints: 300 },
  { title: "Devoted", emoji: "💎", color: "#8b5cf6", minPoints: 600 },
  { title: "Champion", emoji: "🏆", color: "#ef4444", minPoints: 1000 },
  { title: "Legend", emoji: "👑", color: "#d946ef", minPoints: 2000 },
];

export function getRankInfo(rankTitle: string): RankInfo {
  return RANKS.find(rank => rank.title === rankTitle) || RANKS[0];
}

export function getNextRank(currentPoints: number): RankInfo | null {
  return RANKS.find(rank => rank.minPoints > currentPoints) || null;
}

export async function getStudentGameProfile(studentId: string): Promise<StudentGameProfile | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_student_game_profile', { p_student_id: studentId });

    if (error) {
      console.error('Error fetching student game profile:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const profile = data[0];

    // Calculate streaks (we'll implement this separately for now)
    const streaks = await calculateStudentStreaks(studentId);

    return {
      student_id: profile.student_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      user_type: profile.user_type,
      total_points: profile.total_points || 0,
      current_rank: profile.current_rank || 'Newcomer',
      achievements_count: profile.achievements_count || 0,
      recent_achievements: profile.recent_achievements || [],
      total_check_ins: profile.total_check_ins || 0,
      last_check_in: profile.last_check_in,
      wednesday_streak: streaks.wednesday_streak,
      sunday_streak: streaks.sunday_streak,
      total_streak: streaks.total_streak,
    };
  } catch (error) {
    console.error('Error in getStudentGameProfile:', error);
    return null;
  }
}

export async function processCheckinRewards(
  studentId: string,
  checkInId: string
): Promise<CheckinReward | null> {
  try {
    // Process the check-in rewards using the database function
    const { data, error } = await supabase
      .rpc('process_checkin_rewards', {
        p_student_id: studentId,
        p_check_in_id: checkInId
      });

    if (error) {
      console.error('Error processing check-in rewards:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Get a random Bible verse
    const bibleVerse = getRandomVerse();

    return {
      points_awarded: data.points_awarded || 0,
      total_points: data.total_points || 0,
      rank_changed: data.rank_changed || false,
      current_rank: data.current_rank || 'Newcomer',
      achievements: data.achievements || [],
      is_first_time: data.is_first_time || false,
      bible_verse: bibleVerse,
    };
  } catch (error) {
    console.error('Error in processCheckinRewards:', error);
    return null;
  }
}

export async function calculateStudentStreaks(studentId: string): Promise<{
  wednesday_streak: number;
  sunday_streak: number;
  total_streak: number;
}> {
  try {
    // Get all check-ins for this student
    const { data: checkIns, error } = await supabase
      .from('check_ins')
      .select('checked_in_at')
      .eq('student_id', studentId)
      .order('checked_in_at', { ascending: false });

    if (error) {
      console.error('Error fetching check-ins for streaks:', error);
      return { wednesday_streak: 0, sunday_streak: 0, total_streak: 0 };
    }

    if (!checkIns || checkIns.length === 0) {
      return { wednesday_streak: 0, sunday_streak: 0, total_streak: 0 };
    }

    const checkInsByDate = checkIns.map(ci => ({
      date: new Date(ci.checked_in_at),
      dayOfWeek: new Date(ci.checked_in_at).getDay()
    })).sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate streaks using the same logic as before
    const calculateStreak = (targetDays: number[]) => {
      let streak = 0;
      const today = new Date();
      let currentWeekStart = new Date(today);
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);

      for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(weekStart.getDate() - (weekOffset * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const hasTargetDay = checkInsByDate.some(ci => {
          return ci.date >= weekStart && ci.date <= weekEnd &&
                 targetDays.includes(ci.dayOfWeek);
        });

        if (hasTargetDay) {
          streak++;
        } else if (weekOffset === 0 && !hasTargetDay) {
          continue;
        } else {
          break;
        }
      }
      return streak;
    };

    const calculateTotalStreak = () => {
      let streak = 0;
      const today = new Date();
      let currentWeekStart = new Date(today);
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);

      for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
        const weekStart = new Date(currentWeekStart);
        weekStart.setDate(weekStart.getDate() - (weekOffset * 7));
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const hasAnyAttendance = checkInsByDate.some(ci => {
          return ci.date >= weekStart && ci.date <= weekEnd &&
                 (ci.dayOfWeek === 0 || ci.dayOfWeek === 3); // Sunday or Wednesday
        });

        if (hasAnyAttendance) {
          streak++;
        } else if (weekOffset === 0 && !hasAnyAttendance) {
          continue;
        } else {
          break;
        }
      }
      return streak;
    };

    return {
      wednesday_streak: calculateStreak([3]),
      sunday_streak: calculateStreak([0]),
      total_streak: calculateTotalStreak(),
    };
  } catch (error) {
    console.error('Error calculating streaks:', error);
    return { wednesday_streak: 0, sunday_streak: 0, total_streak: 0 };
  }
}

export async function getStudentAchievements(studentId: string): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('student_achievements')
      .select('*')
      .eq('student_id', studentId)
      .order('unlocked_at', { ascending: false });

    if (error) {
      console.error('Error fetching student achievements:', error);
      return [];
    }

    return data?.map(achievement => ({
      id: achievement.achievement_id,
      title: achievement.achievement_title,
      description: achievement.achievement_description,
      emoji: achievement.achievement_emoji,
      points: achievement.points_awarded,
      type: 'special', // We'll need to map this properly
      condition: () => true, // Not used in display
      rarity: achievement.rarity as 'common' | 'rare' | 'epic' | 'legendary',
    })) || [];
  } catch (error) {
    console.error('Error in getStudentAchievements:', error);
    return [];
  }
}

export async function getLeaderboard(limit: number = 10): Promise<StudentGameProfile[]> {
  try {
    const { data, error } = await supabase
      .from('student_game_stats')
      .select(`
        student_id,
        total_points,
        current_rank,
        students (
          first_name,
          last_name,
          user_type
        )
      `)
      .order('total_points', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data?.map(entry => ({
      student_id: entry.student_id,
      first_name: entry.students?.first_name || '',
      last_name: entry.students?.last_name || '',
      user_type: entry.students?.user_type || 'student',
      total_points: entry.total_points,
      current_rank: entry.current_rank,
      achievements_count: 0, // Would need separate query
      recent_achievements: [],
      total_check_ins: 0, // Would need separate query
      last_check_in: null,
      wednesday_streak: 0,
      sunday_streak: 0,
      total_streak: 0,
    })) || [];
  } catch (error) {
    console.error('Error in getLeaderboard:', error);
    return [];
  }
}

export function getEncouragingMessage(profile: StudentGameProfile): string {
  const messages = {
    firstTime: [
      "Welcome to the family! 🎉",
      "Your journey begins now! ✨",
      "So glad you're here! 💙",
    ],
    streak: [
      `Amazing ${profile.total_streak}-week streak! 🔥`,
      "You're on fire! Keep it up! ⚡",
      "Consistency is key - you're nailing it! 🌟",
    ],
    regular: [
      "Great to see you again! 😊",
      "Your dedication shows! 💪",
      "Keep building those habits! 🚀",
    ],
    leader: [
      "Leading by example! 👑",
      "Your leadership inspires others! ✨",
      "Thank you for serving! 🙏",
    ],
  };

  if (profile.total_check_ins === 1) {
    return messages.firstTime[Math.floor(Math.random() * messages.firstTime.length)];
  }

  if (profile.user_type === 'student_leader') {
    return messages.leader[Math.floor(Math.random() * messages.leader.length)];
  }

  if (profile.total_streak >= 3) {
    return messages.streak[Math.floor(Math.random() * messages.streak.length)];
  }

  return messages.regular[Math.floor(Math.random() * messages.regular.length)];
}