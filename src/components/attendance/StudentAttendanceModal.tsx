"use client";

import { useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStudentAttendanceHistory, StudentAttendanceHistoryItem } from "@/hooks/queries/use-attendance";
import { Calendar, CheckCircle2, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudentAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string | null;
  studentName?: string;
}

// Simple calendar heatmap component
function CalendarHeatmap({ checkIns }: { checkIns: StudentAttendanceHistoryItem[] }) {
  const checkInDates = useMemo(() => {
    return new Set(checkIns.map((ci) => format(parseISO(ci.checked_in_at), "yyyy-MM-dd")));
  }, [checkIns]);

  // Generate last 3 months of days
  const months = useMemo(() => {
    const result = [];
    const today = new Date();

    for (let i = 2; i >= 0; i--) {
      const monthDate = subMonths(today, i);
      const start = startOfMonth(monthDate);
      const end = i === 0 ? today : endOfMonth(monthDate);
      const days = eachDayOfInterval({ start, end });

      result.push({
        name: format(monthDate, "MMMM yyyy"),
        days,
      });
    }

    return result;
  }, []);

  return (
    <div className="space-y-4">
      {months.map((month) => (
        <div key={month.name}>
          <h4 className="text-sm font-medium mb-2">{month.name}</h4>
          <div className="flex flex-wrap gap-1">
            {month.days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const hasCheckIn = checkInDates.has(dateKey);
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={dateKey}
                  className={cn(
                    "w-5 h-5 rounded-sm flex items-center justify-center text-[10px]",
                    hasCheckIn ? "bg-green-500 text-white" : "bg-muted",
                    isToday && !hasCheckIn && "ring-2 ring-primary ring-offset-1"
                  )}
                  title={`${format(day, "MMM d, yyyy")}${hasCheckIn ? " - Checked in" : ""}`}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudentAttendanceModal({
  open,
  onOpenChange,
  studentId,
  studentName,
}: StudentAttendanceModalProps) {
  const { data: history, isLoading } = useStudentAttendanceHistory(open ? studentId : null);

  // Calculate stats
  const stats = useMemo(() => {
    if (!history || history.length === 0) {
      return { total: 0, thisMonth: 0, lastMonth: 0, streak: 0 };
    }

    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    let thisMonth = 0;
    let lastMonth = 0;

    history.forEach((ci) => {
      const date = parseISO(ci.checked_in_at);
      if (date >= thisMonthStart) {
        thisMonth++;
      } else if (date >= lastMonthStart && date <= lastMonthEnd) {
        lastMonth++;
      }
    });

    // Calculate current streak (consecutive weeks with at least one check-in)
    // This is simplified - actual streak logic may be more complex
    let streak = 0;
    if (history.length > 0) {
      const sortedDates = history
        .map((ci) => parseISO(ci.checked_in_at))
        .sort((a, b) => b.getTime() - a.getTime());

      // Check if checked in within last 7 days
      const daysSinceLastCheckIn = Math.floor(
        (now.getTime() - sortedDates[0].getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastCheckIn <= 7) {
        streak = 1;
        // Count consecutive weeks (simplified)
        let lastCheckInWeek = Math.floor(sortedDates[0].getTime() / (1000 * 60 * 60 * 24 * 7));

        for (let i = 1; i < sortedDates.length; i++) {
          const thisWeek = Math.floor(sortedDates[i].getTime() / (1000 * 60 * 60 * 24 * 7));
          if (lastCheckInWeek - thisWeek === 1) {
            streak++;
            lastCheckInWeek = thisWeek;
          } else if (lastCheckInWeek - thisWeek > 1) {
            break;
          }
        }
      }
    }

    return {
      total: history.length,
      thisMonth,
      lastMonth,
      streak,
    };
  }, [history]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance History
          </DialogTitle>
          <DialogDescription>
            {studentName ? `${studentName}'s check-in history` : "Student attendance details"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
            <Skeleton className="h-40" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{stats.thisMonth}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{stats.lastMonth}</p>
                <p className="text-xs text-muted-foreground">Last Month</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-100">
                <p className="text-2xl font-bold text-green-600">{stats.streak}</p>
                <p className="text-xs text-green-600">Week Streak</p>
              </div>
            </div>

            {/* Calendar Heatmap */}
            {history && history.length > 0 && (
              <div className="border rounded-lg p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Check-in Calendar
                </h3>
                <CalendarHeatmap checkIns={history} />
              </div>
            )}

            {/* Recent Check-ins List */}
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Recent Check-ins
                </h3>
              </div>
              <ScrollArea className="h-48">
                {history && history.length > 0 ? (
                  <div className="divide-y">
                    {history.slice(0, 20).map((ci) => (
                      <div key={ci.id} className="flex items-center justify-between p-3">
                        <span className="font-medium">
                          {format(parseISO(ci.checked_in_at), "EEEE, MMMM d, yyyy")}
                        </span>
                        <Badge variant="outline">
                          {format(parseISO(ci.checked_in_at), "h:mm a")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-muted-foreground">
                    No check-ins recorded
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
