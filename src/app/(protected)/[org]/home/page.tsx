"use client";

import { useState } from "react";
import { PastoralQueue, PastoralRecommendation } from "@/components/pastoral/PastoralQueue";
import { RecentMessages } from "@/components/dashboard/RecentMessages";
import BelongingSpectrum from "@/components/pastoral/BelongingSpectrum";
import { NewStudentsCard } from "@/components/dashboard/NewStudentsCard";
import { QuestBoard } from "@/components/home/QuestBoard";
import { PrayerRequestsCard } from "@/components/home/PrayerRequestsCard";
import { HomeProfileDrawer, HomeProfilePerson } from "@/components/home/HomeProfileDrawer";
import { HomeMessageDrawer } from "@/components/home/HomeMessageDrawer";
import { HomePeopleListDrawer, BelongingPerson } from "@/components/home/HomePeopleListDrawer";
import { usePastoralRecommendations } from "@/hooks/queries/use-recommendations";
import { useBelongingDistribution } from "@/hooks/queries/use-belonging-distribution";
import { useSmsInbox, SmsConversation } from "@/hooks/queries/use-sms-inbox";
import { useNewStudents, NewStudent } from "@/hooks/queries/use-new-students";
import { usePrayerRequests, PrayerRequest } from "@/hooks/queries/use-prayer-requests";
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
  const { data: prayerRequests, isLoading: prayerLoading } = usePrayerRequests(organizationId, 4);

  // Profile drawer state
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<HomeProfilePerson | null>(null);

  // Message drawer state
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{
    profileId: string | null;
    phoneNumber: string | null;
    personName: string | null;
  }>({ profileId: null, phoneNumber: null, personName: null });

  // People list drawer state (for BelongingSpectrum)
  const [peopleListDrawerOpen, setPeopleListDrawerOpen] = useState(false);
  const [selectedBelongingStatus, setSelectedBelongingStatus] = useState<BelongingStatus | null>(null);
  const [selectedBelongingPeople, setSelectedBelongingPeople] = useState<BelongingPerson[]>([]);

  // Handle belonging spectrum status click → open people list drawer
  const handleBelongingFilterChange = (status: BelongingStatus | "all") => {
    if (status !== "all" && belongingData?.studentsByStatus) {
      setSelectedBelongingStatus(status);
      setSelectedBelongingPeople(belongingData.studentsByStatus[status] || []);
      setPeopleListDrawerOpen(true);
    }
  };

  // Handle clicking a person in the people list drawer → open profile drawer
  const handleBelongingPersonClick = (person: BelongingPerson) => {
    setPeopleListDrawerOpen(false);
    setSelectedPerson({
      profile_id: person.id,
      first_name: person.first_name,
      last_name: person.last_name,
      phone_number: null,
      email: null,
      grade: person.grade,
      gender: null,
      high_school: null,
      days_since_last_check_in: person.days_since_last_seen,
    });
    setProfileDrawerOpen(true);
  };

  // Handle clicking a person name in NewStudentsCard → open profile drawer
  const handlePersonClick = (student: NewStudent) => {
    setSelectedPerson({
      profile_id: student.profile_id,
      first_name: student.first_name,
      last_name: student.last_name,
      phone_number: student.phone_number,
      email: student.email,
      grade: student.grade,
      gender: student.gender,
      high_school: student.high_school,
      group_names: student.group_names,
    });
    setProfileDrawerOpen(true);
  };

  // Handle clicking SMS icon in NewStudentsCard → open message drawer
  const handleSmsClick = (student: NewStudent) => {
    setSelectedConversation({
      profileId: student.profile_id,
      phoneNumber: student.phone_number,
      personName: `${student.first_name} ${student.last_name}`,
    });
    setMessageDrawerOpen(true);
  };

  // Handle clicking a conversation in RecentMessages → open message drawer
  const handleConversationClick = (conv: SmsConversation) => {
    setSelectedConversation({
      profileId: conv.profileId || conv.studentId,
      phoneNumber: conv.phoneNumber,
      personName: conv.studentName,
    });
    setMessageDrawerOpen(true);
  };

  // Handle clicking a person in PastoralQueue → open profile drawer
  const handlePastoralPersonClick = (rec: PastoralRecommendation) => {
    const nameParts = rec.student_name.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    setSelectedPerson({
      profile_id: rec.student_id,
      first_name: firstName,
      last_name: lastName,
      phone_number: null,
      email: null,
      grade: null,
      gender: null,
      high_school: null,
      last_check_in: rec.last_seen,
      days_since_last_check_in: rec.days_absent,
    });
    setProfileDrawerOpen(true);
  };

  // Handle clicking a prayer request → open profile drawer
  const handlePrayerPersonClick = (request: PrayerRequest) => {
    setSelectedPerson({
      profile_id: request.profile_id,
      first_name: request.first_name,
      last_name: request.last_name,
      phone_number: request.phone_number,
      email: null,
      grade: null,
      gender: null,
      high_school: null,
    });
    setProfileDrawerOpen(true);
  };

  // Handle "Send Text" from profile drawer → close profile, open message drawer
  const handleSendMessageFromProfile = (person: HomeProfilePerson) => {
    setProfileDrawerOpen(false);
    setSelectedConversation({
      profileId: person.profile_id,
      phoneNumber: person.phone_number,
      personName: `${person.first_name} ${person.last_name}`,
    });
    setMessageDrawerOpen(true);
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

      {/* Belonging Spectrum - Top placement */}
      {!belongingLoading && belongingData && (
        <BelongingSpectrum
          distribution={belongingData.distribution}
          totalStudents={belongingData.totalStudents}
          onFilterChange={handleBelongingFilterChange}
        />
      )}

      {/* Quest Board + New Students - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quest Board - Daily Habits & Priority Actions */}
        {organizationId && (
          <QuestBoard organizationId={organizationId} orgSlug={orgSlug} />
        )}

        {/* New Students Card */}
        {organizationId && orgSlug && (
          <NewStudentsCard
            data={newStudents ?? []}
            loading={newStudentsLoading}
            organizationId={organizationId}
            orgSlug={orgSlug}
            viewAllHref={orgPath(orgSlug, "/people?filter=new")}
            onPersonClick={handlePersonClick}
            onSmsClick={handleSmsClick}
          />
        )}
      </div>

      {/* Prayer Requests + Recent Messages - Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prayer Requests Card */}
        <PrayerRequestsCard
          data={prayerRequests ?? []}
          loading={prayerLoading}
          viewAllHref={orgPath(orgSlug, "/prayer-wall")}
          onPersonClick={handlePrayerPersonClick}
        />

        {/* Recent Messages */}
        <RecentMessages
          data={smsInbox ?? []}
          loading={orgLoading || smsLoading}
          viewAllHref={orgPath(orgSlug, "/messages")}
          onConversationClick={handleConversationClick}
        />
      </div>

      {/* Pastoral Queue - Full Width */}
      <PastoralQueue
        data={recommendations ?? []}
        loading={orgLoading || recsLoading}
        viewAllHref={orgPath(orgSlug, "/pastoral")}
        useDrawer
        onPersonClick={handlePastoralPersonClick}
      />

      {/* Drawers - rendered at page level */}
      <HomeProfileDrawer
        person={selectedPerson}
        open={profileDrawerOpen}
        onOpenChange={setProfileDrawerOpen}
        onSendMessage={handleSendMessageFromProfile}
        orgSlug={orgSlug}
      />

      <HomeMessageDrawer
        profileId={selectedConversation.profileId}
        phoneNumber={selectedConversation.phoneNumber}
        personName={selectedConversation.personName}
        open={messageDrawerOpen}
        onOpenChange={setMessageDrawerOpen}
      />

      <HomePeopleListDrawer
        status={selectedBelongingStatus}
        people={selectedBelongingPeople}
        open={peopleListDrawerOpen}
        onOpenChange={setPeopleListDrawerOpen}
        onPersonClick={handleBelongingPersonClick}
      />
    </div>
  );
}
