"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationCard } from "./ConversationCard";
import type { SmsConversation } from "@/hooks/queries/use-sms-inbox";

interface ConversationListProps {
  conversations: SmsConversation[];
  loading?: boolean;
  selectedPhoneNumber?: string;
  onSelectConversation: (conversation: SmsConversation) => void;
}

type FilterType = "all" | "unread" | "unknown";

export function ConversationList({
  conversations,
  loading,
  selectedPhoneNumber,
  onSelectConversation,
}: ConversationListProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredConversations = conversations.filter((conv) => {
    if (filter === "unread") return conv.unreadCount > 0;
    if (filter === "unknown") return !conv.studentId;
    return true;
  });

  const unreadCount = conversations.filter((c) => c.unreadCount > 0).length;
  const unknownCount = conversations.filter((c) => !c.studentId).length;

  if (loading) {
    return (
      <div className="flex flex-col">
        {/* Filter tabs skeleton */}
        <div className="p-4 border-b border-border">
          <Skeleton className="h-10 w-full" />
        </div>
        {/* Conversation skeletons */}
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-start gap-3 p-4 border-b border-border">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <h3 className="font-medium text-lg">No messages yet</h3>
        <p className="text-muted-foreground text-sm mt-1 max-w-xs">
          When students or parents send SMS messages, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="p-3 border-b border-border bg-muted/30">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="all">
              All ({conversations.length})
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="unknown">
              Unknown ({unknownCount})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <p className="text-muted-foreground text-sm">
              No {filter === "unread" ? "unread" : filter === "unknown" ? "unknown" : ""} conversations
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <ConversationCard
              key={`${conversation.phoneNumber}-${conversation.studentId || "unknown"}`}
              conversation={conversation}
              isSelected={conversation.phoneNumber === selectedPhoneNumber}
              onClick={() => onSelectConversation(conversation)}
            />
          ))
        )}
      </div>
    </div>
  );
}
