"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Zap, Trophy } from "lucide-react";
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
  email?: string | null;
  created_at: string;
}

interface GameCheckInSuccessDBProps {
  student: Student;
  checkInId: string;
  profilePin?: string; // kept for backward compatibility, not displayed
  onNewCheckIn: () => void;
}

const GameCheckInSuccessDB = ({ student, checkInId, onNewCheckIn }: GameCheckInSuccessDBProps) => {
  const [reward, setReward] = useState<CheckinReward | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const fetchRewards = async () => {
      setIsLoading(true);
      try {
        if (!checkInId) {
          setReward({
            points_awarded: 10,
            total_points: 10,
            rank_changed: false,
            current_rank: "Newcomer",
            achievements: [],
            is_first_time: false,
            bible_verse: { text: "Taste and see that the Lord is good", reference: "Psalm 34:8", theme: "goodness" },
          });
          setIsLoading(false);
          return;
        }

        const rewardData = await processCheckinRewards(student.id, checkInId);
        if (rewardData) {
          setReward(rewardData);
          setTimeout(() => setShowCelebration(true), 300);
          if (rewardData.is_first_time || rewardData.achievements.length > 0 || rewardData.rank_changed) {
            navigator.vibrate?.(200);
          }
        } else {
          setReward({
            points_awarded: 10,
            total_points: 10,
            rank_changed: false,
            current_rank: "Newcomer",
            achievements: [],
            is_first_time: false,
            bible_verse: { text: "Give thanks to the Lord, for he is good", reference: "Psalm 107:1", theme: "goodness" },
          });
        }
      } catch (error) {
        console.error("Error processing check-in rewards:", error);
        setReward({
          points_awarded: 10,
          total_points: 10,
          rank_changed: false,
          current_rank: "Newcomer",
          achievements: [],
          is_first_time: false,
          bible_verse: { text: "The Lord is good to all", reference: "Psalm 145:9", theme: "goodness" },
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRewards();
  }, [student.id, checkInId]);

  if (isLoading || !reward) {
    return (
      <div className="w-full max-w-lg mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-stone-300 border-t-stone-800 mx-auto mb-4" />
          <p className="text-sm text-stone-500">Calculating your rewards...</p>
        </div>
      </div>
    );
  }

  const currentRank = getRankInfo(reward.current_rank);

  const mockProfile: StudentGameProfile = {
    student_id: student.id,
    first_name: student.first_name,
    last_name: student.last_name,
    user_type: student.user_type,
    total_points: reward.total_points,
    current_rank: reward.current_rank,
    achievements_count: reward.achievements.length,
    recent_achievements: reward.achievements,
    total_check_ins: reward.is_first_time ? 1 : 0,
    last_check_in: new Date().toISOString(),
    wednesday_streak: 0,
    sunday_streak: 0,
    total_streak: 0,
  };

  const encouragingMessage = getEncouragingMessage(mockProfile);

  return (
    <div className="w-full max-w-lg mx-auto px-4">
      <ConfettiEffect
        active={showCelebration && (reward.rank_changed || reward.achievements.length > 0)}
        duration={3000}
      />

      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-emerald-100 mb-4">
            <Check className="h-7 w-7 text-emerald-600" strokeWidth={3} />
          </div>

          <h2 className="text-2xl font-semibold text-stone-900 mb-1">
            {reward.is_first_time ? "Welcome!" : "You're checked in!"}
          </h2>

          <p className="text-stone-500">
            {student.first_name} {student.last_name}
          </p>

          <p className="text-sm text-stone-400 mt-1">
            {encouragingMessage}
          </p>
        </div>

        {/* Stats row */}
        <div className="px-6 pb-5">
          <div className="flex items-center justify-between bg-stone-50 rounded-xl px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-stone-700">+{reward.points_awarded}</span>
              <span className="text-xs text-stone-400">{reward.total_points} total</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base">{currentRank.emoji}</span>
              <span className="text-sm font-medium" style={{ color: currentRank.color }}>
                {currentRank.title}
              </span>
            </div>
          </div>

          {/* Rank up notification */}
          {reward.rank_changed && (
            <div className="mt-3 flex items-center justify-center gap-2 bg-amber-50 rounded-xl px-4 py-2.5 border border-amber-200">
              <Trophy className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">
                Rank up! You&apos;re now a {reward.current_rank}!
              </span>
            </div>
          )}
        </div>

        {/* Achievement (show one at a time, clean) */}
        {reward.achievements.length > 0 && (
          <div className="px-6 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-2">
              New Achievement
            </p>
            <GameAchievement
              achievement={reward.achievements[0]}
              isNew={true}
            />
            {reward.achievements.length > 1 && (
              <p className="text-xs text-stone-400 text-center mt-2">
                +{reward.achievements.length - 1} more achievement{reward.achievements.length > 2 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Bible verse */}
        {reward.bible_verse && (
          <div className="px-6 pb-5">
            <div className="text-center py-4">
              <p className="text-sm italic text-stone-600 leading-relaxed">
                &ldquo;{reward.bible_verse.text}&rdquo;
              </p>
              <p className="text-xs font-medium text-stone-400 mt-2">
                &mdash; {reward.bible_verse.reference}
              </p>
            </div>
          </div>
        )}

        {/* Action button */}
        <div className="px-6 pb-8">
          <Button
            onClick={onNewCheckIn}
            size="lg"
            className="w-full bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl h-12"
          >
            Check In Another Student
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GameCheckInSuccessDB;
