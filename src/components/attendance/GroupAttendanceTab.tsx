"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { GroupAttendanceCard, GroupAttendanceCardSkeleton } from "./GroupAttendanceCard";
import { useGroupAttendanceStats } from "@/hooks/queries/use-attendance";
import { getDateRangeFromPreset } from "@/hooks/queries/use-attendance-data";
import { Users, TrendingUp, AlertTriangle } from "lucide-react";

interface GroupAttendanceTabProps {
  organizationId: string | null;
}

export function GroupAttendanceTab({ organizationId }: GroupAttendanceTabProps) {
  const [selectedWeeks, setSelectedWeeks] = useState(4);
  const dateRange = getDateRangeFromPreset(selectedWeeks);

  const { data: groupStats, isLoading } = useGroupAttendanceStats(
    organizationId,
    dateRange
  );

  // Calculate summary stats
  const summary = groupStats
    ? {
        totalGroups: groupStats.length,
        avgAttendance: Math.round(
          groupStats.reduce((sum, g) => sum + g.attendance_rate, 0) / (groupStats.length || 1)
        ),
        highPerforming: groupStats.filter((g) => g.attendance_rate >= 80).length,
        needingAttention: groupStats.filter((g) => g.attendance_rate < 60).length,
      }
    : null;

  return (
    <div className="space-y-6">
      {/* Header with Date Picker */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Group Attendance</h2>
          <p className="text-sm text-muted-foreground">
            Compare attendance rates across your groups
          </p>
        </div>
        <DateRangePicker
          selectedWeeks={selectedWeeks}
          onSelect={setSelectedWeeks}
        />
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{summary?.totalGroups ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Total Groups</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{summary?.avgAttendance ?? "-"}%</p>
                <p className="text-xs text-muted-foreground">Avg Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{summary?.highPerforming ?? "-"}</p>
                <p className="text-xs text-muted-foreground">High Performing (80%+)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{summary?.needingAttention ?? "-"}</p>
                <p className="text-xs text-muted-foreground">Needs Attention (&lt;60%)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Group Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          [...Array(6)].map((_, i) => <GroupAttendanceCardSkeleton key={i} />)
        ) : groupStats && groupStats.length > 0 ? (
          groupStats
            .sort((a, b) => b.attendance_rate - a.attendance_rate)
            .map((group) => (
              <GroupAttendanceCard
                key={group.id}
                group={group}
              />
            ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No groups found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create groups to track attendance by group
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Legend */}
      {groupStats && groupStats.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span>High (80%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span>Moderate (60-79%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span>Low (&lt;60%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
