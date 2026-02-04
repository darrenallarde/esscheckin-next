"use client";

import { useEffect } from "react";
import { User, MessageCircle, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConversationThread } from "@/components/sms/ConversationThread";
import { MessageComposer } from "@/components/sms/MessageComposer";
import { useSmsConversation } from "@/hooks/queries/use-sms-conversation";
import { useMarkConversationRead } from "@/hooks/queries/use-sms-inbox";
import type { SmsConversation } from "@/hooks/queries/use-sms-inbox";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useOrganization } from "@/hooks/useOrganization";
import { orgPath } from "@/lib/navigation";

interface ConversationPanelProps {
  conversation: SmsConversation;
  onClose?: () => void;
  className?: string;
}

function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/^\+1/, "").replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function ConversationPanel({
  conversation,
  onClose,
  className,
}: ConversationPanelProps) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id;
  const orgSlug = currentOrganization?.slug;

  // Use profileId if available, fallback to studentId
  const recipientId = conversation.profileId || conversation.studentId;

  // Fetch full message history (hook supports both profile_id and student_id)
  const { data: messages, isLoading: messagesLoading } = useSmsConversation(recipientId);

  const markRead = useMarkConversationRead();

  const isUnknownContact = !recipientId;

  // Mark as read when conversation is opened
  useEffect(() => {
    if (orgId && conversation.unreadCount > 0) {
      markRead.mutate({
        orgId,
        phoneNumber: conversation.phoneNumber,
        studentId: recipientId,
      });
    }
  }, [conversation.phoneNumber, recipientId, conversation.unreadCount, orgId, markRead]);

  return (
    <div className={cn("flex flex-col h-full bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              isUnknownContact
                ? "bg-amber-100 text-amber-600"
                : "bg-primary/10 text-primary"
            )}
          >
            {isUnknownContact ? (
              <MessageCircle className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
          </div>

          {/* Name and phone */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold truncate">
                {conversation.studentName || "Unknown Contact"}
              </h2>
              {isUnknownContact && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  Unknown
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatPhoneNumber(conversation.phoneNumber)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Link to student profile if known */}
          {recipientId && orgSlug && (
            <Link href={orgPath(orgSlug, `/people?studentId=${recipientId}`)}>
              <Button variant="ghost" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Profile
              </Button>
            </Link>
          )}

          {/* Close button */}
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Unknown contact banner */}
      {isUnknownContact && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">
            This number isn't linked to any student in your database. Messages will still be delivered.
          </p>
        </div>
      )}

      {/* Messages */}
      {recipientId ? (
        <>
          <ConversationThread
            messages={messages || []}
            loading={messagesLoading}
            className="flex-1 min-h-0"
          />

          {/* Composer */}
          <div className="border-t border-border p-4">
            <MessageComposer
              studentId={recipientId}
              phoneNumber={conversation.phoneNumber}
              personName={conversation.studentName?.split(" ")[0]}
            />
          </div>
        </>
      ) : (
        // Unknown contact - show messages from sms_messages directly (not student-based)
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <h3 className="font-medium">Unknown Contact</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            This number isn't linked to a student record. To view the full conversation and send replies, match this contact to a student.
          </p>
          <Button variant="outline" className="mt-4" disabled>
            Match to Student (Coming Soon)
          </Button>
        </div>
      )}
    </div>
  );
}
