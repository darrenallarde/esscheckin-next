"use client";

import { PastoralQueue } from "@/components/pastoral/PastoralQueue";
import { RecentMessages } from "@/components/dashboard/RecentMessages";
import BelongingSpectrum from "@/components/pastoral/BelongingSpectrum";
import { NewStudentsCard } from "@/components/dashboard/NewStudentsCard";
import { NextActionsCard } from "@/components/home/NextActionsCard";
import { usePastoralRecommendations } from "@/hooks/queries/use-recommendations";
import { useBelongingDistribution } from "@/hooks/queries/use-belonging-distribution";
import { useSmsInbox, SmsConversation } from "@/hooks/queries/use-sms-inbox";
import { useNewStudents } from "@/hooks/queries/use-new-students";
import { useOrganization } from "@/hooks/useOrganization";
import { useMyOrgProfile } from "@/hooks/queries/use-my-profile";
import { orgPath } from "@/lib/navigation";
import { BelongingStatus } from "@/types/pastoral";

export default function HomePage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;
  const orgSlug = currentOrganization?.slug;

  const { data: profile } = useMyOrgProfile(organizationId);
  const { data: recommendations, isLoading: recsLoading } = usePastoralRecommendations(organizationId, 5);
  const { data: belongingData, isLoading: belongingLoading } = useBelongingDistribution(organizationId);
  const { data: smsInbox, isLoading: smsLoading } = useSmsInbox(organizationId);
  const { data: newStudents, isLoading: newStudentsLoading } = useNewStudents(organizationId);

  // Handle belonging spectrum filter click
  const handleBelongingFilterChange = (status: BelongingStatus | "all") => {
    if (status !== "all") {
      window.location.href = orgPath(orgSlug, `/people?status=${encodeURIComponent(status)}`);
    }
  };

  // Handle clicking on a message conversation
  const handleConversationClick = (conv: SmsConversation) => {
    window.location.href = orgPath(orgSlug, `/messages?phone=${encodeURIComponent(conv.phoneNumber)}`);
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  const firstName = profile?.display_name?.split(" ")[0] || "there";

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header with Greeting */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Home</h1>
        <p className="text-muted-foreground text-lg">
          {getGreeting()}, {firstName}
        </p>
      </div>

      {/* AI-Suggested Next Actions */}
      {organizationId && (
        <NextActionsCard organizationId={organizationId} orgSlug={orgSlug} />
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
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pastoral Queue */}
        <PastoralQueue
          data={recommendations ?? []}
          loading={orgLoading || recsLoading}
          viewAllHref={orgPath(orgSlug, "/pastoral")}
        />

        {/* Recent Messages */}
        <RecentMessages
          data={smsInbox ?? []}
          loading={orgLoading || smsLoading}
          viewAllHref={orgPath(orgSlug, "/messages")}
          onConversationClick={handleConversationClick}
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
    </div>
  );
}
