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
} from "lucide-react";
import { Student } from "@/hooks/queries/use-students";
import { useSmsConversation } from "@/hooks/queries/use-sms-conversation";
import { ConversationThread } from "@/components/sms/ConversationThread";
import { MessageComposer } from "@/components/sms/MessageComposer";
import { PersonPastoralContent } from "./PersonPastoralContent";
import { FamilySection } from "@/components/families/FamilySection";

interface PersonProfileModalProps {
  person: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendText?: (person: Student) => void;
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

export function PersonProfileModal({
  person,
  open,
  onOpenChange,
  onSendText,
}: PersonProfileModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: messages, isLoading: messagesLoading } = useSmsConversation(
    open && person ? person.id : null
  );

  if (!person) return null;

  const fullName = `${person.first_name} ${person.last_name}`;
  const belongingStatus = getBelongingStatus(person.days_since_last_check_in);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>{fullName}</span>
                {person.grade && (
                  <Badge variant="secondary">Grade {person.grade}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={belongingStatusColors[belongingStatus] || "bg-gray-500"}>
                  {belongingStatus}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {rankEmojis[person.current_rank] || "🌱"} {person.current_rank}
                </span>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="family" className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Family</span>
            </TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="pastoral">Pastoral</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
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
                {/* Last Check-in */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {person.last_check_in
                      ? `Last seen: ${formatLastSeen(person.days_since_last_check_in)}`
                      : "Never checked in"}
                  </span>
                </div>
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
          </TabsContent>

          {/* Family Tab */}
          <TabsContent value="family" className="mt-4">
            <FamilySection studentId={person.id} />
          </TabsContent>

          {/* Engagement Tab */}
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

            {/* Streak placeholder - would need streak data */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-3 mb-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="font-medium">Attendance Streak</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Check-in history and streaks coming soon
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pastoral Tab */}
          <TabsContent value="pastoral" className="mt-4">
            <PersonPastoralContent
              student={person}
              onSendText={onSendText}
            />
          </TabsContent>

          {/* Groups Tab */}
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
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getBelongingStatus(daysSinceLastCheckIn: number | null): string {
  if (daysSinceLastCheckIn === null) return "Missing";
  if (daysSinceLastCheckIn >= 60) return "Missing";
  if (daysSinceLastCheckIn >= 30) return "On the Fringe";
  if (daysSinceLastCheckIn <= 7) return "Core"; // Approximation - would need 8-week data
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

