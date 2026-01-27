"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Trophy, Zap } from "lucide-react";
import GameAchievement from "./GameAchievement";
import ConfettiEffect from "./ConfettiEffect";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  profilePin?: string;
  onNewCheckIn: () => void;
}

const GameCheckInSuccessDB = ({ student, checkInId, profilePin, onNewCheckIn }: GameCheckInSuccessDBProps) => {
  const { toast } = useToast();
  const [reward, setReward] = useState<CheckinReward | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [emailInput, setEmailInput] = useState(student.email || '');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(!!student.email);

  // Handle email save
  const handleSaveEmail = async () => {
    const supabase = createClient();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput.trim() || !emailRegex.test(emailInput.trim())) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingEmail(true);
    try {
      const { data, error } = await supabase
        .rpc('update_student_email', {
          p_student_id: student.id,
          p_email: emailInput.trim()
        });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('Failed to update email');
      }

      setEmailSaved(true);
      toast({
        title: "Email saved!",
        description: "Your email has been added to your profile.",
      });
    } catch (error) {
      console.error('Error saving email:', error);
      toast({
        title: "Failed to save email",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEmail(false);
    }
  };

  // Get user type display text
  const getUserTypeDisplay = (userType: string, grade?: string | null, highSchool?: string | null) => {
    if (userType === 'student_leader') {
      return 'Student Leader';
    }

    if (grade && highSchool) {
      return `Grade ${grade} at ${highSchool}`;
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

        if (!checkInId) {
          console.error('No check-in ID provided');
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
          setTimeout(() => setShowCelebration(true), 300);

          if (rewardData.is_first_time || rewardData.achievements.length > 0 || rewardData.rank_changed) {
            navigator.vibrate?.(200);
          }
        } else {
          console.error('No reward data received');
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
      <div className="w-full max-w-4xl mx-auto space-y-6">
        <Card className="w-full max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Calculating your rewards...</p>
          </CardContent>
        </Card>
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
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <ConfettiEffect
        active={showCelebration && (reward.is_first_time || reward.achievements.length > 0 || reward.rank_changed)}
        duration={4000}
      />

      <Card className={`relative overflow-hidden transition-all duration-1000 ${
        showCelebration ? 'scale-105 shadow-2xl' : 'scale-100'
      }`}>
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
              {student.first_name} {student.last_name} - {getUserTypeDisplay(student.user_type, student.grade, student.high_school)}
            </span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 relative z-10">
          <div className="text-center p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-purple-600 flex items-center justify-center gap-2">
                  <Zap className="h-8 w-8 text-yellow-500" />
                  +{reward.points_awarded}
                </div>
                <div className="text-sm text-purple-600 font-medium mt-1">Points Earned</div>
              </div>

              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600">
                  {reward.total_points}
                </div>
                <div className="text-sm text-blue-600 font-medium mt-1">Total Points</div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold flex flex-col sm:flex-row items-center justify-center gap-2">
                  <span className="text-3xl">{currentRank.emoji}</span>
                  <span style={{ color: currentRank.color }} className="text-xl sm:text-2xl">{currentRank.title}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">Your Rank</div>
              </div>
            </div>

            {reward.rank_changed && (
              <div className="bg-yellow-100 border-2 border-yellow-300 rounded-xl p-4 mb-4">
                <div className="text-lg font-bold text-yellow-800 flex items-center justify-center gap-2">
                  <Trophy className="h-5 w-5" />
                  RANK UP! You&apos;re now a {reward.current_rank}!
                </div>
              </div>
            )}
          </div>

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

          {reward.bible_verse && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200 text-center">
              <div className="text-lg font-medium text-blue-800 mb-2 italic">
                &quot;{reward.bible_verse.text}&quot;
              </div>
              <div className="text-sm font-bold text-blue-600">
                - {reward.bible_verse.reference}
              </div>
            </div>
          )}

          {!emailSaved && (
            <div className="bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100 p-8 rounded-3xl border-4 border-purple-300 shadow-xl">
              <div className="space-y-5">
                <div className="text-center">
                  <div className="text-3xl mb-3">&#127881; &#10024; &#127942;</div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
                    Unlock Your Profile, {student.first_name}!
                  </div>
                  <div className="space-y-2 text-base text-gray-700">
                    <p className="font-semibold">Add your email to unlock:</p>
                    <div className="flex flex-col gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">&#127941;</span>
                        <span>View your achievements & rank anytime</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">&#128202;</span>
                        <span>Track your attendance & streaks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">&#127919;</span>
                        <span>See your points & progress</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-white/80 p-5 rounded-2xl">
                  <Label htmlFor="email-input" className="text-base font-semibold text-gray-800">
                    Your Email Address
                  </Label>
                  <Input
                    id="email-input"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="your.email@example.com"
                    disabled={isSavingEmail}
                    className="text-lg h-14 text-center"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSaveEmail();
                      }
                    }}
                  />

                  <Button
                    onClick={handleSaveEmail}
                    disabled={isSavingEmail}
                    size="lg"
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 hover:from-purple-600 hover:via-pink-600 hover:to-yellow-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
                  >
                    {isSavingEmail ? 'Saving...' : 'Unlock My Profile!'}
                  </Button>
                </div>

                <p className="text-xs text-center text-gray-600">
                  We&apos;ll never spam you. Just check-in updates and profile access!
                </p>
              </div>
            </div>
          )}

          {emailSaved && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
              <div className="text-center space-y-3">
                <div className="text-lg font-bold text-green-700">
                  Want to view your profile?
                </div>
                <div className="text-sm text-green-600 space-y-1">
                  <p>Visit <strong className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}/login</strong></p>
                  <p>and we&apos;ll send a 6-digit code to:</p>
                  <p className="font-semibold">{emailInput || student.email}</p>
                </div>
              </div>
            </div>
          )}

          {profilePin && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-2xl border-2 border-amber-200">
              <div className="text-center space-y-2">
                <div className="text-lg font-bold text-amber-700">
                  Your Profile PIN
                </div>
                <div className="text-3xl font-mono font-bold text-amber-800 tracking-widest">
                  {profilePin}
                </div>
                <p className="text-sm text-amber-600">
                  Save this PIN to access your profile later!
                </p>
              </div>
            </div>
          )}

          <div className="pt-4">
            <Button
              onClick={onNewCheckIn}
              size="lg"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-8 py-3 rounded-2xl transform hover:scale-105 transition-all duration-200"
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
