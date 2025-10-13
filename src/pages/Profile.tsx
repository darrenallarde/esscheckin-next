import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, LogOut, Calendar, Phone, Mail, Instagram, User, School, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { getStudentGameProfile, getRankInfo, getNextRank } from "@/utils/gamificationDB";
import GameAchievement from "@/components/GameAchievement";
import SuperAdminProfileManager from "@/components/SuperAdminProfileManager";

const Profile = () => {
  const { user, session, userRole, signOut, loading: authLoading } = useAuth();
  const isSuperAdmin = userRole === 'super_admin';
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = React.useState(false);

  // Wait for initial auth check to complete before redirecting
  React.useEffect(() => {
    if (!authLoading) {
      // Give a moment for the auth state to settle
      const timer = setTimeout(() => {
        setAuthChecked(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  // Fetch student information based on authenticated email
  const { data: studentInfo, isLoading: isLoadingStudent, error: studentError } = useQuery({
    queryKey: ['student-profile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;

      console.log('Looking up student with email:', user.email);

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (error) {
        console.error('Error fetching student:', error);
        throw error;
      }

      console.log('Student found:', data);
      return data;
    },
    enabled: !!user?.email
  });

  // Fetch game profile
  const { data: gameProfile, isLoading: isLoadingGame } = useQuery({
    queryKey: ['game-profile', studentInfo?.id],
    queryFn: async () => {
      if (!studentInfo?.id) return null;
      return await getStudentGameProfile(studentInfo.id);
    },
    enabled: !!studentInfo?.id
  });

  // Redirect to login if not authenticated (after auth check completes)
  React.useEffect(() => {
    if (authChecked && !user) {
      navigate('/login');
    }
  }, [user, authChecked, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Show loading while checking authentication
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Show loading while fetching student data
  if (isLoadingStudent || isLoadingGame) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p>Loading your profile...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Student not found
  if (!isLoadingStudent && !studentInfo && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Profile Not Found</CardTitle>
            <CardDescription>
              We couldn't find a student profile for: <strong>{user.email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Make sure you've checked in at least once and that your email address matches your student record.
            </p>
            {studentError && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                Error: {studentError.message}
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={() => navigate("/")} className="flex-1">
                Go to Check-In
              </Button>
              <Button onClick={handleSignOut} variant="outline" className="flex-1">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentRank = gameProfile ? getRankInfo(gameProfile.current_rank) : null;
  const nextRank = gameProfile ? getNextRank(gameProfile.current_rank) : null;
  const progressToNext = gameProfile && nextRank
    ? Math.min(100, (gameProfile.total_points / nextRank.minPoints) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4 pb-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {isSuperAdmin ? 'Super Admin Profile Manager' : 'My Profile'}
            </h1>
            {isSuperAdmin && (
              <div className="flex items-center gap-2 mt-1">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-muted-foreground">Super Admin Access</span>
              </div>
            )}
          </div>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>

        {/* Super Admin Profile Manager */}
        {isSuperAdmin && <SuperAdminProfileManager isSuperAdmin={isSuperAdmin} />}

        {/* Regular Student Profile - only show if not super admin or if student info exists */}
        {!isSuperAdmin && studentInfo && (
          <>
            {/* Main Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">
                      {studentInfo.first_name} {studentInfo.last_name}
                    </CardTitle>
                    <CardDescription>
                      {studentInfo.user_type === 'student_leader' ? (
                        <Badge variant="secondary" className="mt-2">Student Leader</Badge>
                      ) : studentInfo.grade && studentInfo.high_school ? (
                        `Grade ${studentInfo.grade} • ${studentInfo.high_school}`
                      ) : (
                        'Student'
                      )}
                    </CardDescription>
                  </div>
                  {currentRank && (
                    <div className="text-center">
                      <div className="text-4xl mb-1">{currentRank.emoji}</div>
                      <Badge style={{ backgroundColor: currentRank.color, color: 'white' }}>
                        {currentRank.title}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {studentInfo.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{studentInfo.email}</span>
                    </div>
                  )}
                  {studentInfo.phone_number && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{studentInfo.phone_number}</span>
                    </div>
                  )}
                  {studentInfo.instagram_handle && (
                    <div className="flex items-center gap-2 text-sm">
                      <Instagram className="h-4 w-4 text-muted-foreground" />
                      <span>{studentInfo.instagram_handle}</span>
                    </div>
                  )}
                  {studentInfo.date_of_birth && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(studentInfo.date_of_birth).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Game Stats */}
            {gameProfile && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                      Your Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-3xl font-bold text-purple-600">
                          {gameProfile.total_points}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Points</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">
                          {gameProfile.total_check_ins}
                        </div>
                        <div className="text-sm text-muted-foreground">Check-ins</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">
                          {gameProfile.achievements_count}
                        </div>
                        <div className="text-sm text-muted-foreground">Achievements</div>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-3xl font-bold text-orange-600">
                          {Math.max(gameProfile.wednesday_streak, gameProfile.sunday_streak)}
                        </div>
                        <div className="text-sm text-muted-foreground">Best Streak</div>
                      </div>
                    </div>

                    {/* Progress to Next Rank */}
                    {nextRank && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress to {nextRank.title}</span>
                          <span className="font-semibold">
                            {gameProfile.total_points} / {nextRank.minPoints} points
                          </span>
                        </div>
                        <Progress value={progressToNext} className="h-3" />
                        <p className="text-xs text-muted-foreground">
                          {nextRank.minPoints - gameProfile.total_points} points until next rank!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Achievements */}
                {gameProfile.recent_achievements && gameProfile.recent_achievements.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        Recent Achievements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {gameProfile.recent_achievements.map((achievement) => (
                          <GameAchievement
                            key={achievement.id}
                            achievement={achievement}
                            isNew={false}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Actions */}
            <div className="flex gap-4">
              <Button onClick={() => navigate("/")} variant="outline" className="flex-1">
                Back to Check-In
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
