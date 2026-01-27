"use client";

import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Clock } from "lucide-react";
import { TodayCheckIn } from "@/hooks/queries/use-attendance";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CheckInFeedProps {
  checkIns: TodayCheckIn[] | undefined;
  loading: boolean;
  organizationId: string | null;
  onStudentClick?: (studentId: string) => void;
}

export function CheckInFeed({
  checkIns,
  loading,
  organizationId,
  onStudentClick,
}: CheckInFeedProps) {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null);

  // Set up real-time subscription
  useEffect(() => {
    if (!organizationId) return;

    const supabase = createClient();

    // Subscribe to check_ins changes
    const channel = supabase
      .channel("check-ins-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "check_ins",
          filter: `organization_id=eq.${organizationId}`,
        },
        () => {
          // Invalidate the query to refetch
          queryClient.invalidateQueries({ queryKey: ["today-check-ins", organizationId] });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [organizationId, queryClient]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (!checkIns || checkIns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <User className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No check-ins yet today</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Check-ins will appear here in real-time
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-2">
        {checkIns.map((checkIn) => (
          <button
            key={checkIn.id}
            onClick={() => onStudentClick?.(checkIn.student_id)}
            className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {checkIn.first_name.charAt(0)}
              {checkIn.last_name.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {checkIn.first_name} {checkIn.last_name}
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {checkIn.grade && <span>Grade {checkIn.grade}</span>}
                {checkIn.groups.length > 0 && (
                  <>
                    {checkIn.grade && <span>·</span>}
                    <span className="truncate">{checkIn.groups.join(", ")}</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <Clock className="h-3.5 w-3.5" />
              {format(parseISO(checkIn.checked_in_at), "h:mm a")}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
