import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Sparkles, Trophy, Zap, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GameAchievement from "./GameAchievement";
import ConfettiEffect from "./ConfettiEffect";
import {
  calculateGameReward,
  getRankFromPoints,
  getEncouragingMessage,
  type StudentGameStats,
  type GameReward,
  type Achievement,
} from "@/utils/gamification";
import { getRandomVerse, type BibleVerse } from "@/utils/bibleVerses";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  grade?: string | null;
  high_school?: string | null;
  created_at: string;
}

interface GameCheckInSuccessProps {
  student: Student;
  onNewCheckIn: () => void;
}

const GameCheckInSuccess = ({ student, onNewCheckIn }: GameCheckInSuccessProps) => {
  const [gameStats, setGameStats] = useState<StudentGameStats | null>(null);
  const [gameReward, setGameReward] = useState<GameReward | null>(null);
  const [previousPoints, setPreviousPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [bibleVerse, setBibleVerse] = useState<BibleVerse | null>(null);

  // Get user type display text
  const getUserTypeDisplay = (userType: string, grade?: string | null, highSchool?: string | null) => {
    if (userType === 'student_leader') {
      return 'Student Leader';
    }

    if (grade && highSchool) {
      const gradeNum = parseInt(grade);
      if (gradeNum >= 6 && gradeNum <= 8) {
        return 'Middle School Student';
      } else if (gradeNum >= 9 && gradeNum <= 12) {
        return 'High School Student';
      }
    }

    return 'Student';
  };

  useEffect(() => {
    const fetchGameStats = async () => {
      setIsLoading(true);
      try {
        // Get all check-ins for this student
        const { data: checkIns, error: checkInsError } = await supabase
          .from('check_ins')
          .select('checked_in_at')
          .eq('student_id', student.id)
          .order('checked_in_at', { ascending: false });

        if (checkInsError) {
          console.error("Error fetching check-ins:", checkInsError);
          return;
        }

        const totalCheckIns = checkIns?.length || 0;
        const isFirstTime = totalCheckIns === 1;

        // Calculate streaks using the same logic as analytics
        const checkInsByDate = checkIns?.map(ci => ({
          date: new Date(ci.checked_in_at),
          dayOfWeek: new Date(ci.checked_in_at).getDay()
        })).sort((a, b) => b.date.getTime() - a.date.getTime()) || [];

        // Calculate streaks (simplified version)
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

        const now = new Date();
        const stats: StudentGameStats = {
          totalCheckIns,
          wednesdayStreak: calculateStreak([3]),
          sundayStreak: calculateStreak([0]),
          totalStreak: calculateTotalStreak(),
          consecutiveDays: Math.min(totalCheckIns, 7), // Simplified
          monthsActive: Math.ceil(totalCheckIns / 4), // Roughly
          isFirstTime,
          isStudentLeader: student.user_type === 'student_leader',
          dayOfWeek: now.getDay(),
          currentMonth: now.getMonth(),
          currentHour: now.getHours(),
        };

        // Get previous points (simplified - in real app, you'd store this)
        const estimatedPreviousPoints = Math.max(0, (totalCheckIns - 1) * 15);

        const reward = calculateGameReward(stats, estimatedPreviousPoints);

        setGameStats(stats);
        setGameReward(reward);
        setPreviousPoints(estimatedPreviousPoints);
        setBibleVerse(getRandomVerse());

        // Trigger celebration animation with staggered effects
        setTimeout(() => setShowCelebration(true), 300);

        // Play celebration "sound" (visual feedback for now)
        if (stats.isFirstTime || reward.achievements.length > 0 || reward.levelUp) {
          // Could add actual sound here: new Audio('/celebration.mp3').play()
          navigator.vibrate?.(200); // Haptic feedback on mobile
        }

      } catch (error) {
        console.error("Error calculating game stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGameStats();
  }, [student.id, student.user_type]);

  if (isLoading || !gameStats || !gameReward) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Calculating your rewards...</p>
        </CardContent>
      </Card>
    );
  }

  const currentRank = getRankFromPoints(previousPoints + gameReward.points);
  const encouragingMessage = getEncouragingMessage(gameStats);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Confetti Effect */}
      <ConfettiEffect
        active={showCelebration && (gameStats.isFirstTime || gameReward.achievements.length > 0 || gameReward.levelUp)}
        duration={4000}
      />

      {/* Main Success Card */}
      <Card className={`relative overflow-hidden transition-all duration-1000 ${
        showCelebration ? 'scale-105 shadow-2xl' : 'scale-100'
      }`}>
        {/* Celebration background effect */}
        {showCelebration && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-yellow-500/10 animate-pulse" />
        )}

        <CardHeader className="text-center relative z-10">
          <div className="flex justify-center mb-4">
            {showCelebration ? (
              <Trophy className="h-20 w-20 text-yellow-500" />
            ) : (
              <CheckCircle className="h-16 w-16 text-green-500" />
            )}
          </div>

          <CardTitle className="text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            {gameStats.isFirstTime ? "Welcome to the Adventure!" : "Check-In Complete!"}
          </CardTitle>

          <CardDescription className="text-lg">
            {encouragingMessage}
            <br />
            <span className="font-medium text-primary">
              {student.first_name} {student.last_name} • {getUserTypeDisplay(student.user_type, student.grade, student.high_school)}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 relative z-10">
          {/* Points and Rank Display */}
          <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200">
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 flex items-center justify-center gap-2">
                  <Zap className="h-8 w-8 text-yellow-500" />
                  +{gameReward.points}
                </div>
                <div className="text-sm text-purple-600 font-medium">Points Earned</div>
              </div>

              <div className="h-12 w-px bg-purple-300" />

              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {previousPoints + gameReward.points}
                </div>
                <div className="text-sm text-blue-600 font-medium">Total Points</div>
              </div>

              <div className="h-12 w-px bg-purple-300" />

              <div className="text-center">
                <div className="text-2xl font-bold flex items-center justify-center gap-2">
                  <span className="text-2xl">{currentRank.emoji}</span>
                  <span style={{ color: currentRank.color }}>{currentRank.title}</span>
                </div>
                <div className="text-sm text-gray-600">Your Rank</div>
              </div>
            </div>

            {gameReward.levelUp && (
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                <div className="text-lg font-bold text-yellow-800 flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5" />
                  RANK UP! You're now a {gameReward.levelUp.newRank}!
                </div>
              </div>
            )}

            {gameReward.streakBonus && gameReward.streakBonus > 0 && (
              <div className="bg-orange-100 border-2 border-orange-300 rounded-xl p-3">
                <div className="text-md font-bold text-orange-800 flex items-center justify-center gap-2">
                  <Target className="h-4 w-4" />
                  Streak Bonus: +{gameReward.streakBonus} points!
                </div>
              </div>
            )}
          </div>

          {/* New Achievements */}
          {gameReward.achievements.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-center flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                New Achievements Unlocked!
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gameReward.achievements.map((achievement) => (
                  <GameAchievement
                    key={achievement.id}
                    achievement={achievement}
                    isNew={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl text-center border-2 border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{gameStats.totalCheckIns}</div>
              <div className="text-sm text-blue-600 font-medium">Total Visits</div>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center border-2 border-green-200">
              <div className="text-2xl font-bold text-green-600">{gameStats.totalStreak}</div>
              <div className="text-sm text-green-600 font-medium">Total Streak</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl text-center border-2 border-purple-200">
              <div className="text-2xl font-bold text-purple-600">{gameStats.wednesdayStreak}</div>
              <div className="text-sm text-purple-600 font-medium">Wed Streak</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-xl text-center border-2 border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{gameStats.sundayStreak}</div>
              <div className="text-sm text-orange-600 font-medium">Sun Streak</div>
            </div>
          </div>

          {/* Bible Verse */}
          {bibleVerse && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 text-center">
              <div className="text-lg font-medium text-blue-800 mb-2 italic">
                "{bibleVerse.text}"
              </div>
              <div className="text-sm font-bold text-blue-600">
                — {bibleVerse.reference}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="text-center pt-4">
            <Button
              onClick={onNewCheckIn}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-3 rounded-2xl transform hover:scale-105 transition-all duration-200"
            >
              Check In Another Student
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameCheckInSuccess;