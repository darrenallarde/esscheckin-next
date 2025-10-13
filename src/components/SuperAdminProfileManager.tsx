import * as React from "react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Save, X, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const profileEditSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phoneNumber: z.string().optional().or(z.literal("")),
  grade: z.string().optional().or(z.literal("")),
  highSchool: z.string().optional().or(z.literal("")),
  instagramHandle: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
});

type ProfileEditData = z.infer<typeof profileEditSchema>;

interface SuperAdminProfileManagerProps {
  isSuperAdmin: boolean;
}

const SuperAdminProfileManager: React.FC<SuperAdminProfileManagerProps> = ({ isSuperAdmin }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch all students for super admin
  const { data: allStudents, isLoading: isLoadingStudents } = useQuery({
    queryKey: ['all-students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name, email, user_type, grade, high_school')
        .order('last_name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin
  });

  // Fetch selected student details
  const { data: selectedStudent, refetch: refetchStudent } = useQuery({
    queryKey: ['selected-student', selectedStudentId],
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

  const form = useForm<ProfileEditData>({
    resolver: zodResolver(profileEditSchema),
  });

  // Update form when student is selected
  React.useEffect(() => {
    if (selectedStudent) {
      form.reset({
        firstName: selectedStudent.first_name || "",
        lastName: selectedStudent.last_name || "",
        email: selectedStudent.email || "",
        phoneNumber: selectedStudent.phone_number || "",
        grade: selectedStudent.grade || "",
        highSchool: selectedStudent.high_school || "",
        instagramHandle: selectedStudent.instagram_handle || "",
        dateOfBirth: selectedStudent.date_of_birth || "",
      });
    }
  }, [selectedStudent, form]);

  const handleSave = async (data: ProfileEditData) => {
    if (!selectedStudentId) return;

    try {
      const { error } = await supabase
        .from('students')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email || null,
          phone_number: data.phoneNumber || null,
          grade: data.grade || null,
          high_school: data.highSchool || null,
          instagram_handle: data.instagramHandle || null,
          date_of_birth: data.dateOfBirth || null,
        })
        .eq('id', selectedStudentId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Student profile updated successfully.",
      });

      setIsEditing(false);
      refetchStudent();
    } catch (error) {
      console.error("Error updating student:", error);
      toast({
        title: "Error",
        description: "Failed to update student profile.",
        variant: "destructive",
      });
    }
  };

  const filteredStudents = React.useMemo(() => {
    if (!allStudents) return [];
    if (!searchTerm) return allStudents;

    const search = searchTerm.toLowerCase();
    return allStudents.filter(
      (s) =>
        s.first_name?.toLowerCase().includes(search) ||
        s.last_name?.toLowerCase().includes(search) ||
        s.email?.toLowerCase().includes(search)
    );
  }, [allStudents, searchTerm]);

  if (!isSuperAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Student Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Super Admin: Select Student
          </CardTitle>
          <CardDescription>
            Search and select a student to view and edit their profile
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Student List */}
          {isLoadingStudents ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  onClick={() => {
                    setSelectedStudentId(student.id);
                    setIsEditing(false);
                  }}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedStudentId === student.id
                      ? 'bg-purple-50 border-purple-300'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">
                        {student.first_name} {student.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {student.email || 'No email'}
                      </div>
                    </div>
                    {student.user_type === 'student_leader' && (
                      <Badge variant="secondary">Leader</Badge>
                    )}
                  </div>
                </button>
              ))}
              {filteredStudents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No students found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Student Profile Editor */}
      {selectedStudent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {selectedStudent.first_name} {selectedStudent.last_name}
                </CardTitle>
                <CardDescription>
                  {selectedStudent.user_type === 'student_leader' ? 'Student Leader' : 'Student'}
                </CardDescription>
              </div>
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <Button onClick={() => setIsEditing(false)} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSave)} className="space-y-4">
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

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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

                    <FormField
                      control={form.control}
                      name="instagramHandle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Instagram</FormLabel>
                          <FormControl>
                            <Input {...field} />
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

                  <Button type="submit" className="w-full">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Email</div>
                  <div>{selectedStudent.email || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Phone</div>
                  <div>{selectedStudent.phone_number || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Grade</div>
                  <div>{selectedStudent.grade || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">High School</div>
                  <div>{selectedStudent.high_school || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Instagram</div>
                  <div>{selectedStudent.instagram_handle || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Date of Birth</div>
                  <div>
                    {selectedStudent.date_of_birth
                      ? new Date(selectedStudent.date_of_birth).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SuperAdminProfileManager;
