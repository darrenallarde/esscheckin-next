/**
 * CheckInForm.tsx - Main check-in interface component
 *
 * This component handles the entire check-in flow for students:
 * 1. Search by phone number (default) or name/email
 * 2. Handle multiple match selection if needed
 * 3. Confirm student identity
 * 4. Process idempotent check-in (one per day per student)
 * 5. Calculate and award gamification rewards
 * 6. Display success screen with PIN
 *
 * Key features:
 * - Flexible search: handles phone formats, fuzzy name matching
 * - State machine pattern using discriminated union ViewState
 * - Integration with Supabase RPC functions for secure check-in
 * - Gamification rewards processed via processCheckinRewards utility
 */

import { useState, useEffect } from "react";
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

// Zod schemas for form validation
const phoneSearchSchema = z.object({
  phoneNumber: z.string().trim().min(2, "Enter at least 2 characters").max(50, "Entry is too long"),
});

const nameEmailSearchSchema = z.object({
  searchTerm: z.string().trim().min(1, "Please enter a name or email"),
});

type PhoneSearchData = z.infer<typeof phoneSearchSchema>;
type NameEmailSearchData = z.infer<typeof nameEmailSearchSchema>;

interface CheckInFormProps {
  onCheckInComplete?: () => void;
}

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

/**
 * ViewState - Discriminated union for managing check-in flow
 * Uses type field to ensure type-safe state transitions
 */
type ViewState =
  | { type: 'phone-search' }           // Initial state: search by phone
  | { type: 'name-search' }            // Alternative: search by name/email
  | { type: 'confirm-student', student: Student }  // Single match found, confirm identity
  | { type: 'select-student', students: Student[] }  // Multiple matches, let user select
  | { type: 'prompt-email', student: Student }  // No email on file, prompt for it
  | { type: 'new-student' }            // No match found, register new student
  | { type: 'success', student: Student, checkInId: string, profilePin?: string };  // Check-in complete

