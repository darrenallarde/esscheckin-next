import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [isSaving, setIsSaving] = React.useState(false);

  // Editable form state
  const [formData, setFormData] = React.useState({
    email: '',
    phone_number: '',
    instagram_handle: '',
    date_of_birth: '',
    address: '',
    city: '',
    state: '',
    zip: '',
  });

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

  // Populate form data when student info loads
  React.useEffect(() => {
    if (studentInfo) {
      setFormData({
        email: studentInfo.email || '',
        phone_number: studentInfo.phone_number || '',
        instagram_handle: studentInfo.instagram_handle || '',
        date_of_birth: studentInfo.date_of_birth || '',
        address: studentInfo.address || '',
        city: studentInfo.city || '',
        state: studentInfo.state || 'California',
        zip: studentInfo.zip || '',
      });
    }
  }, [studentInfo]);

  // Handle form field changes
  const handleFieldChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle save
  const handleSave = async () => {
    if (!studentInfo?.id) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          email: formData.email,
          phone_number: formData.phone_number,
          instagram_handle: formData.instagram_handle,
          date_of_birth: formData.date_of_birth || null,
          address: formData.address || null,
          city: formData.city || null,
          state: formData.state || 'California',
          zip: formData.zip || null,
        })
        .eq('id', studentInfo.id);

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to save changes. Please try again.');
      } else {
        alert('Profile updated successfully!');
        // Refetch student data to update display
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('An error occurred while saving. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

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
                {/* Editable Contact Information */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleFieldChange('email', e.target.value)}
                        placeholder="your.email@example.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone_number" className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        Phone Number
                      </Label>
                      <Input
                        id="phone_number"
                        type="tel"
                        value={formData.phone_number}
                        onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                        placeholder="(123) 456-7890"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram_handle" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4 text-muted-foreground" />
                        Instagram Handle
                      </Label>
                      <Input
                        id="instagram_handle"
                        type="text"
                        value={formData.instagram_handle}
                        onChange={(e) => handleFieldChange('instagram_handle', e.target.value)}
                        placeholder="@username"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date_of_birth" className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        Date of Birth
                      </Label>
                      <Input
                        id="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={(e) => handleFieldChange('date_of_birth', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Address Fields */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-sm text-muted-foreground">Address Information</h3>

                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleFieldChange('address', e.target.value)}
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-1">
                        <Label htmlFor="city">City</Label>
                        <Input
                          id="city"
                          type="text"
                          value={formData.city}
                          onChange={(e) => handleFieldChange('city', e.target.value)}
                          placeholder="Los Angeles"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="state">State</Label>
                        <Input
                          id="state"
                          type="text"
                          value={formData.state}
                          onChange={(e) => handleFieldChange('state', e.target.value)}
                          placeholder="California"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="zip">ZIP Code</Label>
                        <Input
                          id="zip"
                          type="text"
                          value={formData.zip}
                          onChange={(e) => handleFieldChange('zip', e.target.value)}
                          placeholder="90210"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
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
                      <div className="text-center p-4 bg-secondary/10 rounded-lg">
                        <div className="text-3xl font-bold text-secondary">
                          {gameProfile.total_streak}
                        </div>
                        <div className="text-sm text-muted-foreground">Week Streak 🔥</div>
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
