// Gamification system for check-ins

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  points: number;
  type: 'streak' | 'total' | 'special' | 'time';
  condition: (stats: StudentGameStats) => boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface StudentGameStats {
  totalCheckIns: number;
  wednesdayStreak: number;
  sundayStreak: number;
  totalStreak: number;
  consecutiveDays: number;
  monthsActive: number;
  isFirstTime: boolean;
  isStudentLeader: boolean;
  dayOfWeek: number; // 0 = Sunday, 3 = Wednesday
  currentMonth: number;
  currentHour: number;
}

export interface GameReward {
  points: number;
  achievements: Achievement[];
  levelUp?: {
    newLevel: number;
    newRank: string;
  };
  streakBonus?: number;
}

// Points system
export const POINTS = {
  BASE_CHECKIN: 10,
  FIRST_TIME: 50,
  STREAK_BONUS: 5, // per streak week
  STUDENT_LEADER_BONUS: 15,
  EARLY_BIRD: 20, // check-in before 6 PM
  DEDICATION: 25, // check-in after 7 PM
  WEEKEND_WARRIOR: 10, // Sunday check-in
  MIDWEEK_HERO: 10, // Wednesday check-in
} as const;

// Rank system based on total points
export const RANKS = [
  { minPoints: 0, title: "Newcomer", emoji: "🌱", color: "#22c55e" },
  { minPoints: 100, title: "Regular", emoji: "⭐", color: "#3b82f6" },
  { minPoints: 300, title: "Committed", emoji: "🔥", color: "#f59e0b" },
  { minPoints: 600, title: "Devoted", emoji: "💎", color: "#8b5cf6" },
  { minPoints: 1000, title: "Champion", emoji: "🏆", color: "#ef4444" },
  { minPoints: 2000, title: "Legend", emoji: "👑", color: "#d946ef" },
] as const;

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // First time achievements
  {
    id: "first_checkin",
    title: "Welcome to the Family!",
    description: "Your very first check-in",
    emoji: "🎉",
    points: 50,
    type: "special",
    condition: (stats) => stats.isFirstTime,
    rarity: "common",
  },

  // Streak achievements
  {
    id: "streak_3",
    title: "Getting Started",
    description: "3-week total streak",
    emoji: "🔥",
    points: 30,
    type: "streak",
    condition: (stats) => stats.totalStreak >= 3,
    rarity: "common",
  },
  {
    id: "streak_5",
    title: "On a Roll",
    description: "5-week total streak",
    emoji: "⚡",
    points: 50,
    type: "streak",
    condition: (stats) => stats.totalStreak >= 5,
    rarity: "rare",
  },
  {
    id: "streak_10",
    title: "Unstoppable",
    description: "10-week total streak",
    emoji: "🚀",
    points: 100,
    type: "streak",
    condition: (stats) => stats.totalStreak >= 10,
    rarity: "epic",
  },
  {
    id: "streak_20",
    title: "Legendary Dedication",
    description: "20-week total streak",
    emoji: "🌟",
    points: 200,
    type: "streak",
    condition: (stats) => stats.totalStreak >= 20,
    rarity: "legendary",
  },

  // Wednesday achievements
  {
    id: "wed_streak_5",
    title: "Midweek Warrior",
    description: "5-week Wednesday streak",
    emoji: "⚔️",
    points: 75,
    type: "streak",
    condition: (stats) => stats.wednesdayStreak >= 5,
    rarity: "rare",
  },

  // Sunday achievements
  {
    id: "sun_streak_5",
    title: "Sunday Faithful",
    description: "5-week Sunday streak",
    emoji: "☀️",
    points: 75,
    type: "streak",
    condition: (stats) => stats.sundayStreak >= 5,
    rarity: "rare",
  },

  // Total check-in achievements
  {
    id: "checkin_10",
    title: "Regular Attender",
    description: "10 total check-ins",
    emoji: "📅",
    points: 40,
    type: "total",
    condition: (stats) => stats.totalCheckIns >= 10,
    rarity: "common",
  },
  {
    id: "checkin_25",
    title: "Committed Member",
    description: "25 total check-ins",
    emoji: "💪",
    points: 75,
    type: "total",
    condition: (stats) => stats.totalCheckIns >= 25,
    rarity: "rare",
  },
  {
    id: "checkin_50",
    title: "Ministry Veteran",
    description: "50 total check-ins",
    emoji: "🎖️",
    points: 150,
    type: "total",
    condition: (stats) => stats.totalCheckIns >= 50,
    rarity: "epic",
  },
  {
    id: "checkin_100",
    title: "Ministry Legend",
    description: "100 total check-ins",
    emoji: "🏆",
    points: 300,
    type: "total",
    condition: (stats) => stats.totalCheckIns >= 100,
    rarity: "legendary",
  },

  // Time-based achievements
  {
    id: "early_bird",
    title: "Early Bird",
    description: "Check-in before 6 PM",
    emoji: "🐦",
    points: 20,
    type: "time",
    condition: (stats) => stats.currentHour < 18,
    rarity: "common",
  },
  {
    id: "night_owl",
    title: "Night Owl",
    description: "Check-in after 8 PM",
    emoji: "🦉",
    points: 25,
    type: "time",
    condition: (stats) => stats.currentHour >= 20,
    rarity: "common",
  },

  // Leadership achievements
  {
    id: "leader_bonus",
    title: "Leading by Example",
    description: "Student leader check-in",
    emoji: "👑",
    points: 25,
    type: "special",
    condition: (stats) => stats.isStudentLeader,
    rarity: "rare",
  },

  // Special achievements
  {
    id: "perfect_week",
    title: "Perfect Week",
    description: "Attended both Wednesday and Sunday",
    emoji: "💎",
    points: 50,
    type: "special",
    condition: (stats) => stats.wednesdayStreak >= 1 && stats.sundayStreak >= 1,
    rarity: "epic",
  },
];