const CheckInForm = ({ onCheckInComplete }: CheckInFormProps = {}) => {
  const [viewState, setViewState] = useState<ViewState>({ type: 'phone-search' });
  const [isSearching, setIsSearching] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  const phoneForm = useForm<PhoneSearchData>({
    resolver: zodResolver(phoneSearchSchema),
    defaultValues: { phoneNumber: "" },
  });

  const nameForm = useForm<NameEmailSearchData>({
    resolver: zodResolver(nameEmailSearchSchema),
    defaultValues: { searchTerm: "" },
  });

  // Reset email input when view state changes
  useEffect(() => {
    if (viewState.type !== 'prompt-email') {
      setEmailInput('');
      setEmailError('');
    }
  }, [viewState.type]);

  const searchByPhone = async (data: PhoneSearchData) => {
    setIsSearching(true);
    try {
      // Clean phone number: remove spaces, dashes, dots, parentheses, and +1 country code
      let cleanedSearch = data.phoneNumber.trim();

      // If it looks like a phone number (contains mostly digits), clean it
      if (/\d/.test(cleanedSearch)) {
        cleanedSearch = cleanedSearch
          .replace(/[\s\-\.\(\)]/g, '') // Remove spaces, dashes, dots, parentheses
          .replace(/^\+?1/, ''); // Remove +1 or 1 country code from start
      }

      const { data: results, error } = await supabase
        .rpc('search_student_for_checkin', { search_term: cleanedSearch });

      if (error) {
        throw error;
      }

      if (results && results.length > 0) {
        // Convert the function results to match our Student interface
        const students = results.map(r => ({
          id: r.student_id,
          first_name: r.first_name,
          last_name: r.last_name,
          user_type: r.user_type,
          grade: r.grade,
          high_school: r.high_school,
          phone_number: null, // Not returned by secure function
          email: null, // Not returned by secure function
          parent_name: null,
          parent_phone: null,
          created_at: '',
        }));

        // If only one result, go straight to confirmation
        if (students.length === 1) {
          setViewState({ type: 'confirm-student', student: students[0] });
        } else {
          // Multiple results, show selection screen
          setViewState({ type: 'select-student', students });
        }
      } else {
        toast({
          title: "Student not found",
          description: "No student found. Please try again or register as a new student.",
        });
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
        // Convert the function results to match our Student interface
        const students = results.map(r => ({
          id: r.student_id,
          first_name: r.first_name,
          last_name: r.last_name,
          user_type: r.user_type,
          grade: r.grade,
          high_school: r.high_school,
          phone_number: null,
          email: null,
          parent_name: null,
          parent_phone: null,
          created_at: '',
        }));

        // If only one result, go straight to confirmation
        if (students.length === 1) {
          setViewState({ type: 'confirm-student', student: students[0] });
        } else {
          // Multiple results, show selection screen
          setViewState({ type: 'select-student', students });
        }
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
      console.log('Confirming check-in for student:', student);
      console.log('Student ID:', student.id);

      // First, check if student has an email using secure function
      console.log('Checking email for student ID:', student.id);
      const { data: studentEmail, error: emailError } = await supabase
        .rpc('get_student_email', { p_student_id: student.id });

      console.log('Email check result:', { studentEmail, emailError });

      if (emailError) {
        console.error('Error checking student email:', emailError);
        // Proceed with check-in even if we can't check email
      }

      // Check if student has an email (but don't block check-in)
      const hasEmail = studentEmail && studentEmail.trim() !== '';
      console.log('Student has email:', hasEmail, 'Email value:', studentEmail);

      // Always proceed with check-in - email prompt will show on success screen if needed
      console.log('Proceeding with check-in, email will be prompted on success screen if missing');

      // Proceed with check-in
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

        const isAlreadyCheckedIn = result[0].message === 'Already checked in today';

        toast({
          title: isAlreadyCheckedIn ? "Already checked in!" : "Check-in successful!",
          description: isAlreadyCheckedIn
            ? `${result[0].first_name}, you already checked in today!`
            : `Welcome back ${result[0].first_name}! Checked in as ${getUserTypeDisplay(result[0].user_type, student.grade)}.`,
        });

        // Get the check-in ID and PIN from the result
        const checkInId = result[0].check_in_id || result[0].id || 'temp-checkin-id';
        const profilePin = result[0].profile_pin;
        console.log('Check-in result:', result[0]);
        console.log('Check-in ID:', checkInId);
        console.log('Profile PIN:', profilePin);

        // If we don't have a proper check-in ID, we need to query for the latest check-in
        let finalCheckInId = checkInId;
        if (checkInId === 'temp-checkin-id') {
          console.warn('No check-in ID returned from checkin_student function. This will cause gamification issues.');
          // For now, pass the temp ID but log the issue
        }

        // Create student object with email for success screen
        const studentWithEmail = { ...student, email: studentEmail };
        setViewState({ type: 'success', student: studentWithEmail, checkInId: finalCheckInId, profilePin });
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

  const handleEmailSubmit = async (student: Student, email: string) => {
    setIsSearching(true);
    try {
      // Update student with email using secure function
      const { data: updateResult, error: updateError } = await supabase
        .rpc('update_student_email', {
          p_student_id: student.id,
          p_email: email.trim()
        });

      if (updateError) {
        throw updateError;
      }

      if (!updateResult) {
        throw new Error('Failed to update email');
      }

      toast({
        title: "Email added!",
        description: "Your email has been saved. Proceeding with check-in...",
      });

      // Now proceed with check-in
      const { data: result, error } = await supabase
        .rpc('checkin_student', { p_student_id: student.id });

      if (error) {
        throw error;
      }

      if (result && result[0]?.success) {
        const checkInId = result[0].check_in_id || result[0].id || 'temp-checkin-id';
        const profilePin = result[0].profile_pin;

        toast({
          title: "Check-in successful!",
          description: `Welcome back ${result[0].first_name}!`,
        });

        setViewState({ type: 'success', student, checkInId, profilePin });
      } else {
        throw new Error(result?.[0]?.message || 'Check-in failed');
      }
    } catch (error) {
      console.error("Error updating email and checking in:", error);
      toast({
        title: "Error",
        description: "Failed to save email or check in. Please try again.",
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
    // Call the callback to change Bible verse
    onCheckInComplete?.();
  };

  // Success view
  if (viewState.type === 'success') {
    return <GameCheckInSuccessDB
      student={viewState.student}
      checkInId={viewState.checkInId}
      profilePin={viewState.profilePin}
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

  // Email prompt view
  if (viewState.type === 'prompt-email') {
    const { student } = viewState;

    const handleEmailValidation = () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailInput.trim()) {
        setEmailError('Email is required');
        return false;
      }
      if (!emailRegex.test(emailInput.trim())) {
        setEmailError('Please enter a valid email address');
        return false;
      }
      setEmailError('');
      return true;
    };

    return (
      <Card className="w-full max-w-lg mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-2xl text-center">One More Thing...</CardTitle>
          <CardDescription className="text-center">
            Hi {student.first_name}! We need your email to send you access to your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email-input" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email-input"
              type="email"
              placeholder="your.email@example.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setEmailError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (handleEmailValidation()) {
                    handleEmailSubmit(student, emailInput);
                  }
                }
              }}
              className={emailError ? 'border-red-500' : ''}
              autoFocus
            />
            {emailError && (
              <p className="text-sm text-red-600">{emailError}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setViewState({ type: 'phone-search' })}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (handleEmailValidation()) {
                  handleEmailSubmit(student, emailInput);
                }
              }}
              disabled={isSearching}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isSearching ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Multiple student selection view
  if (viewState.type === 'select-student') {
    const { students } = viewState;
    return (
      <Card className="w-full max-w-lg mx-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Which one is you?</h3>
            <p className="text-gray-600">We found multiple people with that name</p>
          </div>

          <div className="space-y-3">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => setViewState({ type: 'confirm-student', student })}
                className="w-full p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl hover:from-purple-200 hover:to-pink-200 transition-all text-left"
              >
                <div className="font-bold text-gray-800">
                  {student.first_name} {student.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  {student.user_type === 'student_leader'
                    ? '🌟 Student Leader'
                    : student.grade && student.high_school
                      ? `Grade ${student.grade} at ${student.high_school}`
                      : 'Student'
                  }
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <Button
              variant="outline"
              onClick={() => setViewState({ type: 'name-search' })}
              className="w-full"
            >
              ← Back to Search
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Student confirmation view
  if (viewState.type === 'confirm-student') {
    const { student } = viewState;
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="jrpg-textbox jrpg-corners">
          <div className="text-center mb-6">
            <h3 className="jrpg-font text-sm text-gray-700 mb-4">CONFIRM IDENTITY</h3>
          </div>

          <div className="bg-green-100/50 border-2 border-green-600/50 p-6 mb-6">
            <div className="jrpg-selector">
              <h4 className="jrpg-font text-base text-gray-800 mb-2">
                {student.first_name} {student.last_name}
              </h4>
            </div>
            <p className="jrpg-font text-xs text-gray-700 ml-8">
              {student.user_type === 'student_leader'
                ? '⭐ LEADER'
                : student.grade && student.high_school
                  ? `LV ${student.grade} • ${student.high_school}`
                  : 'ADVENTURER'
              }
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setViewState({ type: 'phone-search' })}
              className="jrpg-button flex-1"
            >
              ✕ CANCEL
            </Button>
            <Button
              onClick={() => confirmCheckIn(student)}
              disabled={isSearching}
              className="jrpg-button flex-1"
            >
              {isSearching ? "LOADING..." : "✓ CONFIRM"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Phone search view
  if (viewState.type === 'phone-search') {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="jrpg-textbox jrpg-corners">
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(searchByPhone)} className="space-y-6">
              <FormField
                control={phoneForm.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="PHONE OR NAME"
                        {...field}
                        autoFocus
                        className="jrpg-input h-20 text-2xl text-center"
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs mt-2 jrpg-font" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="jrpg-button w-full"
                disabled={isSearching}
              >
                {isSearching ? "SEARCHING..." : "▶ SEARCH"}
              </Button>

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setViewState({ type: 'new-student' })}
                  className="jrpg-font text-xs text-green-700 hover:text-green-900 underline"
                >
                  NEW STUDENT?
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    );
  }

  // Name/email search view
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="jrpg-textbox jrpg-corners">
        <div className="text-center mb-6">
          <h3 className="jrpg-font text-sm text-gray-700">SEARCH BY NAME</h3>
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
                      placeholder="ENTER NAME"
                      {...field}
                      autoFocus
                      className="jrpg-input h-20 text-2xl text-center"
                    />
                  </FormControl>
                  <FormMessage className="text-red-400 text-xs mt-2 jrpg-font" />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setViewState({ type: 'phone-search' })}
                className="jrpg-button flex-1"
              >
                ← BACK
              </Button>
              <Button
                type="submit"
                className="jrpg-button flex-1"
                disabled={isSearching}
              >
                {isSearching ? "SEARCHING..." : "▶ SEARCH"}
              </Button>
            </div>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => setViewState({ type: 'new-student' })}
                className="jrpg-font text-xs text-green-700 hover:text-green-900 underline"
              >
                NEW STUDENT?
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default CheckInForm;