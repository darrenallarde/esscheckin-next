import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { User, LogOut, Calendar, Phone, Mail, Users, School, Instagram, ArrowLeft, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const StudentInfo = () => {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(
    searchParams.get("id")
  );

  // Search students
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['student-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];

      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone_number, email, grade, high_school')
        .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length >= 2
  });

  // Fetch selected student details
  const { data: studentInfo, isLoading: isLoadingStudent } = useQuery({
    queryKey: ['student-details', selectedStudentId],
    queryFn: async () => {
      if (!selectedStudentId) return null;

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', selectedStudentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedStudentId
  });

  // Redirect if not admin
  React.useEffect(() => {
    if (user && userRole && userRole !== 'admin') {
      navigate('/');
    }
  }, [user, userRole, navigate]);

  // Show loading while determining access
  if (!user || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect non-admins
  if (userRole !== 'admin') {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setSearchParams({ id: studentId });
    setSearchTerm("");
  };

  const handleClearSelection = () => {
    setSelectedStudentId(null);
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Student Information</h1>
            <div className="flex items-center gap-2">
              <Badge variant="default">Admin</Badge>
              <span className="text-muted-foreground">{user.email}</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Search Section */}
        {!selectedStudentId && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Search for a Student
              </CardTitle>
              <CardDescription>
                Search by name, phone number, or email
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {isSearching && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  </div>
                )}

                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((student) => (
                      <div
                        key={student.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => handleSelectStudent(student.id)}
                      >
                        <div>
                          <div className="font-medium">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {student.phone_number && <span>{student.phone_number}</span>}
                            {student.phone_number && student.email && <span> • </span>}
                            {student.email && <span>{student.email}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {student.grade && <span>Grade {student.grade}</span>}
                            {student.grade && student.high_school && <span> • </span>}
                            {student.high_school && <span>{student.high_school}</span>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {searchTerm.length >= 2 && !isSearching && searchResults?.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No students found matching "{searchTerm}"
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Details View */}
        {selectedStudentId && studentInfo && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {studentInfo.first_name} {studentInfo.last_name}
              </h2>
              <Button variant="outline" onClick={handleClearSelection}>
                Search Another Student
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium">Full Name:</span>
                      <div>{studentInfo.first_name} {studentInfo.last_name}</div>
                    </div>
                  </div>

                  {studentInfo.date_of_birth && (
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium">Date of Birth:</span>
                        <div>{new Date(studentInfo.date_of_birth).toLocaleDateString()}</div>
                      </div>
                    </div>
                  )}

                  {studentInfo.phone_number && (
                    <div className="flex items-start gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium">Phone:</span>
                        <div>{studentInfo.phone_number}</div>
                      </div>
                    </div>
                  )}

                  {studentInfo.email && (
                    <div className="flex items-start gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium">Email:</span>
                        <div>{studentInfo.email}</div>
                      </div>
                    </div>
                  )}

                  {studentInfo.instagram_handle && (
                    <div className="flex items-start gap-2 text-sm">
                      <Instagram className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium">Instagram:</span>
                        <div>@{studentInfo.instagram_handle}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium">User Type:</span>
                      <div className="capitalize">{studentInfo.user_type || 'Student'}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <span className="font-medium">Member Since:</span>
                      <div>{new Date(studentInfo.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* School Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <School className="w-5 h-5" />
                    School Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentInfo.grade && (
                    <div className="flex items-start gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium">Grade:</span>
                        <div>{studentInfo.grade}</div>
                      </div>
                    </div>
                  )}

                  {studentInfo.high_school && (
                    <div className="flex items-start gap-2 text-sm">
                      <School className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <span className="font-medium">High School:</span>
                        <div>{studentInfo.high_school}</div>
                      </div>
                    </div>
                  )}

                  {!studentInfo.grade && !studentInfo.high_school && (
                    <div className="text-sm text-muted-foreground py-4">
                      No school information available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Parent/Guardian Information */}
            {(studentInfo.mother_first_name || studentInfo.father_first_name || studentInfo.parent_name) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Parent / Guardian Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mother Information */}
                    {studentInfo.mother_first_name && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm border-b pb-2">Mother</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <span className="font-medium">Name:</span>
                              <div>{studentInfo.mother_first_name} {studentInfo.mother_last_name}</div>
                            </div>
                          </div>
                          {studentInfo.mother_phone && (
                            <div className="flex items-start gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium">Phone:</span>
                                <div>{studentInfo.mother_phone}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Father Information */}
                    {studentInfo.father_first_name && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm border-b pb-2">Father</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <span className="font-medium">Name:</span>
                              <div>{studentInfo.father_first_name} {studentInfo.father_last_name}</div>
                            </div>
                          </div>
                          {studentInfo.father_phone && (
                            <div className="flex items-start gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium">Phone:</span>
                                <div>{studentInfo.father_phone}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Legacy Parent Information (if new fields not available) */}
                    {!studentInfo.mother_first_name && !studentInfo.father_first_name && studentInfo.parent_name && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm border-b pb-2">Parent / Guardian</h4>
                        <div className="space-y-2">
                          <div className="flex items-start gap-2 text-sm">
                            <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <span className="font-medium">Name:</span>
                              <div>{studentInfo.parent_name}</div>
                            </div>
                          </div>
                          {studentInfo.parent_phone && (
                            <div className="flex items-start gap-2 text-sm">
                              <Phone className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <span className="font-medium">Phone:</span>
                                <div>{studentInfo.parent_phone}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {isLoadingStudent && selectedStudentId && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentInfo;
