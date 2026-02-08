"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  Trophy,
  Award,
  Loader2,
  Users,
  CalendarCheck,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { DateRangePicker } from "@/components/analytics/DateRangePicker";
import { StatCard } from "@/components/analytics/StatCard";
import { TodaysCheckInsModal } from "@/components/dashboard/TodaysCheckInsModal";

const ChartSkeleton = () => (
  <Skeleton className="h-[200px] md:h-[300px] w-full rounded-xl" />
);

const AttendanceTrendChart = dynamic(
  () =>
    import("@/components/analytics/AttendanceTrendChart").then((m) => ({
      default: m.AttendanceTrendChart,
    })),
  { ssr: false, loading: ChartSkeleton },
);
const DayBreakdownChart = dynamic(
  () =>
    import("@/components/analytics/DayBreakdownChart").then((m) => ({
      default: m.DayBreakdownChart,
    })),
  { ssr: false, loading: ChartSkeleton },
);
const EngagementFunnel = dynamic(
  () =>
    import("@/components/analytics/EngagementFunnel").then((m) => ({
      default: m.EngagementFunnel,
    })),
  { ssr: false, loading: ChartSkeleton },
);
const NewStudentGrowthChart = dynamic(
  () =>
    import("@/components/analytics/NewStudentGrowthChart").then((m) => ({
      default: m.NewStudentGrowthChart,
    })),
  { ssr: false, loading: ChartSkeleton },
);
const RetentionChart = dynamic(
  () =>
    import("@/components/analytics/RetentionChart").then((m) => ({
      default: m.RetentionChart,
    })),
  { ssr: false, loading: ChartSkeleton },
);
const LeaderboardTable = dynamic(
  () =>
    import("@/components/analytics/LeaderboardTable").then((m) => ({
      default: m.LeaderboardTable,
    })),
  { ssr: false, loading: ChartSkeleton },
);
const AchievementGrid = dynamic(
  () =>
    import("@/components/analytics/AchievementGrid").then((m) => ({
      default: m.AchievementGrid,
    })),
  { ssr: false, loading: ChartSkeleton },
);
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
import { useDashboardStats } from "@/hooks/queries/use-dashboard-stats";
import { useTodaysCheckIns } from "@/hooks/queries/use-todays-checkins";
import { useOrganization } from "@/hooks/useOrganization";

export default function AnalyticsPage() {
  const [selectedWeeks, setSelectedWeeks] = useState(8);
  const [isExporting, setIsExporting] = useState(false);
  const [showTodaysCheckIns, setShowTodaysCheckIns] = useState(false);
  const dateRange = getDateRangeFromPreset(selectedWeeks);

  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  // Stats data
  const { data: stats, isLoading: statsLoading } =
    useDashboardStats(organizationId);
  const { data: todaysCheckIns, isLoading: todaysLoading } =
    useTodaysCheckIns(organizationId);

  // Chart data
  const { data: attendanceData, isLoading: attendanceLoading } =
    useAttendanceData(organizationId, dateRange);
  const { data: dayBreakdown, isLoading: dayLoading } = useDayBreakdown(
    organizationId,
    dateRange,
  );
  const { data: rankDistribution, isLoading: rankLoading } =
    useRankDistribution(organizationId);
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(
    organizationId,
    50,
  );
  const { data: achievements, isLoading: achievementsLoading } =
    useAchievementsSummary(organizationId);
  const { data: newStudentData, isLoading: newStudentLoading } =
    useNewStudentGrowth(organizationId, dateRange);
  const { data: retentionData, isLoading: retentionLoading } = useRetentionData(
    organizationId,
    dateRange,
  );

  const isStatsLoading = orgLoading || statsLoading;

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
      link.setAttribute(
        "download",
        `attendance-export-${dateRange.start.toISOString().split("T")[0]}-to-${dateRange.end.toISOString().split("T")[0]}.csv`,
      );
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
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Track attendance trends and student engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker
            selectedWeeks={selectedWeeks}
            onSelect={setSelectedWeeks}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || !organizationId}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Grid - 4 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          subtitle="Active in your organization"
          icon={Users}
          loading={isStatsLoading}
        />
        <StatCard
          title="Check-ins Today"
          value={stats?.checkInsToday ?? 0}
          subtitle="Click to see who's here"
          icon={CalendarCheck}
          trend={stats?.todayTrend}
          loading={isStatsLoading}
          onClick={() => setShowTodaysCheckIns(true)}
        />
        <StatCard
          title="Daily Average"
          value={stats?.weeklyAverage ?? 0}
          subtitle="Average over last 7 days"
          icon={TrendingUp}
          trend={stats?.weeklyTrend}
          loading={isStatsLoading}
        />
        <StatCard
          title="Needs Attention"
          value={stats?.needsAttention ?? 0}
          subtitle="Students missing 30+ days"
          icon={AlertCircle}
          loading={isStatsLoading}
        />
      </div>

      {/* Main Attendance Chart - Full Width */}
      <AttendanceTrendChart
        data={attendanceData ?? []}
        loading={orgLoading || attendanceLoading}
      />

      {/* Two Column Grid - Growth Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <NewStudentGrowthChart
          data={newStudentData ?? []}
          loading={orgLoading || newStudentLoading}
        />
        <RetentionChart
          data={retentionData ?? []}
          loading={orgLoading || retentionLoading}
        />
      </div>

      {/* Two Column Grid - Breakdown Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DayBreakdownChart
          data={dayBreakdown ?? []}
          loading={orgLoading || dayLoading}
        />
        <EngagementFunnel
          data={rankDistribution ?? []}
          loading={orgLoading || rankLoading}
        />
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
            <LeaderboardTable
              data={leaderboard ?? []}
              loading={orgLoading || leaderboardLoading}
            />
          </TabsContent>

          <TabsContent value="achievements" className="mt-0">
            <AchievementGrid
              data={achievements ?? []}
              loading={orgLoading || achievementsLoading}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Today's Check-ins Modal */}
      <TodaysCheckInsModal
        open={showTodaysCheckIns}
        onOpenChange={setShowTodaysCheckIns}
        checkIns={todaysCheckIns ?? []}
        loading={todaysLoading}
      />
    </div>
  );
}
