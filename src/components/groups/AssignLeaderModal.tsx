"use client";

import { useState } from "react";
import { Loader2, UserPlus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAvailableLeaders,
  useAssignGroupLeader,
} from "@/hooks/queries/use-group-leaders";

interface AssignLeaderModalProps {
  groupId: string;
  groupName: string;
  organizationId: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  leader: "Leader",
};

export function AssignLeaderModal({
  groupId,
  groupName,
  organizationId,
}: AssignLeaderModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"leader" | "co-leader">("leader");
  const [assigningUserId, setAssigningUserId] = useState<string | null>(null);

  const { data: availableLeaders, isLoading } = useAvailableLeaders(
    organizationId,
    groupId
  );
  const assignLeader = useAssignGroupLeader();

  const handleAssign = async (userId: string) => {
    setAssigningUserId(userId);
    try {
      await assignLeader.mutateAsync({
        groupId,
        userId,
        role: selectedRole,
      });
    } catch (error) {
      console.error("Failed to assign leader:", error);
    } finally {
      setAssigningUserId(null);
    }
  };

  const availableToAssign = availableLeaders?.filter((l) => !l.isAlreadyLeader) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Add Leader
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Assign Leader to {groupName}</DialogTitle>
          <DialogDescription>
            Select a team member to assign as a leader of this group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Assign as:</label>
            <Select
              value={selectedRole}
              onValueChange={(v) => setSelectedRole(v as "leader" | "co-leader")}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="leader">Leader</SelectItem>
                <SelectItem value="co-leader">Co-Leader</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : availableToAssign.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No available team members to assign.</p>
              <p className="text-sm mt-2">
                All eligible members are already leaders of this group, or there
                are no team members with leader/admin roles.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Org Role</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {availableToAssign.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium">{member.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => handleAssign(member.user_id)}
                        disabled={assigningUserId === member.user_id}
                      >
                        {assigningUserId === member.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Assign"
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Show already assigned leaders */}
          {availableLeaders?.some((l) => l.isAlreadyLeader) && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                Already assigned to this group:
              </p>
              <div className="flex flex-wrap gap-2">
                {availableLeaders
                  .filter((l) => l.isAlreadyLeader)
                  .map((leader) => (
                    <Badge key={leader.user_id} variant="secondary" className="gap-1">
                      <Check className="h-3 w-3" />
                      {leader.email}
                    </Badge>
                  ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
