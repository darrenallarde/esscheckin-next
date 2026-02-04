"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PublicNewStudentForm from "./PublicNewStudentForm";
import GameCheckInSuccessDB from "./GameCheckInSuccessDB";
import {
  validateFormSubmission,
  handleSecurityFailure,
  TIMING_THRESHOLDS,
  honeypotStyles,
} from "@/lib/security";
import * as Sentry from "@sentry/nextjs";
import { useCheckInTracking } from "@/lib/amplitude/hooks";

const searchSchema = z.object({
  searchTerm: z.string().trim().min(2, "Enter at least 2 characters").max(50, "Entry is too long"),
});

type SearchData = z.infer<typeof searchSchema>;

interface PublicCheckInFormProps {
  onCheckInComplete?: () => void;
  orgSlug: string;
  deviceId?: string | null;
  checkinStyle?: string;
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

type ViewState =
  | { type: 'search' }
  | { type: 'confirm-student', student: Student }
  | { type: 'select-student', students: Student[] }
  | { type: 'new-student' }
  | { type: 'success', student: Student, checkInId: string, profilePin?: string };

const PublicCheckInForm = ({ onCheckInComplete, orgSlug, deviceId, checkinStyle = 'gamified' }: PublicCheckInFormProps) => {
  const { toast } = useToast();
  const [viewState, setViewState] = useState<ViewState>({ type: 'search' });
  const [isSearching, setIsSearching] = useState(false);

  // Amplitude tracking
  const tracking = useCheckInTracking();

  // Security: Honeypot and timing
  const [honeypot, setHoneypot] = useState('');
  const formLoadTime = useRef<number>(Date.now());

  const form = useForm<SearchData>({
    resolver: zodResolver(searchSchema),
    defaultValues: { searchTerm: "" },
  });

  const searchStudents = async (data: SearchData) => {
    // Security validation
    const security = validateFormSubmission(
      honeypot,
      formLoadTime.current,
      TIMING_THRESHOLDS.SEARCH_FORM
    );
    if (!security.isValid) {
      setIsSearching(true);
      await handleSecurityFailure(security.failureReason!);
      setIsSearching(false);
      return; // Silent fail
    }

    setIsSearching(true);
    const supabase = createClient();

    try {
      let cleanedSearch = data.searchTerm.trim();

      // Clean phone number if it looks like one
      if (/\d/.test(cleanedSearch)) {
        cleanedSearch = cleanedSearch
          .replace(/[\s\-\.\(\)]/g, '')
          .replace(/^\+?1/, '');
      }

      // Use public RPC function
      const { data: results, error } = await supabase
        .rpc('search_student_for_checkin_public', {
          p_org_slug: orgSlug,
          p_search_term: cleanedSearch
        });

      if (error) {
        Sentry.captureException(error, {
          tags: { action: 'public_search', org_slug: orgSlug },
          extra: { search_term_length: cleanedSearch.length }
        });
        throw error;
      }

      // Track search event
      tracking.trackStudentSearched({
        search_term_length: cleanedSearch.length,
        result_count: results?.length || 0,
      });

      if (results && results.length > 0) {
        const students: Student[] = results.map((r: { student_id: string; first_name: string; last_name: string; user_type: string; grade: string | null; high_school: string | null }) => ({
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

        if (students.length === 1) {
          // Track student selected (single result auto-select)
          tracking.trackStudentSelected({
            student_id: students[0].id,
            selection_method: 'single',
          });
          setViewState({ type: 'confirm-student', student: students[0] });
        } else {
          setViewState({ type: 'select-student', students });
        }
      } else {
        toast({
          title: "Student not found",
          description: "No student found. Please try again or register as a new student.",
        });
      }
    } catch (error) {
      console.error("Error searching:", error);
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
    const supabase = createClient();

    // Track confirmation
    tracking.trackCheckInConfirmed({ student_id: student.id });

    try {
      // Use public RPC function with optional device tracking
      const { data: result, error } = await supabase
        .rpc('checkin_student_public', {
          p_org_slug: orgSlug,
          p_student_id: student.id,
          p_device_id: deviceId || null
        });

      if (error) {
        Sentry.captureException(error, {
          tags: { action: 'public_checkin', org_slug: orgSlug },
        });
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

        const checkInId = result[0].check_in_id || 'temp-checkin-id';
        const profilePin = result[0].profile_pin;

        // Track check-in completed
        tracking.trackCheckInCompleted({
          student_id: student.id,
          is_duplicate: isAlreadyCheckedIn,
          points_earned: result[0].points_earned || 0,
          student_grade: student.grade || undefined,
        });

        setViewState({ type: 'success', student, checkInId, profilePin });
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
    setViewState({ type: 'search' });
    form.reset();
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
      <PublicNewStudentForm
        orgSlug={orgSlug}
        deviceId={deviceId}
        checkinStyle={checkinStyle}
        onSuccess={(result) => {
          setViewState({
            type: 'success',
            student: {
              id: result.student.id,
              first_name: result.student.first_name,
              last_name: result.student.last_name,
              email: result.student.email,
              phone_number: null,
              grade: result.student.grade,
              high_school: result.student.high_school,
              parent_name: null,
              parent_phone: null,
              user_type: result.student.user_type,
              created_at: new Date().toISOString(),
            },
            checkInId: result.checkInId,
            profilePin: result.profilePin,
          });
        }}
        onBack={() => setViewState({ type: 'search' })}
      />
    );
  }

  // Multiple student selection view
  if (viewState.type === 'select-student') {
    const { students } = viewState;
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="jrpg-textbox jrpg-corners">
          <div className="text-center mb-6">
            <h3 className="jrpg-font text-sm text-gray-700 mb-4">WHICH ONE IS YOU?</h3>
            <p className="text-xs text-gray-600">We found multiple people with that name</p>
          </div>

          <div className="space-y-3">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  // Track student selection from list
                  tracking.trackStudentSelected({
                    student_id: student.id,
                    selection_method: 'from_list',
                  });
                  setViewState({ type: 'confirm-student', student });
                }}
                className="w-full p-4 bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl hover:from-green-200 hover:to-emerald-200 transition-all text-left border-2 border-green-600/30"
              >
                <div className="font-bold text-gray-800">
                  {student.first_name} {student.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  {student.user_type === 'student_leader'
                    ? 'Student Leader'
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
              onClick={() => setViewState({ type: 'search' })}
              className="jrpg-button w-full"
            >
              BACK TO SEARCH
            </Button>
          </div>
        </div>
      </div>
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
                ? 'LEADER'
                : student.grade && student.high_school
                  ? `LV ${student.grade} - ${student.high_school}`
                  : 'ADVENTURER'
              }
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setViewState({ type: 'search' })}
              className="jrpg-button flex-1"
            >
              CANCEL
            </Button>
            <Button
              onClick={() => confirmCheckIn(student)}
              disabled={isSearching}
              className="jrpg-button flex-1"
            >
              {isSearching ? "LOADING..." : "CONFIRM"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Search view (default)
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="jrpg-textbox jrpg-corners">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(searchStudents)} className="space-y-6">
            {/* Honeypot field - invisible to humans, bots will fill it */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              style={honeypotStyles}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <FormField
              control={form.control}
              name="searchTerm"
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
              {isSearching ? "SEARCHING..." : "SEARCH"}
            </Button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  // Track registration started
                  tracking.trackRegistrationStarted();
                  setViewState({ type: 'new-student' });
                }}
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

export default PublicCheckInForm;
