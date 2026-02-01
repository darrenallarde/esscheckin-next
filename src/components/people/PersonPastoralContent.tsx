"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  MessageCircle,
  Calendar,
  Check,
  X,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Student } from "@/hooks/queries/use-students";
import {
  useStudentPastoralData,
  useStudentRecommendation,
  useCurrentCurriculum,
  useGenerateRecommendation,
} from "@/hooks/queries/use-student-pastoral";
import RecommendationDisplay from "@/components/pastoral/RecommendationDisplay";
import StudentContextPanel from "@/components/pastoral/workflow/StudentContextPanel";

interface PersonPastoralContentProps {
  student: Student;
  onSendText?: (student: Student) => void;
}

// Color mapping for belonging status badges (matching green gradient theme)
const belongingStatusColors: Record<string, string> = {
  "Ultra-Core": "bg-green-700 text-white",
  Core: "bg-green-500 text-white",
  Connected: "bg-green-400 text-gray-800",
  "On the Fringe": "bg-green-300 text-gray-800",
  Missing: "bg-green-200 text-gray-600",
};

export function PersonPastoralContent({
  student,
  onSendText,
}: PersonPastoralContentProps) {
  const fullName = `${student.first_name} ${student.last_name}`;

  // Fetch pastoral data, existing recommendation, and current curriculum
  const { data: pastoralData, isLoading: pastoralLoading } =
    useStudentPastoralData(student.id);
  const {
    data: existingRecommendation,
    isLoading: recommendationLoading,
  } = useStudentRecommendation(student.id);
  const { data: curriculum, isLoading: curriculumLoading } =
    useCurrentCurriculum();

  const generateMutation = useGenerateRecommendation();

  const { mutate, isPending: isGeneratePending, isError: isGenerateError } = generateMutation;

  // Auto-generate recommendation if we have pastoral data + curriculum but no recommendation
  useEffect(() => {
    if (
      pastoralData &&
      curriculum &&
      !existingRecommendation &&
      !recommendationLoading &&
      !isGeneratePending &&
      !isGenerateError
    ) {
      mutate({
        studentId: student.id,
        pastoralData,
        curriculum,
      });
    }
  }, [
    pastoralData,
    curriculum,
    existingRecommendation,
    recommendationLoading,
    isGeneratePending,
    isGenerateError,
    student.id,
    mutate,
  ]);

  const isLoadingInitial = pastoralLoading || recommendationLoading;
  const isGenerating = isGeneratePending;
  const recommendation = generateMutation.data || existingRecommendation;

  return (
    <div className="space-y-4">
      {/* 1. Attendance Pattern */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Last 8 Weeks</span>
            {pastoralData && (
              <Badge
                className={`ml-auto ${
                  belongingStatusColors[pastoralData.belonging_status] ||
                  "bg-gray-500"
                }`}
              >
                {pastoralData.belonging_status}
              </Badge>
            )}
          </div>

          {pastoralLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : pastoralData?.attendance_pattern ? (
            <div className="space-y-2">
              <div className="flex gap-1">
                {pastoralData.attendance_pattern.map((week, idx) => (
                  <div
                    key={idx}
                    className={`flex-1 h-10 rounded flex items-center justify-center ${
                      week.days_attended > 0
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                    title={`Week of ${new Date(week.week_start).toLocaleDateString()}: ${
                      week.days_attended > 0 ? "Attended" : "Absent"
                    }`}
                  >
                    {week.days_attended > 0 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>8 weeks ago</span>
                <span>This week</span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                <span>{pastoralData.total_checkins_8weeks} total check-ins</span>
                <span>{pastoralData.wednesday_count}W / {pastoralData.sunday_count}S</span>
                {pastoralData.is_declining && (
                  <span className="text-orange-600 font-medium">
                    Trending down
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No attendance data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. AI Recommendation */}
      {isLoadingInitial || curriculumLoading ? (
        <Card>
          <CardContent className="pt-4">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      ) : isGenerating ? (
        <Card className="border-2 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-300">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
              <div>
                <span className="font-medium text-purple-900">
                  Generating AI Insight...
                </span>
                <p className="text-sm text-purple-700">
                  Analyzing {student.first_name}'s attendance patterns and
                  current curriculum
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : isGenerateError ? (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="flex-1">
                <span className="font-medium text-red-900">
                  Could not generate recommendation
                </span>
                <p className="text-sm text-red-700">
                  {generateMutation.error?.message || "Please try again later"}
                </p>
              </div>
              {pastoralData && curriculum && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    mutate({
                      studentId: student.id,
                      pastoralData,
                      curriculum,
                    })
                  }
                >
                  Retry
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : recommendation ? (
        <RecommendationDisplay
          recommendation={recommendation}
          studentName={fullName}
          studentId={student.id}
        />
      ) : !curriculum ? (
        <Card className="border-2 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-yellow-600" />
              <div>
                <span className="font-medium text-yellow-900">
                  No current curriculum set
                </span>
                <p className="text-sm text-yellow-700">
                  Set a current curriculum week to enable AI recommendations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 3. Recent Interactions */}
      <Card>
        <CardContent className="pt-4">
          <StudentContextPanel
            studentId={student.id}
            studentName={fullName}
          />
        </CardContent>
      </Card>

      {/* 4. Contact + Quick Actions */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Quick Actions</span>
          </div>
          <div className="space-y-2">
            {student.phone_number ? (
              <>
                {onSendText && (
                  <Button
                    onClick={() => onSendText(student)}
                    className="w-full"
                    variant="default"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Send Text Message
                  </Button>
                )}
                <Button asChild className="w-full" variant="outline">
                  <a href={`tel:${student.phone_number}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call {student.first_name}
                  </a>
                </Button>
              </>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-2">
                No phone number on file
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
