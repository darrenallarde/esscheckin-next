import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Star, Edit, Save, X, Phone, Mail, Instagram, User, School, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getStudentGameProfile, getRankInfo, getNextRank, type StudentGameProfile } from "@/utils/gamificationDB";
import GameAchievement from "./GameAchievement";

const profileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  phoneNumber: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  instagramHandle: z.string().trim().optional().or(z.literal("")),
  grade: z.string().trim().optional().or(z.literal("")),
  highSchool: z.string().trim().optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface PublicStudentProfileProps {
  studentId: string;
  onBack: () => void;
}

const PublicStudentProfile = ({ studentId, onBack }: PublicStudentProfileProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [gameProfile, setGameProfile] = useState<StudentGameProfile | null>(null);
  const [studentData, setStudentData] = useState<any>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Fetch student data and game profile
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch student info
      const { data: student, error: studentError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single();

      if (studentError) throw studentError;

      setStudentData(student);

      // Populate form
      form.reset({
        firstName: student.first_name || '',
        lastName: student.last_name || '',
        phoneNumber: student.phone_number || '',
        email: student.email || '',
        instagramHandle: student.instagram_handle || '',
        grade: student.grade || '',
        highSchool: student.high_school || '',
      });

      // Fetch game profile
      const profile = await getStudentGameProfile(studentId);
      setGameProfile(profile);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [studentId]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber || null,
          email: data.email || null,
          instagram_handle: data.instagramHandle || null,
          grade: data.grade || null,
          high_school: data.highSchool || null,
        })
        .eq('id', studentId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your profile has been updated",
      });

      setIsEditing(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !studentData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const currentRank = gameProfile ? getRankInfo(gameProfile.current_rank) : getRankInfo('Newcomer');
  const nextRank = gameProfile ? getNextRank(gameProfile.total_points) : null;
  const progressToNextRank = nextRank
    ? ((gameProfile!.total_points - currentRank.minPoints) / (nextRank.minPoints - currentRank.minPoints)) * 100
    : 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            ← Back
          </Button>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="w-4 h-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Stats Overview */}
        <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {studentData?.first_name} {studentData?.last_name}
                </h1>
                <div className="flex items-center gap-2">
                  <Badge className="bg-white/20 text-white border-white/40">
                    {currentRank.emoji} {currentRank.title}
                  </Badge>
                  {studentData?.user_type === 'student_leader' && (
                    <Badge className="bg-yellow-400/30 text-white border-yellow-300/40">
                      🌟 Student Leader
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{gameProfile?.total_points || 0}</div>
                <div className="text-white/80 text-sm">Total Points</div>
              </div>
            </div>

            {nextRank && (
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Progress to {nextRank.emoji} {nextRank.title}</span>
                  <span>{gameProfile?.total_points || 0} / {nextRank.minPoints}</span>
                </div>
                <Progress value={progressToNextRank} className="h-2 bg-white/20" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Achievements
            </CardTitle>
            <CardDescription>
              {gameProfile?.achievements_count || 0} achievements unlocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gameProfile?.recent_achievements && gameProfile.recent_achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {gameProfile.recent_achievements.map((achievement, index) => (
                  <GameAchievement key={index} achievement={achievement} isNew={false} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No achievements yet. Keep checking in to unlock them!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription>Your personal details</CardDescription>
              </div>
              {isEditing && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      form.reset();
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={isLoading}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Optional" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Optional" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="instagramHandle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instagram Handle</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="@username" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {studentData?.user_type !== 'student_leader' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="grade"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Grade</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="highSchool"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>High School</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </form>
              </Form>
            ) : (
              <div className="space-y-3">
                {studentData?.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{studentData.phone_number}</span>
                  </div>
                )}
                {studentData?.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{studentData.email}</span>
                  </div>
                )}
                {studentData?.instagram_handle && (
                  <div className="flex items-center gap-3">
                    <Instagram className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{studentData.instagram_handle}</span>
                  </div>
                )}
                {studentData?.grade && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Grade {studentData.grade}</span>
                  </div>
                )}
                {studentData?.high_school && (
                  <div className="flex items-center gap-3">
                    <School className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{studentData.high_school}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Check-in Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5" />
              Check-in Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {gameProfile?.total_check_ins || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Check-ins</div>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {gameProfile?.wednesday_streak || 0}
                </div>
                <div className="text-xs text-muted-foreground">Wednesday Streak</div>
              </div>
              <div className="text-center p-4 bg-pink-50 rounded-lg">
                <div className="text-2xl font-bold text-pink-600">
                  {gameProfile?.sunday_streak || 0}
                </div>
                <div className="text-xs text-muted-foreground">Sunday Streak</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {gameProfile?.achievements_count || 0}
                </div>
                <div className="text-xs text-muted-foreground">Achievements</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicStudentProfile;
