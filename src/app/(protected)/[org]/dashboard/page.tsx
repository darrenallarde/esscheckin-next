"use client";

import { useState } from "react";
import { Users, CalendarCheck, TrendingUp, AlertCircle } from "lucide-react";
import { StatCard } from "@/components/analytics/StatCard";
import { MiniTrendChart } from "@/components/analytics/MiniTrendChart";
import { LeaderboardPreview } from "@/components/analytics/LeaderboardPreview";
import { PastoralQueue } from "@/components/pastoral/PastoralQueue";
import { RecentMessages } from "@/components/dashboard/RecentMessages";
import { EncouragingMessage } from "@/components/shared/EncouragingMessage";
import BelongingSpectrum from "@/components/pastoral/BelongingSpectrum";
import { TodaysCheckInsModal } from "@/components/dashboard/TodaysCheckInsModal";
import { useDashboardStats, useWeeklyAttendance } from "@/hooks/queries/use-dashboard-stats";
import { useLeaderboard } from "@/hooks/queries/use-gamification";
import { usePastoralRecommendations } from "@/hooks/queries/use-recommendations";
import { useBelongingDistribution } from "@/hooks/queries/use-belonging-distribution";
import { useTodaysCheckIns } from "@/hooks/queries/use-todays-checkins";
import { useSmsInbox, SmsConversation } from "@/hooks/queries/use-sms-inbox";
import { useNewStudents } from "@/hooks/queries/use-new-students";
import { useOrganization } from "@/hooks/useOrganization";
import { orgPath } from "@/lib/navigation";
import { NewStudentsCard } from "@/components/dashboard/NewStudentsCard";
import { BelongingStatus } from "@/types/pastoral";

export default function DashboardPage() {
  const [showTodaysCheckIns, setShowTodaysCheckIns] = useState(false);

  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;
  const orgSlug = currentOrganization?.slug;

  const { data: stats, isLoading: statsLoading } = useDashboardStats(organizationId);
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyAttendance(organizationId);
  const { data: leaderboard, isLoading: leaderboardLoading } = useLeaderboard(organizationId, 5);
  const { data: recommendations, isLoading: recsLoading } = usePastoralRecommendations(organizationId, 5);
  const { data: belongingData, isLoading: belongingLoading } = useBelongingDistribution(organizationId);
  const { data: todaysCheckIns, isLoading: todaysLoading } = useTodaysCheckIns(organizationId);
  const { data: smsInbox, isLoading: smsLoading } = useSmsInbox(organizationId);
  const { data: newStudents, isLoading: newStudentsLoading } = useNewStudents(organizationId);

  const isLoading = orgLoading || statsLoading;

  // Handle belonging spectrum filter click (could navigate to People page with filter)
  const handleBelongingFilterChange = (status: BelongingStatus | "all") => {
    if (status !== "all") {
      // Navigate to People page with filter applied
      window.location.href = orgPath(orgSlug, `/people?status=${encodeURIComponent(status)}`);
    }
  };

  // Handle clicking on a message conversation
  const handleConversationClick = (conv: SmsConversation) => {
    // Navigate to messages page with the phone number as a query param
    window.location.href = orgPath(orgSlug, `/messages?phone=${encodeURIComponent(conv.phoneNumber)}`);
  };

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
          loading={isLoading}
        />
        <StatCard
          title="Check-ins Today"
          value={stats?.checkInsToday ?? 0}
          subtitle="Click to see who's here"
          icon={CalendarCheck}
          trend={stats?.todayTrend}
          loading={isLoading}
          onClick={() => setShowTodaysCheckIns(true)}
        />
        <StatCard
          title="Daily Average"
          value={stats?.weeklyAverage ?? 0}
          subtitle="Average over last 7 days"
          icon={TrendingUp}
          trend={stats?.weeklyTrend}
          loading={isLoading}
        />
        <StatCard
          title="Needs Attention"
          value={stats?.needsAttention ?? 0}
          subtitle="Students missing 30+ days"
          icon={AlertCircle}
          loading={isLoading}
        />
      </div>

      {/* New Students Card - Show when there are students needing triage */}
      {!newStudentsLoading && newStudents && newStudents.length > 0 && organizationId && orgSlug && (
        <NewStudentsCard
          data={newStudents}
          loading={newStudentsLoading}
          organizationId={organizationId}
          orgSlug={orgSlug}
          viewAllHref={orgPath(orgSlug, "/people?filter=new")}
        />
      )}

      {/* Belonging Spectrum - Prominent placement */}
      {!belongingLoading && belongingData && (
        <BelongingSpectrum
          distribution={belongingData.distribution}
          totalStudents={belongingData.totalStudents}
          onFilterChange={handleBelongingFilterChange}
        />
      )}

      {/* Main Content - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left Column - Pastoral Queue (wider) */}
        <div className="lg:col-span-3">
          <PastoralQueue
            data={recommendations ?? []}
            loading={orgLoading || recsLoading}
            viewAllHref={orgPath(orgSlug, "/pastoral")}
          />
        </div>

        {/* Right Column - Messages, Trend Chart & Leaderboard */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <RecentMessages
            data={smsInbox ?? []}
            loading={orgLoading || smsLoading}
            viewAllHref={orgPath(orgSlug, "/messages")}
            onConversationClick={handleConversationClick}
          />
          <MiniTrendChart
            data={weeklyData ?? []}
            loading={orgLoading || weeklyLoading}
            title="Weekly Attendance Trend"
          />
          <LeaderboardPreview
            data={leaderboard ?? []}
            loading={orgLoading || leaderboardLoading}
            viewAllHref={orgPath(orgSlug, "/analytics")}
          />
        </div>
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
