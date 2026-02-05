"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  User,
  MessageSquare,
  Check,
  ChevronRight,
  Users,
} from "lucide-react";
import { NewStudent, useMarkStudentTriaged } from "@/hooks/queries/use-new-students";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface NewStudentsCardProps {
  data: NewStudent[];
  loading: boolean;
  organizationId: string;
  orgSlug: string;
  viewAllHref: string;
  maxDisplay?: number;
  onPersonClick?: (student: NewStudent) => void;
  onSmsClick?: (student: NewStudent) => void;
}

export function NewStudentsCard({
  data,
  loading,
  organizationId,
  orgSlug,
  viewAllHref,
  maxDisplay = 5,
  onPersonClick,
  onSmsClick,
}: NewStudentsCardProps) {
  const { toast } = useToast();
  const markTriaged = useMarkStudentTriaged();
  const [triagingId, setTriagingId] = useState<string | null>(null);

  const handleMarkTriaged = async (profileId: string) => {
    setTriagingId(profileId);
    try {
      await markTriaged.mutateAsync({ profileId, organizationId });
      toast({
        title: "Student triaged",
        description: "Student has been removed from the new students list.",
      });
    } catch (error) {
      console.error("Failed to mark as triaged:", error);
      toast({
        title: "Error",
        description: "Failed to mark student as triaged. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTriagingId(null);
    }
  };

  const displayStudents = data.slice(0, maxDisplay);
  const hasMore = data.length > maxDisplay;

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return null; // Don't show the card if there are no new students
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">New Students</CardTitle>
            <Badge variant="secondary" className="ml-1">
              {data.length}
            </Badge>
          </div>
          <Link href={viewAllHref}>
            <Button variant="ghost" size="sm">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayStudents.map((student) => (
          <div
            key={student.profile_id}
            className="flex items-center justify-between py-2 border-b last:border-0"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {onPersonClick ? (
                  <button
                    onClick={() => onPersonClick(student)}
                    className="font-medium truncate hover:underline text-left"
                  >
                    {student.first_name} {student.last_name}
                  </button>
                ) : (
                  <span className="font-medium truncate">
                    {student.first_name} {student.last_name}
                  </span>
                )}
                {student.gender && (
                  <Badge variant="outline" className="text-xs">
                    {student.gender === "male" ? "M" : "F"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {student.grade && <span>{student.grade}th Grade</span>}
                {student.grade && student.group_names.length > 0 && (
                  <span>•</span>
                )}
                {student.group_names.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {student.group_names[0]}
                    {student.group_names.length > 1 &&
                      ` +${student.group_names.length - 1}`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* View Profile */}
              {onPersonClick ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onPersonClick(student)}
                >
                  <User className="h-4 w-4" />
                  <span className="sr-only">View profile</span>
                </Button>
              ) : (
                <Link href={`/${orgSlug}/people?profile=${student.profile_id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <User className="h-4 w-4" />
                    <span className="sr-only">View profile</span>
                  </Button>
                </Link>
              )}

              {/* Send SMS */}
              {student.phone_number && (
                onSmsClick ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onSmsClick(student)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="sr-only">Send SMS</span>
                  </Button>
                ) : (
                  <Link
                    href={`/${orgSlug}/messages?phone=${encodeURIComponent(
                      student.phone_number
                    )}`}
                  >
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MessageSquare className="h-4 w-4" />
                      <span className="sr-only">Send SMS</span>
                    </Button>
                  </Link>
                )
              )}

              {/* Mark as Triaged */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleMarkTriaged(student.profile_id)}
                disabled={triagingId === student.profile_id}
              >
                {triagingId === student.profile_id ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="sr-only">Mark as triaged</span>
              </Button>
            </div>
          </div>
        ))}

        {hasMore && (
          <Link href={viewAllHref}>
            <Button variant="ghost" size="sm" className="w-full mt-2">
              View {data.length - maxDisplay} more new students
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
