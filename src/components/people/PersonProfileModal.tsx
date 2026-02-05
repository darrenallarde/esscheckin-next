"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Phone,
  Mail,
  GraduationCap,
  Calendar,
  Trophy,
  MessageCircle,
  UsersRound,
  Flame,
  Star,
  PhoneOff,
  Users,
  Archive,
  Trash2,
  AlertTriangle,
  Loader2,
  Send,
  Heart,
  Pencil,
  MapPin,
  Cake,
} from "lucide-react";
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
import {
  useArchiveStudent,
  useDeleteStudentPermanently,
} from "@/hooks/queries/use-profile-management";
import { useToast } from "@/hooks/use-toast";
import { Student } from "@/hooks/queries/use-students";
import { useSmsConversation } from "@/hooks/queries/use-sms-conversation";
import { usePersonHistory } from "@/hooks/queries/use-person-history";
import { ConversationThread } from "@/components/sms/ConversationThread";
import { MessageComposer } from "@/components/sms/MessageComposer";
import { PersonPastoralContent } from "./PersonPastoralContent";
import { FamilySection } from "@/components/families/FamilySection";
import { ParentChildrenTab } from "./ParentChildrenTab";
import { InviteGuardianModal } from "./InviteGuardianModal";
import { EditPersonModal } from "./EditPersonModal";
import { RoleBadge, ClaimedBadge } from "./RoleBadge";
import { useOrganization } from "@/hooks/useOrganization";
import type { OrgRole } from "@/hooks/queries/use-people";

// Extended Student type that includes role information
interface ExtendedStudent extends Student {
  role?: OrgRole;
  is_claimed?: boolean;
  linked_children_count?: number;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  instagram_handle?: string | null;
}

interface PersonProfileModalProps {
  person: ExtendedStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendText?: (person: Student) => void;
  organizationId?: string;
}

// Green gradient theme matching BelongingSpectrum
const belongingStatusColors: Record<string, string> = {
  "Ultra-Core": "bg-green-700 text-white",
  "Core": "bg-green-500 text-white",
  "Connected": "bg-green-400 text-gray-800",
  "On the Fringe": "bg-green-300 text-gray-800",
  "Missing": "bg-green-200 text-gray-600",
};

const rankEmojis: Record<string, string> = {
  "Newcomer": "🌱",
  "Regular": "🛡️",
  "Devoted": "⚔️",
  "Champion": "👑",
  "Legend": "🌟",
};

// Determine profile type based on role
type ProfileType = "student" | "team" | "guardian";

function getProfileType(role?: string): ProfileType {
  if (!role || role === "student") return "student";
  if (role === "guardian") return "guardian";
  return "team";
}

