"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { ConversationList } from "@/components/messages/ConversationList";
import { ConversationPanel } from "@/components/messages/ConversationPanel";
import { useSmsInbox, type SmsConversation } from "@/hooks/queries/use-sms-inbox";
import { useOrganization } from "@/hooks/useOrganization";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const phoneParam = searchParams.get("phone");

  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrganization?.id || null;

  const { data: conversations, isLoading: inboxLoading } = useSmsInbox(orgId);
  const [selectedConversation, setSelectedConversation] = useState<SmsConversation | null>(null);

  // Auto-select conversation from URL param
  useEffect(() => {
    if (phoneParam && conversations && conversations.length > 0 && !selectedConversation) {
      const match = conversations.find((c) => c.phoneNumber === phoneParam);
      if (match) {
        setSelectedConversation(match);
      }
    }
  }, [phoneParam, conversations, selectedConversation]);

  const isLoading = orgLoading || inboxLoading;

  // Calculate unread count for header
  const totalUnread = conversations?.reduce((sum, c) => sum + c.unreadCount, 0) || 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessageSquare className="h-8 w-8" />
            Messages
            {totalUnread > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 text-sm font-medium text-primary-foreground">
                {totalUnread}
              </span>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            View and respond to SMS conversations
          </p>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className="flex flex-1 min-h-0">
        {/* Conversation List - Left Panel */}
        <div className="w-full md:w-96 border-r border-border flex-shrink-0 overflow-hidden">
          <ConversationList
            conversations={conversations || []}
            loading={isLoading}
            selectedPhoneNumber={selectedConversation?.phoneNumber}
            onSelectConversation={setSelectedConversation}
          />
        </div>

        {/* Conversation Panel - Right Panel */}
        <div className="hidden md:flex flex-1 min-w-0">
          {selectedConversation ? (
            <ConversationPanel
              conversation={selectedConversation}
              onClose={() => setSelectedConversation(null)}
              className="w-full"
            />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 p-8 text-center">
              <MessageSquare className="h-16 w-16 text-muted-foreground/20 mb-4" />
              <h2 className="text-xl font-medium text-muted-foreground">
                Select a conversation
              </h2>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-xs">
                Choose a conversation from the list to view messages and send replies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Show conversation in modal/sheet when selected */}
      {selectedConversation && (
        <div className="fixed inset-0 z-50 bg-background md:hidden">
          <ConversationPanel
            conversation={selectedConversation}
            onClose={() => setSelectedConversation(null)}
            className="h-full"
          />
        </div>
      )}
    </div>
  );
}
