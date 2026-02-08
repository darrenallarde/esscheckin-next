"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
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
  searchTerm: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters")
    .max(50, "Entry is too long"),
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
  | { type: "search" }
  | { type: "confirm-student"; student: Student }
  | { type: "select-student"; students: Student[] }
  | { type: "new-student" }
  | {
      type: "success";
      student: Student;
      checkInId: string;
      profilePin?: string;
    };

const PublicCheckInForm = ({
  onCheckInComplete,
  orgSlug,
  deviceId,
  checkinStyle = "gamified",
}: PublicCheckInFormProps) => {
  const { toast } = useToast();
  const [viewState, setViewState] = useState<ViewState>({ type: "search" });
  const [isSearching, setIsSearching] = useState(false);

  // Amplitude tracking
  const tracking = useCheckInTracking();

  // Security: Honeypot and timing
  const [honeypot, setHoneypot] = useState("");
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
      TIMING_THRESHOLDS.SEARCH_FORM,
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
          .replace(/[\s\-\.\(\)]/g, "")
          .replace(/^\+?1/, "");
      }

      // Use public RPC function
      const { data: results, error } = await supabase.rpc(
        "search_student_for_checkin_public",
        {
          p_org_slug: orgSlug,
          p_search_term: cleanedSearch,
        },
      );

      if (error) {
        Sentry.captureException(error, {
          tags: { action: "public_search", org_slug: orgSlug },
          extra: { search_term_length: cleanedSearch.length },
        });
        throw error;
      }

      // Track search event
      tracking.trackStudentSearched({
        search_term_length: cleanedSearch.length,
        result_count: results?.length || 0,
      });

      if (results && results.length > 0) {
        const students: Student[] = results.map(
          (r: {
            student_id: string;
            first_name: string;
            last_name: string;
            user_type: string;
            grade: string | null;
            high_school: string | null;
          }) => ({
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
            created_at: "",
          }),
        );

        if (students.length === 1) {
          // Track student selected (single result auto-select)
          tracking.trackStudentSelected({
            student_id: students[0].id,
            selection_method: "single",
          });
          setViewState({ type: "confirm-student", student: students[0] });
        } else {
          setViewState({ type: "select-student", students });
        }
      } else {
        toast({
          title: "Student not found",
          description:
            "No student found. Please try again or register as a new student.",
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
      const { data: result, error } = await supabase.rpc(
        "checkin_student_public",
        {
          p_org_slug: orgSlug,
          p_student_id: student.id,
          p_device_id: deviceId || null,
        },
      );

      if (error) {
        Sentry.captureException(error, {
          tags: { action: "public_checkin", org_slug: orgSlug },
        });
        throw error;
      }

      if (result && result[0]?.success) {
        const getUserTypeDisplay = (
          userType: string,
          grade?: string | null,
        ) => {
          if (userType === "student_leader") return "Student Leader";
          if (grade) {
            const gradeNum = parseInt(grade);
            if (gradeNum >= 6 && gradeNum <= 8) return "Middle School Student";
            if (gradeNum >= 9 && gradeNum <= 12) return "High School Student";
          }
          return "Student";
        };

        const isAlreadyCheckedIn =
          result[0].message === "Already checked in today";

        toast({
          title: isAlreadyCheckedIn
            ? "Already checked in!"
            : "Check-in successful!",
          description: isAlreadyCheckedIn
            ? `${result[0].first_name}, you already checked in today!`
            : `Welcome back ${result[0].first_name}! Checked in as ${getUserTypeDisplay(result[0].user_type, student.grade)}.`,
        });

        const checkInId = result[0].check_in_id || "temp-checkin-id";
        const profilePin = result[0].profile_pin;

        // Track check-in completed
        tracking.trackCheckInCompleted({
          student_id: student.id,
          is_duplicate: isAlreadyCheckedIn,
          points_earned: result[0].points_earned || 0,
          student_grade: student.grade || undefined,
        });

        setViewState({ type: "success", student, checkInId, profilePin });
      } else {
        throw new Error(result?.[0]?.message || "Check-in failed");
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
    setViewState({ type: "search" });
    form.reset();
    onCheckInComplete?.();
  };

  // Style helpers
  const isGamified = checkinStyle === "gamified";
  const isMinimal = checkinStyle === "minimal";

  const containerClass = isGamified
    ? "jrpg-textbox jrpg-corners"
    : isMinimal
      ? "rounded-lg border bg-card p-6"
      : "bg-card rounded-2xl shadow-sm border border-border p-8";

  // Success view
  if (viewState.type === "success") {
    return (
      <GameCheckInSuccessDB
        student={viewState.student}
        checkInId={viewState.checkInId}
        profilePin={viewState.profilePin}
        onNewCheckIn={resetToSearch}
        checkinStyle={checkinStyle}
      />
    );
  }

  // New student form
  if (viewState.type === "new-student") {
    return (
      <PublicNewStudentForm
        orgSlug={orgSlug}
        deviceId={deviceId}
        checkinStyle={checkinStyle}
        onSuccess={(result) => {
          setViewState({
            type: "success",
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
        onBack={() => setViewState({ type: "search" })}
      />
    );
  }

  // Multiple student selection view
  if (viewState.type === "select-student") {
    const { students } = viewState;
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className={containerClass}>
          <div className="text-center mb-6">
            <h3
              className={
                isGamified
                  ? "jrpg-font text-sm text-gray-700 mb-4"
                  : "text-lg font-semibold text-foreground mb-3"
              }
            >
              {isGamified ? "WHICH ONE IS YOU?" : "Select Your Name"}
            </h3>
            <p
              className={
                isGamified
                  ? "text-xs text-gray-600"
                  : "text-sm text-muted-foreground"
              }
            >
              We found multiple people with that name
            </p>
          </div>

          <div className="space-y-3">
            {students.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  tracking.trackStudentSelected({
                    student_id: student.id,
                    selection_method: "from_list",
                  });
                  setViewState({ type: "confirm-student", student });
                }}
                className={
                  isGamified
                    ? "w-full p-4 bg-white/40 hover:bg-white/60 transition-all text-left border-2"
                    : "w-full p-4 bg-primary/5 hover:bg-primary/10 rounded-xl transition-all text-left border border-border"
                }
                style={
                  isGamified
                    ? { borderColor: "var(--jrpg-textbox-border)" }
                    : undefined
                }
              >
                <div
                  className={
                    isGamified
                      ? "font-bold text-gray-800"
                      : "font-medium text-foreground"
                  }
                >
                  {student.first_name} {student.last_name}
                </div>
                <div
                  className={
                    isGamified
                      ? "text-sm text-gray-600"
                      : "text-sm text-muted-foreground"
                  }
                >
                  {student.user_type === "student_leader"
                    ? "Student Leader"
                    : student.grade && student.high_school
                      ? `Grade ${student.grade} at ${student.high_school}`
                      : "Student"}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6">
            <Button
              onClick={() => setViewState({ type: "search" })}
              className={
                isGamified ? "jrpg-button w-full" : "w-full h-12 rounded-xl"
              }
              variant={isGamified ? "default" : "outline"}
            >
              {isGamified ? "BACK TO SEARCH" : "Back to Search"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Student confirmation view
  if (viewState.type === "confirm-student") {
    const { student } = viewState;
    const studentDesc = isGamified
      ? student.user_type === "student_leader"
        ? "LEADER"
        : student.grade && student.high_school
          ? `LV ${student.grade} - ${student.high_school}`
          : "ADVENTURER"
      : student.user_type === "student_leader"
        ? "Student Leader"
        : student.grade && student.high_school
          ? `Grade ${student.grade} at ${student.high_school}`
          : "Student";

    return (
      <div className="w-full max-w-lg mx-auto">
        <div className={containerClass}>
          <div className="text-center mb-6">
            <h3
              className={
                isGamified
                  ? "jrpg-font text-sm text-gray-700 mb-4"
                  : "text-lg font-semibold text-foreground mb-3"
              }
            >
              {isGamified ? "CONFIRM IDENTITY" : "Confirm Check-In"}
            </h3>
          </div>

          <div
            className={
              isGamified
                ? "bg-white/30 border-2 p-6 mb-6"
                : "bg-primary/5 border border-border rounded-xl p-6 mb-6"
            }
            style={
              isGamified
                ? { borderColor: "var(--jrpg-textbox-border)" }
                : undefined
            }
          >
            {isGamified ? (
              <div className="jrpg-selector">
                <h4 className="jrpg-font text-base text-gray-800 mb-2">
                  {student.first_name} {student.last_name}
                </h4>
              </div>
            ) : (
              <h4 className="text-xl font-semibold text-foreground mb-1">
                {student.first_name} {student.last_name}
              </h4>
            )}
            <p
              className={
                isGamified
                  ? "jrpg-font text-xs text-gray-700 ml-8"
                  : "text-sm text-muted-foreground"
              }
            >
              {studentDesc}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => setViewState({ type: "search" })}
              className={
                isGamified ? "jrpg-button flex-1" : "flex-1 h-12 rounded-xl"
              }
              variant={isGamified ? "default" : "outline"}
            >
              {isGamified ? "CANCEL" : "Cancel"}
            </Button>
            <Button
              onClick={() => confirmCheckIn(student)}
              disabled={isSearching}
              className={
                isGamified ? "jrpg-button flex-1" : "flex-1 h-12 rounded-xl"
              }
            >
              {isSearching
                ? isGamified
                  ? "LOADING..."
                  : "Checking in..."
                : isGamified
                  ? "CONFIRM"
                  : "Check In"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Search view (default)
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className={containerClass}>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(searchStudents)}
            className="space-y-6"
          >
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
                      placeholder={
                        isGamified
                          ? "PHONE OR NAME"
                          : "Enter your name or phone number"
                      }
                      {...field}
                      autoFocus
                      className={
                        isGamified
                          ? "jrpg-input h-20 text-2xl text-center"
                          : isMinimal
                            ? "h-14 text-lg text-center"
                            : "h-16 text-xl text-center rounded-xl"
                      }
                    />
                  </FormControl>
                  <FormMessage
                    className={
                      isGamified
                        ? "text-red-400 text-xs mt-2 jrpg-font"
                        : "mt-2"
                    }
                  />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className={
                isGamified
                  ? "jrpg-button w-full"
                  : "w-full h-12 rounded-xl text-base font-medium"
              }
              disabled={isSearching}
            >
              {isSearching
                ? isGamified
                  ? "SEARCHING..."
                  : "Searching..."
                : isGamified
                  ? "SEARCH"
                  : "Search"}
            </Button>

            <div className="text-center pt-4">
              <button
                type="button"
                onClick={() => {
                  tracking.trackRegistrationStarted();
                  setViewState({ type: "new-student" });
                }}
                className={
                  isGamified
                    ? "jrpg-font text-xs underline"
                    : "text-sm text-primary hover:text-primary/80 underline"
                }
                style={
                  isGamified ? { color: "var(--jrpg-heading)" } : undefined
                }
              >
                {isGamified ? "NEW STUDENT?" : "New here? Register"}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default PublicCheckInForm;
