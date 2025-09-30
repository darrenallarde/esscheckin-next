import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Trophy, Zap, Target } from "lucide-react";
import GameAchievement from "./GameAchievement";
import ConfettiEffect from "./ConfettiEffect";
import {
  processCheckinRewards,
  getRankInfo,
  getEncouragingMessage,
  type CheckinReward,
  type StudentGameProfile,
} from "@/utils/gamificationDB";

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  user_type: string;
  grade?: string | null;
  high_school?: string | null;
  created_at: string;
}

interface GameCheckInSuccessDBProps {
  student: Student;
  checkInId: string;
  onNewCheckIn: () => void;
}

const GameCheckInSuccessDB = ({ student, checkInId, onNewCheckIn }: GameCheckInSuccessDBProps) => {
  const [reward, setReward] = useState<CheckinReward | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  // Get user type display text
  const getUserTypeDisplay = (userType: string, grade?: string | null, highSchool?: string | null) => {
    if (userType === 'student_leader') {
      return 'Student Leader';
    }

    if (grade && highSchool) {
      const gradeNum = parseInt(grade);
      if (gradeNum >= 6 && gradeNum <= 8) {
        return `Grade ${grade} at ${highSchool}`;
      } else if (gradeNum >= 9 && gradeNum <= 12) {
        return `Grade ${grade} at ${highSchool}`;
      }
    }

    if (grade) {
      return `Grade ${grade} Student`;
    }

    if (highSchool) {
      return `${highSchool} Student`;
    }

    return 'Student';
  };

  useEffect(() => {
    const fetchRewards = async () => {
      setIsLoading(true);
      try {
        console.log('Processing check-in rewards for student:', student.id);
        console.log('Check-in ID:', checkInId);
        console.log('Student details:', student);

        if (!checkInId) {
          console.error('No check-in ID provided');
          // For now, let's create a fallback experience
          setReward({
            points_awarded: 10,
            total_points: 10,
            rank_changed: false,
            current_rank: 'Newcomer',
            achievements: [],
            is_first_time: false,
            bible_verse: { text: "Taste and see that the Lord is good", reference: "Psalm 34:8", theme: "goodness" }
          });
          setIsLoading(false);
          return;
        }

        const rewardData = await processCheckinRewards(student.id, checkInId);
        console.log('Reward data received:', rewardData);

        if (rewardData) {
          setReward(rewardData);

          // Trigger celebration animation with staggered effects
          setTimeout(() => setShowCelebration(true), 300);

          // Play celebration "sound" (visual feedback for now)
          if (rewardData.is_first_time || rewardData.achievements.length > 0 || rewardData.rank_changed) {
            // Could add actual sound here: new Audio('/celebration.mp3').play()
            navigator.vibrate?.(200); // Haptic feedback on mobile
          }
        } else {
          console.error('No reward data received');
          // Fallback experience
          setReward({
            points_awarded: 10,
            total_points: 10,
            rank_changed: false,
            current_rank: 'Newcomer',
            achievements: [],
            is_first_time: false,
            bible_verse: { text: "Give thanks to the Lord, for he is good", reference: "Psalm 107:1", theme: "goodness" }
          });
        }
      } catch (error) {
        console.error("Error processing check-in rewards:", error);
        // Fallback experience
        setReward({
          points_awarded: 10,
          total_points: 10,
          rank_changed: false,
          current_rank: 'Newcomer',
          achievements: [],
          is_first_time: false,
          bible_verse: { text: "The Lord is good to all", reference: "Psalm 145:9", theme: "goodness" }
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewards();
  }, [student.id, checkInId]);

  if (isLoading || !reward) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Calculating your rewards...</p>
        </CardContent>
      </Card>
    );
  }

  const currentRank = getRankInfo(reward.current_rank);

  // Create a mock profile for the encouraging message
  const mockProfile: StudentGameProfile = {
    student_id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    user_type: student.user_type,
    total_points: reward.total_points,
    current_rank: reward.current_rank,
    achievements_count: reward.achievements.length,
    recent_achievements: reward.achievements,
    total_check_ins: reward.is_first_time ? 1 : 0, // We don't have exact count here
    last_check_in: new Date().toISOString(),
    wednesday_streak: 0, // Would need to fetch separately
    sunday_streak: 0,
    total_streak: 0,
  };

  const encouragingMessage = getEncouragingMessage(mockProfile);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Confetti Effect */}
      <ConfettiEffect
        active={showCelebration && (reward.is_first_time || reward.achievements.length > 0 || reward.rank_changed)}
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
            {reward.is_first_time ? "Welcome to the Adventure!" : "Check-In Complete!"}
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
                  +{reward.points_awarded}
                </div>
                <div className="text-sm text-purple-600 font-medium">Points Earned</div>
              </div>

              <div className="h-12 w-px bg-purple-300" />

              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {reward.total_points}
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

            {reward.rank_changed && (
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                <div className="text-lg font-bold text-yellow-800 flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5" />
                  RANK UP! You're now a {reward.current_rank}!
                </div>
              </div>
            )}
          </div>

          {/* New Achievements */}
          {reward.achievements.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-center flex items-center justify-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                New Achievements Unlocked!
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reward.achievements.map((achievement) => (
                  <GameAchievement
                    key={achievement.id}
                    achievement={achievement}
                    isNew={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Bible Verse */}
          {reward.bible_verse && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 text-center">
              <div className="text-lg font-medium text-blue-800 mb-2 italic">
                "{reward.bible_verse.text}"
              </div>
              <div className="text-sm font-bold text-blue-600">
                — {reward.bible_verse.reference}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={() => window.location.href = `/profile/${student.id}`}
              size="lg"
              variant="outline"
              className="flex-1 border-2 border-purple-300 text-purple-600 hover:bg-purple-50 font-semibold px-8 py-3 rounded-2xl"
            >
              View My Profile
            </Button>
            <Button
              onClick={onNewCheckIn}
              size="lg"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-3 rounded-2xl transform hover:scale-105 transition-all duration-200"
            >
              Check In Another Student
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameCheckInSuccessDB;