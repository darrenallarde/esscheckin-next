"use client";

import { useState } from "react";
import { MoreVertical, Shield, UserMinus, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamMember, useUpdateMemberRole, useRemoveTeamMember } from "@/hooks/queries/use-team";
import type { Database } from "@/integrations/supabase/types";

type OrgRole = Database["public"]["Enums"]["org_role"];

interface TeamMembersListProps {
  members: TeamMember[];
  loading?: boolean;
  organizationId: string;
  currentUserRole: OrgRole | null;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  leader: "Leader",
  viewer: "Viewer",
};

const ROLE_BADGE_COLORS: Record<OrgRole, string> = {
  owner: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  leader: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  viewer: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

export function TeamMembersList({
  members,
  loading,
  organizationId,
  currentUserRole,
}: TeamMembersListProps) {
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);

  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveTeamMember();

  const canManageMembers = currentUserRole === "owner" || currentUserRole === "admin";
  const isOwner = currentUserRole === "owner";

  const handleRoleChange = async (member: TeamMember, newRole: OrgRole) => {
    setUpdatingRole(member.user_id);
    try {
      await updateRole.mutateAsync({
        organizationId,
        userId: member.user_id,
        newRole,
      });
    } catch (error) {
      console.error("Failed to update role:", error);
    } finally {
      setUpdatingRole(null);
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      await removeMember.mutateAsync({
        organizationId,
        userId: memberToRemove.user_id,
      });
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setMemberToRemove(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No team members found.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            {canManageMembers && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => {
            const isUpdating = updatingRole === member.user_id;
            const canModify = canManageMembers && member.role !== "owner";

            return (
              <TableRow key={member.member_id}>
                <TableCell className="font-medium">{member.email}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={ROLE_BADGE_COLORS[member.role]}
                  >
                    {ROLE_LABELS[member.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={member.status === "active" ? "default" : "secondary"}
                    className={member.status === "active" ? "bg-green-500" : ""}
                  >
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(member.accepted_at)}
                </TableCell>
                {canManageMembers && (
                  <TableCell>
                    {canModify && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={isUpdating}
                          >
                            {isUpdating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreVertical className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member, "admin")}
                            disabled={member.role === "admin"}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Make Admin
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member, "leader")}
                            disabled={member.role === "leader"}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Make Leader
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRoleChange(member, "viewer")}
                            disabled={member.role === "viewer"}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Make Viewer
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setMemberToRemove(member)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {memberToRemove?.email} from the team?
              They will lose access to this organization immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMember.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