export function calculatePoints(stats: StudentGameStats): number {
  let points = POINTS.BASE_CHECKIN;

  // First time bonus
  if (stats.isFirstTime) {
    points += POINTS.FIRST_TIME;
  }

  // Streak bonuses
  points += stats.totalStreak * POINTS.STREAK_BONUS;

  // Role bonuses
  if (stats.isStudentLeader) {
    points += POINTS.STUDENT_LEADER_BONUS;
  }

  // Time bonuses
  if (stats.currentHour < 18) {
    points += POINTS.EARLY_BIRD;
  } else if (stats.currentHour >= 19) {
    points += POINTS.DEDICATION;
  }

  // Day bonuses
  if (stats.dayOfWeek === 0) { // Sunday
    points += POINTS.WEEKEND_WARRIOR;
  } else if (stats.dayOfWeek === 3) { // Wednesday
    points += POINTS.MIDWEEK_HERO;
  }

  return points;
}

export function getNewAchievements(stats: StudentGameStats, previouslyEarned: string[] = []): Achievement[] {
  return ACHIEVEMENTS.filter(achievement =>
    achievement.condition(stats) && !previouslyEarned.includes(achievement.id)
  );
}

export function getRankFromPoints(totalPoints: number): typeof RANKS[number] {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalPoints >= RANKS[i].minPoints) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function calculateGameReward(stats: StudentGameStats, previousPoints: number = 0, previouslyEarned: string[] = []): GameReward {
  const points = calculatePoints(stats);
  const newAchievements = getNewAchievements(stats, previouslyEarned);

  const oldRank = getRankFromPoints(previousPoints);
  const newRank = getRankFromPoints(previousPoints + points);

  const levelUp = oldRank.title !== newRank.title ? {
    newLevel: RANKS.findIndex(r => r.title === newRank.title) + 1,
    newRank: newRank.title
  } : undefined;

  const streakBonus = stats.totalStreak >= 5 ? stats.totalStreak * 2 : 0;

  return {
    points,
    achievements: newAchievements,
    levelUp,
    streakBonus,
  };
}

export function getEncouragingMessage(stats: StudentGameStats): string {
  const messages = {
    firstTime: [
      "Welcome to the family! 🎉",
      "Your journey begins now! ✨",
      "So glad you're here! 💙",
    ],
    streak: [
      `Amazing ${stats.totalStreak}-week streak! 🔥`,
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

  if (stats.isFirstTime) {
    return messages.firstTime[Math.floor(Math.random() * messages.firstTime.length)];
  }

  if (stats.isStudentLeader) {
    return messages.leader[Math.floor(Math.random() * messages.leader.length)];
  }

  if (stats.totalStreak >= 3) {
    return messages.streak[Math.floor(Math.random() * messages.streak.length)];
  }

  return messages.regular[Math.floor(Math.random() * messages.regular.length)];
}