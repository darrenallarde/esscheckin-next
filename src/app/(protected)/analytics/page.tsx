"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Trophy, Award } from "lucide-react";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { AttendanceTrendChart } from "@/components/analytics/AttendanceTrendChart";
import { DayBreakdownChart } from "@/components/analytics/DayBreakdownChart";
import { EngagementFunnel } from "@/components/analytics/EngagementFunnel";
import { LeaderboardTable } from "@/components/analytics/LeaderboardTable";
import { AchievementGrid } from "@/components/analytics/AchievementGrid";
import {
  useAttendanceData,
  useDayBreakdown,
  getDateRangeFromPreset,
} from "@/hooks/queries/use-attendance-data";
import {
  useLeaderboard,
  useRankDistribution,
  useAchievementsSummary,
} from "@/hooks/queries/use-gamification";

export default function AnalyticsPage() {
  const [selectedWeeks, setSelectedWeeks] = useState(8);
  const dateRange = getDateRangeFromPreset(selectedWeeks);

  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceData(dateRange);
  const { data: dayBreakdown, isLoading: dayLoading } = useDayBreakdown(dateRange);
  const { data: rankDistribution, isLoading: rankLoading } = useRankDistribution();
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(50);
  const { data: achievements, isLoading: achievementsLoading } = useAchievementsSummary();

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log("Export not yet implemented");
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
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Main Attendance Chart - Full Width */}
      <AttendanceTrendChart data={attendanceData ?? []} loading={attendanceLoading} />

      {/* Two Column Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DayBreakdownChart data={dayBreakdown ?? []} loading={dayLoading} />
        <EngagementFunnel data={rankDistribution ?? []} loading={rankLoading} />
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
            <LeaderboardTable data={leaderboard ?? []} loading={leaderboardLoading} />
          </TabsContent>

          <TabsContent value="achievements" className="mt-0">
            <AchievementGrid data={achievements ?? []} loading={achievementsLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
