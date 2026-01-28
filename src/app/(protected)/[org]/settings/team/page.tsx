"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamMembersList } from "@/components/settings/TeamMembersList";
import { PendingInvitesList } from "@/components/settings/PendingInvitesList";
import { InviteTeamModal } from "@/components/settings/InviteTeamModal";
import { useTeamMembers, usePendingInvitations } from "@/hooks/queries/use-team";
import { useOrganization } from "@/hooks/useOrganization";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamSettingsPage() {
  const { currentOrganization, userRole, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  const { data: members, isLoading: membersLoading } = useTeamMembers(organizationId);
  const { data: invitations, isLoading: invitationsLoading } = usePendingInvitations(organizationId);

  if (orgLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
          <p className="text-muted-foreground">
            No organization selected.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
          <p className="text-muted-foreground">
            Manage team members and invitations for {currentOrganization.name}
          </p>
        </div>
        <InviteTeamModal
          organizationId={currentOrganization.id}
          organizationName={currentOrganization.displayName || currentOrganization.name}
          currentUserRole={userRole}
        />
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            People with access to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamMembersList
            members={members || []}
            loading={membersLoading}
            organizationId={currentOrganization.id}
            currentUserRole={userRole}
          />
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>
            Invitations waiting to be accepted
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingInvitesList
            invitations={invitations || []}
            loading={invitationsLoading}
            organizationId={currentOrganization.id}
            organizationName={currentOrganization.displayName || currentOrganization.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
