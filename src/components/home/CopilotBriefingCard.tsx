"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Eye,
  MoreHorizontal,
  Phone,
  CheckCircle,
  XCircle,
  Dog,
  Heart,
  HandHeart,
  Users,
  PartyPopper,
} from "lucide-react";
import {
  CopilotStudent,
  ActionType,
  UrgencyLevel,
} from "@/hooks/queries/use-copilot-briefing";

// Belonging status badge styles
const BELONGING_STYLES: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  "Ultra-Core": {
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  Core: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
  Connected: {
    bg: "bg-teal-50",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  "On the Fringe": {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  Missing: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

// Urgency badge styles
const URGENCY_STYLES: Record<
  UrgencyLevel,
  { bg: string; text: string; border: string; pulse?: boolean }
> = {
  critical: {
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
    pulse: true,
  },
  high: {
    bg: "bg-orange-100",
    text: "text-orange-800",
    border: "border-orange-300",
  },
  medium: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    border: "border-yellow-300",
  },
  low: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    border: "border-blue-300",
  },
  celebrate: {
    bg: "bg-green-100",
    text: "text-green-800",
    border: "border-green-300",
  },
};

function formatDaysSeen(days: number): string {
  if (days > 99999) return "never seen";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function getActionButton(
  actionType: ActionType,
  student: CopilotStudent,
  handlers: {
    onSendText: (student: CopilotStudent) => void;
    onCallStudent: (student: CopilotStudent) => void;
    onCallParent: (student: CopilotStudent) => void;
  },
): React.ReactNode | null {
  switch (actionType) {
    case "send_text":
      return (
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs"
          onClick={() => handlers.onSendText(student)}
          disabled={!student.phone_number}
        >
          <MessageSquare className="h-3 w-3 mr-1" />
          Send Text
        </Button>
      );
    case "call_student":
      return (
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs"
          onClick={() => handlers.onCallStudent(student)}
          disabled={!student.phone_number}
        >
          <Phone className="h-3 w-3 mr-1" />
          Call {student.first_name}
        </Button>
      );
    case "call_parent":
      return (
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs"
          onClick={() => handlers.onCallParent(student)}
          disabled={!student.primary_parent_phone}
        >
          <Phone className="h-3 w-3 mr-1" />
          Call Parent
        </Button>
      );
    case "in_person":
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200"
        >
          <Users className="h-3 w-3 mr-1" />
          Plan Visit
        </Badge>
      );
    case "celebrate":
      return (
        <Button
          size="sm"
          variant="default"
          className="h-7 text-xs bg-green-600 hover:bg-green-700"
          onClick={() => handlers.onSendText(student)}
          disabled={!student.phone_number}
        >
          <PartyPopper className="h-3 w-3 mr-1" />
          Celebrate!
        </Button>
      );
    case "give_space":
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-600 border-slate-200"
        >
          <HandHeart className="h-3 w-3 mr-1" />
          Give Space
        </Badge>
      );
    case "pray_only":
      return (
        <Badge
          variant="outline"
          className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border-purple-200"
        >
          <Heart className="h-3 w-3 mr-1" />
          Pray
        </Badge>
      );
    default:
      return null;
  }
}

interface CopilotStudentCardProps {
  student: CopilotStudent;
  onSendText: (student: CopilotStudent) => void;
  onView: (student: CopilotStudent) => void;
  onDismiss: (student: CopilotStudent) => void;
  onAlreadyContacted: (student: CopilotStudent) => void;
  onCallParent: (student: CopilotStudent) => void;
  onCallStudent: (student: CopilotStudent) => void;
}

