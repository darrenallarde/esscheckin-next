"use client";

import { Users, CalendarCheck, TrendingUp, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { MiniTrendChart } from "@/components/analytics/MiniTrendChart";
import { LeaderboardPreview } from "@/components/analytics/LeaderboardPreview";
import { PastoralQueue } from "@/components/pastoral/PastoralQueue";
import { EncouragingMessage } from "@/components/shared/EncouragingMessage";
import { useDashboardStats, useWeeklyAttendance } from "@/hooks/queries/use-dashboard-stats";
import { useLeaderboard } from "@/hooks/queries/use-gamification";
import { usePastoralRecommendations } from "@/hooks/queries/use-recommendations";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyAttendance();
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(5);
  const { data: recommendations, isLoading: recsLoading } = usePastoralRecommendations(5);

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header with Encouraging Verse */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Your ministry at a glance
          </p>
        </div>
        <EncouragingMessage />
      </div>

      {/* Stats Grid - 4 cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          subtitle="Active in your organization"
          icon={Users}
          loading={statsLoading}
        />
        <StatCard
          title="Check-ins Today"
          value={stats?.checkInsToday ?? 0}
          subtitle="Students checked in today"
          icon={CalendarCheck}
          trend={stats?.todayTrend}
          loading={statsLoading}
        />
        <StatCard
          title="Daily Average"
          value={stats?.weeklyAverage ?? 0}
          subtitle="Average over last 7 days"
          icon={TrendingUp}
          trend={stats?.weeklyTrend}
          loading={statsLoading}
        />
        <StatCard
          title="Needs Attention"
          value={stats?.needsAttention ?? 0}
          subtitle="Students missing 30+ days"
          icon={AlertCircle}
          loading={statsLoading}
        />
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Pastoral Queue (wider) */}
        <div className="lg:col-span-3">
          <PastoralQueue
            data={recommendations ?? []}
            loading={recsLoading}
            viewAllHref="/pastoral"
          />
        </div>

        {/* Right Column - Trend Chart & Leaderboard */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <MiniTrendChart
            data={weeklyData ?? []}
            loading={weeklyLoading}
            title="Weekly Attendance Trend"
          />
          <LeaderboardPreview
            data={leaderboard ?? []}
            loading={leaderboardLoading}
            viewAllHref="/analytics"
          />
        </div>
      </div>
    </div>
  );
}
