"use client";

/**
 * HomeMessageDrawer - Mobile-first messaging drawer using a vaul bottom-sheet.
 *
 * Used exclusively on the home page (/home) to keep users in-context when
 * tapping an SMS icon or conversation. Other pages navigate to /messages.
 *
 * Composes the existing ConversationThread and MessageComposer components
 * inside a Drawer, reusing all their internal logic (send, refresh, sounds).
 */

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ConversationThread } from "@/components/sms/ConversationThread";
import { MessageComposer } from "@/components/sms/MessageComposer";
import { useSmsConversation } from "@/hooks/queries/use-sms-conversation";
import { Phone } from "lucide-react";

interface HomeMessageDrawerProps {
  profileId: string | null;
  phoneNumber: string | null;
  personName: string | null;
  aiSuggestion?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
  }
  return phone;
}

export function HomeMessageDrawer({
  profileId,
  phoneNumber,
  personName,
  aiSuggestion,
  open,
  onOpenChange,
}: HomeMessageDrawerProps) {
  const { data: messages, isLoading } = useSmsConversation(
    open && profileId ? profileId : null,
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[80vh] mx-auto max-w-2xl">
        <DrawerHeader className="text-left border-b pb-3">
          <DrawerTitle>{personName || "Conversation"}</DrawerTitle>
          {phoneNumber && (
            <DrawerDescription className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(phoneNumber)}
            </DrawerDescription>
          )}
        </DrawerHeader>

        {/* Message thread - scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <ConversationThread
            messages={messages ?? []}
            loading={isLoading}
            className="h-full"
          />
        </div>

        {/* Composer - sticky at bottom */}
        {profileId && phoneNumber && (
          <div className="border-t p-3">
            <MessageComposer
              studentId={profileId}
              phoneNumber={phoneNumber}
              personName={personName ?? undefined}
              aiSuggestion={aiSuggestion}
            />
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