export function PersonProfileModal({
  person,
  open,
  onOpenChange,
  onSendText,
  organizationId,
}: PersonProfileModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const { toast } = useToast();
  const { userRole, isSuperAdmin } = useOrganization();

  // Check if current user is an admin
  const isAdmin = isSuperAdmin || userRole === "owner" || userRole === "admin";

  const { data: messages, isLoading: messagesLoading } = useSmsConversation(
    open && person ? person.id : null
  );

  const { data: personHistory, isLoading: historyLoading } = usePersonHistory(
    open && person ? person.id : null,
    open && !!person
  );

  const archiveStudent = useArchiveStudent();
  const deleteStudent = useDeleteStudentPermanently();

  const handleArchive = async () => {
    if (!person || !organizationId) return;
    try {
      await archiveStudent.mutateAsync({
        profileId: person.id,
        organizationId,
      });
      toast({
        title: "Person archived",
        description: `${person.first_name} has been archived.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to archive:", error);
      toast({
        title: "Error",
        description: "Failed to archive. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentDelete = async () => {
    if (!person || !organizationId) return;
    try {
      const result = await deleteStudent.mutateAsync({
        profileId: person.id,
        organizationId,
      });
      toast({
        title: "Person deleted",
        description: result.message || "Person has been permanently deleted.",
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete:", error);
      toast({
        title: "Error",
        description: "Failed to delete. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!person) return null;

  const fullName = `${person.first_name} ${person.last_name}`;
  const belongingStatus = getBelongingStatus(person.days_since_last_check_in);
  const profileType = getProfileType(person.role || person.user_type || undefined);
  const isGuardian = profileType === "guardian";
  const isStudent = profileType === "student";
  const isTeam = profileType === "team";
  const isUnclaimed = person.is_claimed === false;

  // Determine which tabs to show based on profile type
  const showEngagement = isStudent || (isTeam && person.total_check_ins > 0);
  const showPastoral = isStudent;
  const showFamily = isStudent;
  const showChildren = isGuardian;
  const showGroups = isStudent || isTeam;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span>{fullName}</span>
                  {/* Role badge for non-students */}
                  {!isStudent && person.role && (
                    <RoleBadge role={person.role} size="sm" />
                  )}
                  {/* Grade for students */}
                  {isStudent && person.grade && (
                    <Badge variant="secondary">Grade {person.grade}</Badge>
                  )}
                  {/* Claimed status for guardians */}
                  {isGuardian && (
                    <ClaimedBadge isClaimed={!isUnclaimed} size="sm" />
                  )}
                </div>
                {/* Status line for students */}
                {isStudent && (
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={belongingStatusColors[belongingStatus] || "bg-gray-500"}>
                      {belongingStatus}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {rankEmojis[person.current_rank] || "🌱"} {person.current_rank}
                    </span>
                  </div>
                )}
                {/* Children count for guardians */}
                {isGuardian && person.linked_children_count !== undefined && person.linked_children_count > 0 && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Heart className="h-3.5 w-3.5" />
                    <span>
                      {person.linked_children_count} {person.linked_children_count === 1 ? "child" : "children"}
                    </span>
                  </div>
                )}
              </div>
            </DialogTitle>
            {/* Edit button - visible only to admins */}
            {isAdmin && organizationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEditModal(true)}
                className="shrink-0"
              >
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Invite to Claim button for unclaimed guardians */}
        {isGuardian && isUnclaimed && organizationId && (
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowInviteModal(true)}
              className="w-full"
            >
              <Send className="h-4 w-4 mr-2" />
              Invite to Claim Profile
            </Button>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          {/* Dynamic tab list based on profile type */}
          <TabsList className={`grid w-full ${getTabsGridCols(profileType, showEngagement)}`}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            {showChildren && (
              <TabsTrigger value="children" className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Children</span>
              </TabsTrigger>
            )}
            {showFamily && (
              <TabsTrigger value="family" className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Family</span>
              </TabsTrigger>
            )}
            {showEngagement && (
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            )}
            {showPastoral && (
              <TabsTrigger value="pastoral">Pastoral</TabsTrigger>
            )}
            {showGroups && (
              <TabsTrigger value="groups">Groups</TabsTrigger>
            )}
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="mt-4">
            {person.phone_number ? (
              <div className="flex flex-col h-[400px]">
                <ConversationThread
                  messages={messages || []}
                  loading={messagesLoading}
                  className="flex-1 min-h-0 -mx-2"
                />
                <div className="border-t pt-3 mt-2">
                  <MessageComposer
                    studentId={person.id}
                    phoneNumber={person.phone_number}
                    personName={person.first_name}
                  />
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <PhoneOff className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No phone number on file</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Add a phone number to send text messages
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Quick Demographics for Students */}
            {isStudent && (
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                    {/* Age */}
                    <div>
                      <p className="text-2xl font-bold">
                        {person.date_of_birth ? calculateAge(person.date_of_birth) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Age</p>
                    </div>
                    {/* Grade */}
                    <div>
                      <p className="text-2xl font-bold">{person.grade || "—"}</p>
                      <p className="text-xs text-muted-foreground">Grade</p>
                    </div>
                    {/* Gender */}
                    <div>
                      <p className="text-2xl font-bold capitalize">
                        {person.gender ? (person.gender === "male" ? "M" : "F") : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">Gender</p>
                    </div>
                    {/* Check-ins */}
                    <div>
                      <p className="text-2xl font-bold">{person.total_check_ins}</p>
                      <p className="text-xs text-muted-foreground">Check-ins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="pt-4 space-y-3">
                {/* Contact Info */}
                {person.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`tel:${person.phone_number}`}
                      className="text-primary hover:underline"
                    >
                      {person.phone_number}
                    </a>
                  </div>
                )}
                {person.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={`mailto:${person.email}`}
                      className="text-primary hover:underline"
                    >
                      {person.email}
                    </a>
                  </div>
                )}
                {person.high_school && (
                  <div className="flex items-center gap-3">
                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    <span>{person.high_school}</span>
                  </div>
                )}
                {/* Address */}
                {(person.address || person.city) && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {[
                        person.address,
                        person.city,
                        person.state,
                        person.zip
                      ].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {/* Birthday */}
                {person.date_of_birth && (
                  <div className="flex items-center gap-3">
                    <Cake className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(person.date_of_birth).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {/* Last Check-in (for students and team who check in) */}
                {(isStudent || person.last_check_in) && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {person.last_check_in
                        ? `Last seen: ${formatLastSeen(person.days_since_last_check_in)}`
                        : "Never checked in"}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Groups */}
            {person.groups && person.groups.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <UsersRound className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Groups</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {person.groups.map((group) => (
                      <Badge
                        key={group.id}
                        variant="outline"
                        style={{
                          borderColor: group.color || undefined,
                          color: group.color || undefined,
                        }}
                      >
                        {group.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone - Archive/Delete */}
            {organizationId && (
              <Card className="border-destructive/30">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <span className="font-medium text-destructive">Danger Zone</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Archive</p>
                        <p className="text-xs text-muted-foreground">
                          Hide from lists. {isStudent ? "They can check in again to restore." : "Can be restored later."}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleArchive}
                        disabled={archiveStudent.isPending}
                      >
                        {archiveStudent.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Archive className="h-4 w-4 mr-1" />
                        )}
                        Archive
                      </Button>
                    </div>
                    <div className="border-t pt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-destructive">Permanently Delete</p>
                        <p className="text-xs text-muted-foreground">
                          Remove all data. This cannot be undone.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Children Tab (Guardians only) */}
          {showChildren && (
            <TabsContent value="children" className="mt-4">
              <ParentChildrenTab
                parentProfileId={person.id}
                onChildClick={(childId) => {
                  // Could open child's profile - for now just log
                  console.log("View child:", childId);
                }}
              />
            </TabsContent>
          )}

          {/* Family Tab (Students only) */}
          {showFamily && (
            <TabsContent value="family" className="mt-4">
              <FamilySection studentId={person.id} />
            </TabsContent>
          )}

          {/* Engagement Tab */}
          {showEngagement && (
            <TabsContent value="engagement" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Points */}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                    <p className="text-2xl font-bold">{person.total_points}</p>
                    <p className="text-sm text-muted-foreground">Total Points</p>
                  </CardContent>
                </Card>
                {/* Total Check-ins */}
                <Card>
                  <CardContent className="pt-4 text-center">
                    <Calendar className="h-8 w-8 mx-auto text-green-500 mb-2" />
                    <p className="text-2xl font-bold">{person.total_check_ins}</p>
                    <p className="text-sm text-muted-foreground">Total Check-ins</p>
                  </CardContent>
                </Card>
              </div>

              {/* Rank */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{rankEmojis[person.current_rank] || "🌱"}</span>
                      <div>
                        <p className="font-medium">{person.current_rank}</p>
                        <p className="text-sm text-muted-foreground">Current Rank</p>
                      </div>
                    </div>
                    <Star className="h-6 w-6 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              {/* Recent Check-ins */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Calendar className="h-5 w-5 text-green-500" />
                    <span className="font-medium">Recent Attendance</span>
                  </div>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : personHistory?.recentCheckIns && personHistory.recentCheckIns.length > 0 ? (
                    <div className="space-y-2">
                      {personHistory.recentCheckIns.map((checkIn) => (
                        <div key={checkIn.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <span>
                            {new Date(checkIn.checked_in_at).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          {checkIn.group_name && (
                            <Badge variant="outline" className="text-xs">
                              {checkIn.group_name}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No check-ins yet</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Interactions */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Heart className="h-5 w-5 text-pink-500" />
                    <span className="font-medium">Recent Interactions</span>
                  </div>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : personHistory?.recentInteractions && personHistory.recentInteractions.length > 0 ? (
                    <div className="space-y-2">
                      {personHistory.recentInteractions.map((interaction) => (
                        <div key={interaction.id} className="text-sm py-2 border-b last:border-0">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {interaction.interaction_type.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(interaction.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                          {interaction.notes && (
                            <p className="text-muted-foreground mt-1 line-clamp-2">{interaction.notes}</p>
                          )}
                          {interaction.created_by_name && (
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              by {interaction.created_by_name}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No interactions recorded yet</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* Pastoral Tab (Students only) */}
          {showPastoral && (
            <TabsContent value="pastoral" className="mt-4">
              <PersonPastoralContent
                student={person}
                onSendText={onSendText}
              />
            </TabsContent>
          )}

          {/* Groups Tab */}
          {showGroups && (
            <TabsContent value="groups" className="space-y-4 mt-4">
              {person.groups && person.groups.length > 0 ? (
                <div className="space-y-3">
                  {person.groups.map((group) => (
                    <Card key={group.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-10 rounded"
                            style={{ backgroundColor: group.color || "#6b7280" }}
                          />
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">
                              Member
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <UsersRound className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Not in any groups yet</p>
                    <Button variant="outline" className="mt-4">
                      Add to Group
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will permanently delete <strong>{fullName}</strong> and all their data:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                {isStudent && <li>All check-in history</li>}
                {isStudent && <li>Points and achievements</li>}
                <li>SMS message history</li>
                {showGroups && <li>Group memberships</li>}
                {isStudent && <li>Pastoral notes and recommendations</li>}
                {isGuardian && <li>Links to children</li>}
              </ul>
              <p className="font-medium text-destructive mt-3">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteStudent.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={deleteStudent.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteStudent.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Guardian Modal */}
      {isGuardian && (
        <InviteGuardianModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          guardianProfileId={person.id}
          guardianName={fullName}
          guardianEmail={person.email}
          guardianPhone={person.phone_number}
        />
      )}

      {/* Edit Person Modal */}
      {organizationId && (
        <EditPersonModal
          person={person ? {
            profile_id: person.id,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            phone_number: person.phone_number,
            date_of_birth: person.date_of_birth,
            grade: person.grade,
            high_school: person.high_school,
            gender: person.gender,
            instagram_handle: person.instagram_handle,
            address: person.address,
            city: person.city,
            state: person.state,
            zip: person.zip,
            role: person.role || person.user_type || undefined,
          } : null}
          open={showEditModal}
          onOpenChange={setShowEditModal}
          organizationId={organizationId}
          onSuccess={() => {
            // Could refresh the person data here
          }}
        />
      )}
    </Dialog>
  );
}

// Helper to get grid columns based on tabs shown
function getTabsGridCols(profileType: ProfileType, showEngagement: boolean): string {
  if (profileType === "guardian") {
    // Overview, Messages, Children = 3 tabs
    return "grid-cols-3";
  }
  if (profileType === "team") {
    // Overview, Messages, Groups + possibly Engagement = 3-4 tabs
    return showEngagement ? "grid-cols-4" : "grid-cols-3";
  }
  // Student: Overview, Messages, Family, Engagement, Pastoral, Groups = 6 tabs
  return "grid-cols-6";
}

// Helper functions
function getBelongingStatus(daysSinceLastCheckIn: number | null): string {
  if (daysSinceLastCheckIn === null) return "Missing";
  if (daysSinceLastCheckIn >= 60) return "Missing";
  if (daysSinceLastCheckIn >= 30) return "On the Fringe";
  if (daysSinceLastCheckIn <= 7) return "Core";
  return "Connected";
}

function formatLastSeen(days: number | null): string {
  if (days === null) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}
