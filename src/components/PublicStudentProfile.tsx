/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps, react/no-unescaped-entities */
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
  dateOfBirth: z.string().optional().or(z.literal("")),
  motherFirstName: z.string().trim().optional().or(z.literal("")),
  motherLastName: z.string().trim().optional().or(z.literal("")),
  motherPhone: z.string().trim().optional().or(z.literal("")),
  fatherFirstName: z.string().trim().optional().or(z.literal("")),
  fatherLastName: z.string().trim().optional().or(z.literal("")),
  fatherPhone: z.string().trim().optional().or(z.literal("")),
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  // Check if PIN is already stored in localStorage
  useEffect(() => {
    const storedPin = localStorage.getItem(`profile_pin_${studentId}`);
    if (storedPin) {
      setIsUnlocked(true);
      setPinInput(storedPin);
    }
  }, [studentId]);

  const verifyPin = async () => {
    setIsLoading(true);
    setPinError("");
    try {
      const { data, error } = await supabase
        .rpc('verify_profile_pin', {
          p_student_id: studentId,
          p_pin: pinInput
        });

      if (error) throw error;

      const result = data as { valid?: boolean; message?: string } | null;
      if (result && result.valid) {
        setIsUnlocked(true);
        // Store PIN in localStorage so user doesn't need to enter it again
        localStorage.setItem(`profile_pin_${studentId}`, pinInput);
      } else {
        setPinError(result?.message || 'Incorrect PIN');
      }
    } catch (error) {
      console.error('PIN verification error:', error);
      setPinError('Failed to verify PIN. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on mount and when refreshTrigger changes
  useEffect(() => {
    if (!isUnlocked) return; // Don't load data until unlocked
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching data for student:', studentId);

        // Fetch student info using RPC to bypass RLS
        const { data: studentResult, error: studentError } = await supabase
          .rpc('get_student_by_id', { p_student_id: studentId });

        if (studentError) {
          console.error('Student fetch error:', studentError);
          console.error('Error details:', JSON.stringify(studentError, null, 2));
          throw studentError;
        }

        if (!studentResult || studentResult.length === 0) {
          throw new Error('Student not found');
        }

        const student = studentResult[0];
        console.log('Student data:', student);
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
          dateOfBirth: student.date_of_birth || '',
          motherFirstName: student.mother_first_name || '',
          motherLastName: student.mother_last_name || '',
          motherPhone: student.mother_phone || '',
          fatherFirstName: student.father_first_name || '',
          fatherLastName: student.father_last_name || '',
          fatherPhone: student.father_phone || '',
        });

        // Fetch game profile
        console.log('Fetching game profile for:', studentId);
        const profile = await getStudentGameProfile(studentId);
        console.log('Game profile received:', profile);
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

    fetchData();
  }, [studentId, refreshTrigger, isUnlocked]);

  const onSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase
        .rpc('update_student_profile', {
          p_student_id: studentId,
          p_first_name: data.firstName,
          p_last_name: data.lastName,
          p_phone_number: data.phoneNumber || undefined,
          p_email: data.email || undefined,
          p_instagram_handle: data.instagramHandle || undefined,
          p_grade: data.grade || undefined,
          p_high_school: data.highSchool || undefined,
          p_date_of_birth: data.dateOfBirth || undefined,
          p_mother_first_name: data.motherFirstName || undefined,
          p_mother_last_name: data.motherLastName || undefined,
          p_mother_phone: data.motherPhone || undefined,
          p_father_first_name: data.fatherFirstName || undefined,
          p_father_last_name: data.fatherLastName || undefined,
          p_father_phone: data.fatherPhone || undefined,
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your profile has been updated",
      });

      setIsEditing(false);
      setRefreshTrigger(prev => prev + 1); // Trigger data refresh
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

  // Show PIN entry screen if not unlocked
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Enter Your Profile PIN</CardTitle>
            <CardDescription>
              You received this PIN when you checked in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="Enter 4-digit PIN"
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/\D/g, ''));
                  setPinError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && pinInput.length === 4) {
                    verifyPin();
                  }
                }}
                className="text-center text-3xl tracking-widest font-mono h-16"
                autoFocus
              />
              {pinError && (
                <p className="text-sm text-red-600 mt-2 text-center">{pinError}</p>
              )}
            </div>
            <Button
              onClick={verifyPin}
              disabled={pinInput.length !== 4 || isLoading}
              className="w-full h-12"
              size="lg"
            >
              {isLoading ? "Verifying..." : "Unlock Profile"}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              <p>Don't have your PIN?</p>
              <p>Check in again to get a new one!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading && !studentData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const currentRank = gameProfile ? getRankInfo(gameProfile.current_rank) : getRankInfo('Newcomer');
  const nextRank = gameProfile ? getNextRank(gameProfile.total_check_ins) : null;
  const progressToNextRank = nextRank
    ? ((gameProfile!.total_check_ins - currentRank.minCheckIns) / (nextRank.minCheckIns - currentRank.minCheckIns)) * 100
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
                  <span>{gameProfile?.total_check_ins || 0} / {nextRank.minCheckIns}</span>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {studentData?.user_type !== 'student_leader' && (
                    <>
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
                            <FormLabel>School Name</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Mother Information */}
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-medium text-foreground">Mother Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="motherFirstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mother First Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="First name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="motherLastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mother Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Last name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="motherPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mother Phone</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Phone number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Father Information */}
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-foreground">Father Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="fatherFirstName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Father First Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="First name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fatherLastName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Father Last Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Last name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="fatherPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Father Phone</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Phone number" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    </>
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
                {studentData?.date_of_birth && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Born: {new Date(studentData.date_of_birth).toLocaleDateString()}</span>
                  </div>
                )}
                {studentData?.user_type !== 'student_leader' && (studentData?.mother_first_name || studentData?.father_first_name) && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-2">Parent/Guardian Info</h4>
                    {studentData?.mother_first_name && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Mother:</span> {studentData.mother_first_name} {studentData.mother_last_name}
                        {studentData.mother_phone && ` • ${studentData.mother_phone}`}
                      </div>
                    )}
                    {studentData?.father_first_name && (
                      <div className="text-sm">
                        <span className="font-medium">Father:</span> {studentData.father_first_name} {studentData.father_last_name}
                        {studentData.father_phone && ` • ${studentData.father_phone}`}
                      </div>
                    )}
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
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {gameProfile?.total_check_ins || 0}
                </div>
                <div className="text-xs text-muted-foreground">Total Check-ins</div>
              </div>
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <div className="text-2xl font-bold text-secondary">
                  {gameProfile?.total_streak || 0}
                </div>
                <div className="text-xs text-muted-foreground">Week Streak 🔥</div>
              </div>
              <div className="text-center p-4 bg-accent/20 rounded-lg">
                <div className="text-2xl font-bold text-secondary">
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
