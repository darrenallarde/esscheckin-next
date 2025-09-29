import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import NewStudentForm from "./NewStudentForm";
import GameCheckInSuccessDB from "./GameCheckInSuccessDB";
import { processCheckinRewards } from "@/utils/gamificationDB";

// Schema for phone search
const phoneSearchSchema = z.object({
  phoneNumber: z.string().trim().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must be less than 15 digits"),
});

// Schema for name/email search
const nameEmailSearchSchema = z.object({
  searchTerm: z.string().trim().min(1, "Please enter a name or email"),
});

type PhoneSearchData = z.infer<typeof phoneSearchSchema>;
type NameEmailSearchData = z.infer<typeof nameEmailSearchSchema>;

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  high_school: string | null;
  parent_name: string | null;
  parent_phone: string | null;
  user_type: string;
  created_at: string;
}

type ViewState =
  | { type: 'phone-search' }
  | { type: 'name-search' }
  | { type: 'confirm-student', student: Student }
  | { type: 'new-student' }
  | { type: 'success', student: Student, checkInId: string };

const CheckInForm = () => {
  const [viewState, setViewState] = useState<ViewState>({ type: 'phone-search' });
  const [isSearching, setIsSearching] = useState(false);

  const phoneForm = useForm<PhoneSearchData>({
    resolver: zodResolver(phoneSearchSchema),
    defaultValues: { phoneNumber: "" },
  });

  const nameForm = useForm<NameEmailSearchData>({
    resolver: zodResolver(nameEmailSearchSchema),
    defaultValues: { searchTerm: "" },
  });

  const searchByPhone = async (data: PhoneSearchData) => {
    setIsSearching(true);
    try {
      const { data: results, error } = await supabase
        .rpc('search_student_for_checkin', { search_term: data.phoneNumber });

      if (error) {
        throw error;
      }

      if (results && results.length > 0) {
        // Convert the function result to match our Student interface
        const student = {
          id: results[0].student_id,
          first_name: results[0].first_name,
          last_name: results[0].last_name,
          user_type: results[0].user_type,
          grade: results[0].grade,
          high_school: results[0].high_school,
          phone_number: null, // Not returned by secure function
          email: null, // Not returned by secure function
          parent_name: null,
          parent_phone: null,
          created_at: '',
        };
        setViewState({ type: 'confirm-student', student });
      } else {
        toast({
          title: "Student not found",
          description: "No student found with that phone number. Try searching by name or register as a new student.",
        });
        setViewState({ type: 'name-search' });
      }
    } catch (error) {
      console.error("Error searching by phone:", error);
      toast({
        title: "Search Error",
        description: "Failed to search for student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const searchByNameOrEmail = async (data: NameEmailSearchData) => {
    setIsSearching(true);
    try {
      const { data: results, error } = await supabase
        .rpc('search_student_for_checkin', { search_term: data.searchTerm });

      if (error) {
        throw error;
      }

      if (results && results.length > 0) {
        // Convert the function result to match our Student interface
        const student = {
          id: results[0].student_id,
          first_name: results[0].first_name,
          last_name: results[0].last_name,
          user_type: results[0].user_type,
          grade: results[0].grade,
          high_school: results[0].high_school,
          phone_number: null, // Not returned by secure function
          email: null, // Not returned by secure function
          parent_name: null,
          parent_phone: null,
          created_at: '',
        };
        setViewState({ type: 'confirm-student', student });
      } else {
        toast({
          title: "Student not found",
          description: "No student found with that name or email. Let's register you as a new student!",
        });
        setViewState({ type: 'new-student' });
      }
    } catch (error) {
      console.error("Error searching by name/email:", error);
      toast({
        title: "Search Error", 
        description: "Failed to search for student. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const confirmCheckIn = async (student: Student) => {
    setIsSearching(true);
    try {
      const { data: result, error } = await supabase
        .rpc('checkin_student', { p_student_id: student.id });

      if (error) {
        throw error;
      }

      if (result && result[0]?.success) {
        const getUserTypeDisplay = (userType: string, grade?: string | null) => {
          if (userType === 'student_leader') return 'Student Leader';
          if (grade) {
            const gradeNum = parseInt(grade);
            if (gradeNum >= 6 && gradeNum <= 8) return 'Middle School Student';
            if (gradeNum >= 9 && gradeNum <= 12) return 'High School Student';
          }
          return 'Student';
        };

        toast({
          title: "Check-in successful!",
          description: `Welcome back ${result[0].first_name}! Checked in as ${getUserTypeDisplay(result[0].user_type, student.grade)}.`,
        });

        // Get the check-in ID from the result
        const checkInId = result[0].check_in_id;

        setViewState({ type: 'success', student, checkInId });
      } else {
        throw new Error(result?.[0]?.message || 'Check-in failed');
      }
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: "Check-in Error",
        description: "Failed to check in. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const resetToSearch = () => {
    setViewState({ type: 'phone-search' });
    phoneForm.reset();
    nameForm.reset();
  };

  // Success view
  if (viewState.type === 'success') {
    return <GameCheckInSuccessDB
      student={viewState.student}
      checkInId={viewState.checkInId}
      onNewCheckIn={resetToSearch}
    />;
  }

  // New student form
  if (viewState.type === 'new-student') {
    return (
      <NewStudentForm 
        onSuccess={() => setViewState({ type: 'phone-search' })}
        onBack={() => setViewState({ type: 'name-search' })}
      />
    );
  }

  // Student confirmation view
  if (viewState.type === 'confirm-student') {
    const { student } = viewState;
    return (
      <Card className="w-full max-w-lg mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Is this you?</h3>
          </div>
          
          <div className="p-6 bg-gradient-to-r from-purple-100 to-pink-100 rounded-2xl mb-6 text-center">
            <h4 className="text-xl font-bold text-gray-800 mb-1">
              {student.first_name} {student.last_name}
            </h4>
            <p className="text-gray-600">
              {student.user_type === 'student_leader' 
                ? '🌟 Student Leader' 
                : student.grade && student.high_school 
                  ? `${student.grade} at ${student.high_school}`
                  : 'Student'
              }
            </p>
            {student.phone_number && (
              <p className="text-sm text-gray-500 mt-1">📱 {student.phone_number}</p>
            )}
            {student.email && (
              <p className="text-sm text-gray-500">📧 {student.email}</p>
            )}
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setViewState({ type: 'phone-search' })}
              className="flex-1 h-12 border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl"
            >
              ❌ Not me
            </Button>
            <Button
              onClick={() => confirmCheckIn(student)}
              disabled={isSearching}
              className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-xl transform hover:scale-105 transition-all duration-200"
            >
              {isSearching ? "✨ Checking in..." : "✅ That's me!"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Phone search view
  if (viewState.type === 'phone-search') {
    return (
      <Card className="w-full max-w-lg mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-8">
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(searchByPhone)} className="space-y-6">
              <FormField
                control={phoneForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="📱 Enter your phone number"
                        {...field}
                        autoFocus
                        style={{ fontSize: '2rem', fontWeight: 'bold' }}
                        className="h-20 text-3xl font-black text-center border-4 border-purple-300 focus:border-purple-500 rounded-2xl bg-white/80 placeholder:text-gray-400 placeholder:font-semibold shadow-lg"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-2xl shadow-lg transform hover:scale-105 transition-all duration-200"
                disabled={isSearching}
              >
                {isSearching ? "✨ Finding you..." : "🚀 Find Me"}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setViewState({ type: 'name-search' })}
                  className="text-purple-600 hover:text-purple-800 font-medium"
                >
                  Search by name or email instead
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    );
  }

  // Name/email search view
  return (
    <Card className="w-full max-w-lg mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
      <CardContent className="p-8">
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800">Search by name or email</h3>
        </div>
        <Form {...nameForm}>
          <form onSubmit={nameForm.handleSubmit(searchByNameOrEmail)} className="space-y-6">
            <FormField
              control={nameForm.control}
              name="searchTerm"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="👤 Enter your name or email"
                      {...field}
                      autoFocus
                      style={{ fontSize: '2rem', fontWeight: 'bold' }}
                      className="h-20 text-3xl font-black text-center border-4 border-purple-300 focus:border-purple-500 rounded-2xl bg-white/80 placeholder:text-gray-400 placeholder:font-semibold shadow-lg"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setViewState({ type: 'phone-search' })}
                className="flex-1 h-12 border-2 border-purple-200 text-purple-600 hover:bg-purple-50 rounded-xl"
              >
                ← Back
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl transform hover:scale-105 transition-all duration-200"
                disabled={isSearching}
              >
                {isSearching ? "✨ Searching..." : "🚀 Find Me"}
              </Button>
            </div>

            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setViewState({ type: 'new-student' })}
                className="text-purple-600 hover:text-purple-800 font-medium"
              >
                I'm new here!
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default CheckInForm;