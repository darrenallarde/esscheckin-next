"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Heart,
  Mic,
  MicOff,
  MessageSquare,
  Check,
  Loader2,
  Play,
  Square,
  Send,
} from "lucide-react";
import {
  usePrayerRequests,
  useRespondToPrayer,
  PrayerRequest,
} from "@/hooks/queries/use-prayer-requests";
import { useOrganization } from "@/hooks/useOrganization";
import { useMyOrgProfile } from "@/hooks/queries/use-my-profile";
import {
  HomeProfileDrawer,
  HomeProfilePerson,
} from "@/components/home/HomeProfileDrawer";
import { HomeMessageDrawer } from "@/components/home/HomeMessageDrawer";
import { createClient } from "@/lib/supabase/client";

type ActiveAction = {
  engagementId: string;
  type: "voice" | "text";
} | null;

type RecordingState = "idle" | "recording" | "recorded" | "uploading";

export default function PrayerWallPage() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || null;
  const orgSlug = currentOrganization?.slug;
  const { data: profile } = useMyOrgProfile(organizationId);

  const { data: requests, isLoading } = usePrayerRequests(organizationId);
  const respondMutation = useRespondToPrayer();

  // Profile drawer state
  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] =
    useState<HomeProfilePerson | null>(null);

  // Message drawer state
  const [messageDrawerOpen, setMessageDrawerOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{
    profileId: string | null;
    phoneNumber: string | null;
    personName: string | null;
  }>({ profileId: null, phoneNumber: null, personName: null });

  // Active action (voice or text input per card)
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  // Voice recording
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioUrlRef = useRef<string | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  // Pray action — sends encouraging SMS with prayer response link
  const handlePrayForThem = async (request: PrayerRequest) => {
    if (!request.phone_number || !organizationId) return;
    const leaderName = profile?.display_name?.split(" ")[0] || "Your leader";

    // Record the prayer response
    const result = await respondMutation.mutateAsync({
      engagementId: request.engagement_id,
      responseType: "pray",
      message: `Prayed for ${request.first_name}`,
    });

    // Build prayer response link
    const responseUrl = result.response_id
      ? `${window.location.origin}/d/prayer/${result.response_id}`
      : null;

    // Send encouraging SMS with link
    const supabase = createClient();
    const smsBody = responseUrl
      ? `Hey ${request.first_name}, ${leaderName} just prayed for you. Tap to see: ${responseUrl}`
      : `Hey ${request.first_name}, ${leaderName} just prayed for your request. You are not alone. We're with you.`;

    await supabase.functions.invoke("send-sms", {
      body: {
        to: request.phone_number,
        body: smsBody,
        profileId: request.profile_id,
        organizationId,
        senderDisplayName: profile?.display_name,
      },
    });
  };

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioBlobRef.current = blob;
        audioUrlRef.current = URL.createObjectURL(blob);
        setRecordingState("recorded");
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecordingState("recording");
    } catch {
      // Mic permission denied
      setRecordingState("idle");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const sendVoicePrayer = async (request: PrayerRequest) => {
    if (!audioBlobRef.current || !organizationId) return;
    setRecordingState("uploading");

    const supabase = createClient();
    const fileName = `${request.engagement_id}_${Date.now()}.webm`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("prayer-voice-memos")
      .upload(fileName, audioBlobRef.current, { contentType: "audio/webm" });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      setRecordingState("recorded");
      return;
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("prayer-voice-memos")
      .getPublicUrl(fileName);

    const voiceUrl = publicUrl.publicUrl;

    // Record response
    const result = await respondMutation.mutateAsync({
      engagementId: request.engagement_id,
      responseType: "voice",
      voiceUrl,
    });

    // Send SMS with prayer response link (not raw voice URL)
    if (request.phone_number) {
      const leaderName = profile?.display_name?.split(" ")[0] || "Your leader";
      const responseUrl = result.response_id
        ? `${window.location.origin}/d/prayer/${result.response_id}`
        : voiceUrl;

      await supabase.functions.invoke("send-sms", {
        body: {
          to: request.phone_number,
          body: `${leaderName} recorded a prayer for you. Tap to listen: ${responseUrl}`,
          profileId: request.profile_id,
          organizationId,
          senderDisplayName: profile?.display_name,
        },
      });
    }

    // Reset
    setRecordingState("idle");
    audioUrlRef.current = null;
    audioBlobRef.current = null;
    setActiveAction(null);
  };

  const handlePersonClick = (request: PrayerRequest) => {
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

  const handleOpenMessage = (request: PrayerRequest) => {
    setSelectedConversation({
      profileId: request.profile_id,
      phoneNumber: request.phone_number,
      personName: `${request.first_name} ${request.last_name}`,
    });
    setMessageDrawerOpen(true);
  };

  const handleSendMessageFromProfile = useCallback(
    (person: HomeProfilePerson) => {
      setProfileDrawerOpen(false);
      setSelectedConversation({
        profileId: person.profile_id,
        phoneNumber: person.phone_number,
        personName: `${person.first_name} ${person.last_name}`,
      });
      setMessageDrawerOpen(true);
    },
    [],
  );

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          Prayer Wall
        </h1>
        <p className="text-muted-foreground text-lg">
          Students are trusting you with their hearts. Pray for them.
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : !requests || requests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart className="h-8 w-8 text-primary/40 mx-auto mb-3" />
            <p className="text-muted-foreground">
              No prayer requests yet. When students share prayer requests on
              their devotional page, they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request) => {
            const isPrayedFor = request.response_count > 0;
            const isVoiceActive =
              activeAction?.engagementId === request.engagement_id &&
              activeAction.type === "voice";

            return (
              <Card
                key={request.engagement_id}
                className="relative overflow-hidden"
              >
                {isPrayedFor && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      <Check className="h-3 w-3" />
                      Prayed for
                    </span>
                  </div>
                )}
                <CardContent className="p-5 space-y-3">
                  {/* Student info */}
                  <div>
                    <button
                      onClick={() => handlePersonClick(request)}
                      className="text-sm font-semibold text-foreground hover:text-foreground/70 transition-colors"
                    >
                      {request.first_name} {request.last_name}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      {request.devotional_title} &middot;{" "}
                      {formatDate(request.scheduled_date)} &middot;{" "}
                      {timeAgo(request.prayed_at)}
                    </p>
                  </div>

                  {/* Prayer text */}
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {request.prayer_request}
                  </p>

                  {/* Voice recording UI */}
                  {isVoiceActive && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      {recordingState === "idle" && (
                        <Button
                          onClick={startRecording}
                          size="sm"
                          variant="outline"
                          className="w-full"
                        >
                          <Mic className="h-4 w-4 mr-1.5 text-red-500" />
                          Tap to record
                        </Button>
                      )}
                      {recordingState === "recording" && (
                        <Button
                          onClick={stopRecording}
                          size="sm"
                          variant="destructive"
                          className="w-full"
                        >
                          <Square className="h-3 w-3 mr-1.5" />
                          Stop recording
                        </Button>
                      )}
                      {recordingState === "recorded" && (
                        <div className="space-y-2">
                          {audioUrlRef.current && (
                            <audio
                              src={audioUrlRef.current}
                              controls
                              className="w-full h-8"
                            />
                          )}
                          <div className="flex gap-2">
                            <Button
                              onClick={() => {
                                setRecordingState("idle");
                                audioUrlRef.current = null;
                                audioBlobRef.current = null;
                              }}
                              size="sm"
                              variant="outline"
                              className="flex-1"
                            >
                              Re-record
                            </Button>
                            <Button
                              onClick={() => sendVoicePrayer(request)}
                              size="sm"
                              className="flex-1 bg-primary hover:bg-primary/90"
                            >
                              <Send className="h-3.5 w-3.5 mr-1" />
                              Send
                            </Button>
                          </div>
                        </div>
                      )}
                      {recordingState === "uploading" && (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">
                            Sending prayer...
                          </span>
                        </div>
                      )}
                      <Button
                        onClick={() => {
                          setActiveAction(null);
                          setRecordingState("idle");
                        }}
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                  {/* Action buttons */}
                  {!isVoiceActive && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        onClick={() => handlePrayForThem(request)}
                        disabled={respondMutation.isPending}
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs min-h-[44px]"
                      >
                        {respondMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        ) : (
                          <Heart className="h-3.5 w-3.5 mr-1 text-primary" />
                        )}
                        Pray for them
                      </Button>
                      <Button
                        onClick={() => {
                          setActiveAction({
                            engagementId: request.engagement_id,
                            type: "voice",
                          });
                          setRecordingState("idle");
                        }}
                        size="sm"
                        variant="outline"
                        className="text-xs min-h-[44px]"
                      >
                        <Mic className="h-3.5 w-3.5 mr-1" />
                        Voice
                      </Button>
                      {request.phone_number && (
                        <Button
                          onClick={() => handleOpenMessage(request)}
                          size="sm"
                          variant="outline"
                          className="text-xs min-h-[44px]"
                        >
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          Text
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drawers */}
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
    </div>
  );
}
