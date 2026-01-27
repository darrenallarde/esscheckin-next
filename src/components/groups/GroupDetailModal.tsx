"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, AlertCircle, Activity, Settings, UserPlus, Search, Shield } from "lucide-react";
import { Group, useGroupMembers, DAY_NAMES, formatMeetingTime } from "@/hooks/queries/use-groups";
import { StreakMeter } from "@/components/shared/StreakMeter";
import { RANKS } from "@/utils/gamificationDB";
import { formatDistanceToNow } from "date-fns";
import { GroupLeadersList } from "./GroupLeadersList";
import { AssignLeaderModal } from "./AssignLeaderModal";

interface GroupDetailModalProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStudent: () => void;
  onEditSettings: () => void;
  organizationId: string;
  canManageLeaders?: boolean;
}

export function GroupDetailModal({
  group,
  open,
  onOpenChange,
  onAddStudent,
  onEditSettings,
  organizationId,
  canManageLeaders = false,
}: GroupDetailModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: members, isLoading } = useGroupMembers(group?.id || null);

  if (!group) return null;

  const filteredMembers = members?.filter(
    (m) =>
      m.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.last_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const membersNeedingAttention = members?.filter((m) => {
    if (!m.last_check_in) return true;
    const daysSince = Math.floor(
      (Date.now() - new Date(m.last_check_in).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince >= 30;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                {group.color && (
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: group.color }}
                  />
                )}
                {group.name}
              </DialogTitle>
              <DialogDescription>
                {group.description || "No description"}
              </DialogDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onEditSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>

          {/* Meeting schedule */}
          <div className="flex flex-wrap gap-2 mt-2">
            {group.meeting_times.filter((mt) => mt.is_active).map((mt) => (
              <Badge key={mt.id} variant="secondary">
                {DAY_NAMES[mt.day_of_week]} {formatMeetingTime(mt.start_time)} - {formatMeetingTime(mt.end_time)}
              </Badge>
            ))}
          </div>
        </DialogHeader>

        <Tabs defaultValue="members" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              Members ({members?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="leaders" className="gap-2">
              <Shield className="h-4 w-4" />
              Leaders
            </TabsTrigger>
            <TabsTrigger value="attention" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Attention ({membersNeedingAttention?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 py-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={onAddStudent}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Rank</TableHead>
                      <TableHead>Streak</TableHead>
                      <TableHead>Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers?.map((member) => {
                      const rankInfo = RANKS.find((r) => r.title === member.current_rank) || RANKS[0];
                      return (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">
                            {member.first_name} {member.last_name}
                          </TableCell>
                          <TableCell>{member.grade || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              style={{
                                backgroundColor: `${rankInfo.color}20`,
                                color: rankInfo.color,
                              }}
                            >
                              {rankInfo.emoji} {member.current_rank}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <StreakMeter
                              currentStreak={member.current_streak}
                              bestStreak={member.best_streak}
                              size="sm"
                              showBest
                            />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {member.last_check_in
                              ? formatDistanceToNow(new Date(member.last_check_in), { addSuffix: true })
                              : "Never"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredMembers?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          {searchQuery ? "No members match your search" : "No members in this group yet"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="leaders" className="flex-1 overflow-auto">
            <div className="py-3">
              {canManageLeaders && (
                <div className="flex justify-end mb-4">
                  <AssignLeaderModal
                    groupId={group.id}
                    groupName={group.name}
                    organizationId={organizationId}
                  />
                </div>
              )}
              <GroupLeadersList groupId={group.id} canManage={canManageLeaders} />
            </div>
          </TabsContent>

          <TabsContent value="attention" className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : membersNeedingAttention && membersNeedingAttention.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Days Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {membersNeedingAttention.map((member) => {
                    const daysSince = member.last_check_in
                      ? Math.floor(
                          (Date.now() - new Date(member.last_check_in).getTime()) / (1000 * 60 * 60 * 24)
                        )
                      : null;
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.first_name} {member.last_name}
                        </TableCell>
                        <TableCell>
                          {member.last_check_in
                            ? formatDistanceToNow(new Date(member.last_check_in), { addSuffix: true })
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {daysSince !== null ? `${daysSince} days` : "Never attended"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="text-4xl mb-4">🎉</div>
                <p className="font-medium">All caught up!</p>
                <p className="text-sm text-muted-foreground">
                  Everyone in this group is active.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="activity" className="flex-1 overflow-auto">
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <Activity className="h-12 w-12 opacity-30 mb-4" />
              <p>Activity timeline coming soon</p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
