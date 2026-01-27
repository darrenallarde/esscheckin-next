"use client";

import { useState } from "react";
import { Loader2, MoreVertical, UserMinus, Shield } from "lucide-react";
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
import {
  GroupLeader,
  useGroupLeaders,
  useRemoveGroupLeader,
} from "@/hooks/queries/use-group-leaders";

interface GroupLeadersListProps {
  groupId: string;
  canManage?: boolean;
}

const ROLE_LABELS: Record<string, string> = {
  leader: "Leader",
  "co-leader": "Co-Leader",
};

export function GroupLeadersList({ groupId, canManage = false }: GroupLeadersListProps) {
  const [leaderToRemove, setLeaderToRemove] = useState<GroupLeader | null>(null);

  const { data: leaders, isLoading } = useGroupLeaders(groupId);
  const removeLeader = useRemoveGroupLeader();

  const handleRemoveLeader = async () => {
    if (!leaderToRemove) return;

    try {
      await removeLeader.mutateAsync({
        groupId,
        userId: leaderToRemove.user_id,
      });
    } catch (error) {
      console.error("Failed to remove leader:", error);
    } finally {
      setLeaderToRemove(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!leaders || leaders.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Shield className="h-12 w-12 mx-auto opacity-30 mb-4" />
        <p>No leaders assigned to this group yet.</p>
        {canManage && (
          <p className="text-sm mt-2">
            Click "Add Leader" to assign team members to this group.
          </p>
        )}
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            {canManage && <TableHead className="w-10"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaders.map((leader) => (
            <TableRow key={leader.id}>
              <TableCell className="font-medium">{leader.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {ROLE_LABELS[leader.role] || leader.role}
                </Badge>
              </TableCell>
              {canManage && (
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={removeLeader.isPending}
                      >
                        {removeLeader.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setLeaderToRemove(leader)}
                        className="text-destructive focus:text-destructive"
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={!!leaderToRemove}
        onOpenChange={() => setLeaderToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Group Leader</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {leaderToRemove?.email} as a leader
              of this group? They will no longer be assigned to this group.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveLeader}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeLeader.isPending ? (
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
