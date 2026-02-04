"use client";

import { cn } from "@/lib/utils";
import { User, MessageCircle } from "lucide-react";
import type { SmsConversation } from "@/hooks/queries/use-sms-inbox";

interface ConversationCardProps {
  conversation: SmsConversation;
  isSelected?: boolean;
  onClick?: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatPhoneNumber(phone: string): string {
  // Remove +1 prefix and format as (XXX) XXX-XXXX
  const cleaned = phone.replace(/^\+1/, "").replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function ConversationCard({
  conversation,
  isSelected,
  onClick,
}: ConversationCardProps) {
  const hasUnread = conversation.unreadCount > 0;
  const isUnknownContact = !conversation.studentId;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 border-b border-border hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent",
        hasUnread && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {/* Unread indicator */}
              {hasUnread && (
                <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
              )}

              {/* Name or phone */}
              <span
                className={cn(
                  "font-medium truncate",
                  hasUnread && "font-semibold"
                )}
              >
                {conversation.studentName || "Unknown Contact"}
              </span>
            </div>

            {/* Time */}
            <span className="text-xs text-muted-foreground shrink-0">
              {formatTime(conversation.lastMessageAt)}
            </span>
          </div>

          {/* Phone number */}
          <p className="text-sm text-muted-foreground truncate">
            {formatPhoneNumber(conversation.phoneNumber)}
          </p>

          {/* Last message preview */}
          <p
            className={cn(
              "text-sm truncate mt-1",
              hasUnread
                ? "text-foreground font-medium"
                : "text-muted-foreground"
            )}
          >
            {conversation.lastMessageDirection === "outbound" && (
              <span className="text-muted-foreground">You: </span>
            )}
            {conversation.lastMessage}
          </p>
        </div>

        {/* Unread badge */}
        {hasUnread && (
          <span className="shrink-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
            {conversation.unreadCount}
          </span>
        )}
      </div>
    </button>
  );
}