function CopilotStudentCard({
  student,
  onSendText,
  onView,
  onDismiss,
  onAlreadyContacted,
  onCallParent,
  onCallStudent,
}: CopilotStudentCardProps) {
  const belongingStyles =
    BELONGING_STYLES[student.belonging_status] || BELONGING_STYLES["Missing"];
  const urgencyStyles =
    URGENCY_STYLES[student.urgency] || URGENCY_STYLES.medium;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      {/* Header row: Name + Urgency + Belonging + Days */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="font-medium text-sm">
          {student.first_name} {student.last_name?.charAt(0)}.
        </span>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${urgencyStyles.bg} ${urgencyStyles.text} ${urgencyStyles.border} ${urgencyStyles.pulse ? "animate-pulse" : ""}`}
        >
          {student.urgency}
        </Badge>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0 ${belongingStyles.bg} ${belongingStyles.text} ${belongingStyles.border}`}
        >
          {student.belonging_status}
        </Badge>
        <span className="text-xs text-muted-foreground ml-auto">
          {formatDaysSeen(student.days_since_last_seen)}
        </span>
      </div>

      {/* AI Insight */}
      <p className="text-sm text-muted-foreground mb-1.5 leading-snug">
        {student.why_insight}
      </p>

      {/* Recommended action instruction */}
      <p className="text-xs font-medium text-foreground/80 mb-2">
        {student.recommended_action}
      </p>

      {/* Draft message preview (only when available) */}
      {student.draft_message && (
        <div className="flex items-start gap-2 mb-3 bg-purple-50 dark:bg-purple-950/30 rounded-md p-2">
          <MessageSquare className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
          <p className="text-xs text-purple-700 dark:text-purple-300 leading-snug line-clamp-2">
            {student.draft_message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {getActionButton(student.action_type, student, {
          onSendText,
          onCallStudent,
          onCallParent,
        })}

        {/* Secondary: show Call Parent for non-call_parent action types when parent exists */}
        {student.action_type !== "call_parent" &&
          student.primary_parent_phone &&
          (student.belonging_status === "Missing" ||
            student.belonging_status === "On the Fringe") && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onCallParent(student)}
            >
              <Phone className="h-3 w-3 mr-1" />
              Call Parent
            </Button>
          )}

        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => onView(student)}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAlreadyContacted(student)}>
              <CheckCircle className="h-3.5 w-3.5 mr-2" />
              Already contacted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDismiss(student)}>
              <XCircle className="h-3.5 w-3.5 mr-2" />
              Dismiss
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

interface CopilotBriefingCardProps {
  briefingSummary: string;
  students: CopilotStudent[];
  isLoading: boolean;
  onSendText: (student: CopilotStudent) => void;
  onView: (student: CopilotStudent) => void;
  onDismiss: (student: CopilotStudent) => void;
  onAlreadyContacted: (student: CopilotStudent) => void;
  onCallParent: (student: CopilotStudent) => void;
  onCallStudent: (student: CopilotStudent) => void;
}

export function CopilotBriefingCard({
  briefingSummary,
  students,
  isLoading,
  onSendText,
  onView,
  onDismiss,
  onAlreadyContacted,
  onCallParent,
  onCallStudent,
}: CopilotBriefingCardProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visibleStudents = students.filter((s) => !dismissed.has(s.profile_id));

  const handleDismiss = (student: CopilotStudent) => {
    setDismissed((prev) => new Set(prev).add(student.profile_id));
    onDismiss(student);
  };

  const handleAlreadyContacted = (student: CopilotStudent) => {
    setDismissed((prev) => new Set(prev).add(student.profile_id));
    onAlreadyContacted(student);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Dog className="h-5 w-5 text-purple-600" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-7 w-28" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (visibleStudents.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/30">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-green-700 dark:text-green-300">
            All caught up! Your flock is doing well today.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Dog className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">
            {visibleStudents.length} student
            {visibleStudents.length !== 1 ? "s" : ""} need
            {visibleStudents.length === 1 ? "s" : ""} you today
          </CardTitle>
        </div>
        {briefingSummary ? (
          <CardDescription className="leading-snug">
            {briefingSummary}
          </CardDescription>
        ) : (
          <CardDescription>
            Take a moment to pray for them first.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {visibleStudents.map((student) => (
            <CopilotStudentCard
              key={student.profile_id}
              student={student}
              onSendText={onSendText}
              onView={onView}
              onDismiss={handleDismiss}
              onAlreadyContacted={handleAlreadyContacted}
              onCallParent={onCallParent}
              onCallStudent={onCallStudent}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
