"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, UsersRound } from "lucide-react";
import { GroupCard } from "@/components/groups/GroupCard";
import { GroupDetailModal } from "@/components/groups/GroupDetailModal";
import { CreateGroupModal } from "@/components/groups/CreateGroupModal";
import { GroupSettingsModal } from "@/components/groups/GroupSettingsModal";
import { AddStudentToGroupModal } from "@/components/groups/AddStudentToGroupModal";
import { useGroups, Group, useGroupMembers } from "@/hooks/queries/use-groups";
import { useOrganization } from "@/hooks/useOrganization";

export default function GroupsPage() {
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);

  const { currentOrganization, userRole, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;
  const canManageLeaders = userRole === "owner" || userRole === "admin";

  const { data: groups, isLoading: groupsLoading } = useGroups(organizationId);
  const { data: groupMembers } = useGroupMembers(selectedGroup?.id || null);

  const isLoading = orgLoading || groupsLoading;

  const handleGroupClick = (group: Group) => {
    setSelectedGroup(group);
  };

  const handleAddStudent = () => {
    setShowAddStudentModal(true);
  };

  const handleEditSettings = () => {
    setShowSettingsModal(true);
  };

  const existingMemberIds = groupMembers?.map((m) => m.student_id) || [];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Groups</h1>
          <p className="text-muted-foreground mt-1">
            Manage your groups and track attendance
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} disabled={!organizationId}>
          <Plus className="h-4 w-4 mr-2" />
          New Group
        </Button>
      </div>

      {/* Groups Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UsersRound className="h-5 w-5" />
          My Groups
        </h2>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : groups && groups.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onClick={() => handleGroupClick(group)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <UsersRound className="mx-auto h-12 w-12 text-muted-foreground/30" />
              <h3 className="mt-4 text-lg font-medium">No groups yet</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
                Create your first group to organize people and track their attendance
                based on meeting schedules.
              </p>
              <Button className="mt-4" onClick={() => setShowCreateModal(true)} disabled={!organizationId}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Group
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary */}
      {groups && groups.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {groups.reduce((sum, g) => sum + g.member_count, 0)} people across {groups.length} groups
        </p>
      )}

      {/* Group Detail Modal */}
      <GroupDetailModal
        group={selectedGroup}
        open={!!selectedGroup}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
        onAddStudent={handleAddStudent}
        onEditSettings={handleEditSettings}
        organizationId={organizationId || ""}
        canManageLeaders={canManageLeaders}
      />

      {/* Create Group Modal */}
      {organizationId && (
        <CreateGroupModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          organizationId={organizationId}
        />
      )}

      {/* Group Settings Modal */}
      {selectedGroup && organizationId && (
        <GroupSettingsModal
          group={selectedGroup}
          open={showSettingsModal}
          onOpenChange={(open) => {
            setShowSettingsModal(open);
            if (!open) setSelectedGroup(null);
          }}
          organizationId={organizationId}
        />
      )}

      {/* Add Person to Group Modal */}
      {selectedGroup && organizationId && (
        <AddStudentToGroupModal
          open={showAddStudentModal}
          onOpenChange={setShowAddStudentModal}
          groupId={selectedGroup.id}
          groupName={selectedGroup.name}
          existingMemberIds={existingMemberIds}
          organizationId={organizationId}
        />
      )}
    </div>
  );
}
