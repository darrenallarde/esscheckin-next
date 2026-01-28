"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Trophy, Award, Loader2 } from "lucide-react";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { AttendanceTrendChart } from "@/components/analytics/AttendanceTrendChart";
import { DayBreakdownChart } from "@/components/analytics/DayBreakdownChart";
import { EngagementFunnel } from "@/components/analytics/EngagementFunnel";
import { LeaderboardTable } from "@/components/analytics/LeaderboardTable";
import { AchievementGrid } from "@/components/analytics/AchievementGrid";
import { NewStudentGrowthChart } from "@/components/analytics/NewStudentGrowthChart";
import { RetentionChart } from "@/components/analytics/RetentionChart";
import {
  useAttendanceData,
  useDayBreakdown,
  useNewStudentGrowth,
  useRetentionData,
  getDateRangeFromPreset,
  exportAttendanceCSV,
} from "@/hooks/queries/use-attendance-data";
import {
  useLeaderboard,
  useRankDistribution,
  useAchievementsSummary,
} from "@/hooks/queries/use-gamification";
import { useOrganization } from "@/hooks/useOrganization";

export default function AnalyticsPage() {
  const [selectedWeeks, setSelectedWeeks] = useState(8);
  const [isExporting, setIsExporting] = useState(false);
  const dateRange = getDateRangeFromPreset(selectedWeeks);

  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceData(organizationId, dateRange);
  const { data: dayBreakdown, isLoading: dayLoading } = useDayBreakdown(organizationId, dateRange);
  const { data: rankDistribution, isLoading: rankLoading } = useRankDistribution(organizationId);
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(organizationId, 50);
  const { data: achievements, isLoading: achievementsLoading } = useAchievementsSummary(organizationId);
  const { data: newStudentData, isLoading: newStudentLoading } = useNewStudentGrowth(organizationId, dateRange);
  const { data: retentionData, isLoading: retentionLoading } = useRetentionData(organizationId, dateRange);

  const handleExport = async () => {
    if (!organizationId) return;

    setIsExporting(true);
    try {
      const csvContent = await exportAttendanceCSV(organizationId, dateRange);

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `attendance-export-${dateRange.start.toISOString().split("T")[0]}-to-${dateRange.end.toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Track attendance trends and student engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            selectedWeeks={selectedWeeks}
            onSelect={setSelectedWeeks}
          />
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting || !organizationId}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main Attendance Chart - Full Width */}
      <AttendanceTrendChart data={attendanceData ?? []} loading={orgLoading || attendanceLoading} />

      {/* Two Column Grid - Growth Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <NewStudentGrowthChart data={newStudentData ?? []} loading={orgLoading || newStudentLoading} />
        <RetentionChart data={retentionData ?? []} loading={orgLoading || retentionLoading} />
      </div>

      {/* Two Column Grid - Breakdown Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DayBreakdownChart data={dayBreakdown ?? []} loading={orgLoading || dayLoading} />
        <EngagementFunnel data={rankDistribution ?? []} loading={orgLoading || rankLoading} />
      </div>

      {/* Gamification Section */}
      <div className="mt-4">
        <Tabs defaultValue="leaderboard" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Gamification Stats</h2>
            <TabsList>
              <TabsTrigger value="leaderboard" className="gap-2">
                <Trophy className="h-4 w-4" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="achievements" className="gap-2">
                <Award className="h-4 w-4" />
                Achievements
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="leaderboard" className="mt-0">
            <LeaderboardTable data={leaderboard ?? []} loading={orgLoading || leaderboardLoading} />
          </TabsContent>

          <TabsContent value="achievements" className="mt-0">
            <AchievementGrid data={achievements ?? []} loading={orgLoading || achievementsLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
