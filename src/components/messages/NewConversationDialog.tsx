"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Send, User, X } from "lucide-react";
import { useOrgContacts, type OrgContact } from "@/hooks/queries/use-org-contacts";
import { useSendSms } from "@/hooks/useSendSms";
import { useRefreshSmsInbox } from "@/hooks/queries/use-sms-inbox";
import { useOrganization } from "@/hooks/useOrganization";
import { playSendSound } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { smsCounterText, SMS_MAX_LENGTH } from "@/lib/sms-segments";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationStarted?: (profileId: string, phoneNumber: string, name: string) => void;
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/^\+1/, "").replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  guardian: "Parent",
  leader: "Leader",
  admin: "Admin",
  owner: "Owner",
  viewer: "Viewer",
};

export function NewConversationDialog({
  open,
  onOpenChange,
  onConversationStarted,
}: NewConversationDialogProps) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.id || null;

  const { data: contacts, isLoading: contactsLoading } = useOrgContacts(orgId);
  const { sendSms, isSending } = useSendSms();
  const refreshInbox = useRefreshSmsInbox();

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrgContact[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Filter contacts by search, exclude already-selected
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    const selectedIds = new Set(selected.map((s) => s.id));
    let filtered = contacts.filter((c) => !selectedIds.has(c.id));

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.phoneNumber.includes(search.trim())
      );
    }

    return filtered.slice(0, 20); // Cap results for performance
  }, [contacts, selected, search]);

  const handleSelect = (contact: OrgContact) => {
    setSelected((prev) => [...prev, contact]);
    setSearch("");
  };

  const handleRemove = (contactId: string) => {
    setSelected((prev) => prev.filter((c) => c.id !== contactId));
  };

  const handleSend = async () => {
    if (!message.trim() || selected.length === 0 || sending) return;
    setSending(true);

    let successCount = 0;
    let firstRecipient: OrgContact | null = null;

    for (const recipient of selected) {
      const result = await sendSms({
        to: recipient.phoneNumber,
        body: message.trim(),
        profileId: recipient.id,
      });

      if (result.success) {
        successCount++;
        if (!firstRecipient) firstRecipient = recipient;
      } else {
        toast.error(`Failed to send to ${recipient.firstName} ${recipient.lastName}`);
      }
    }

    setSending(false);

    if (successCount > 0) {
      playSendSound();
      toast.success(
        successCount === 1
          ? "Message sent!"
          : `Message sent to ${successCount} people!`
      );

      if (orgId) refreshInbox(orgId);

      // Notify parent with first recipient for auto-selection
      if (firstRecipient && onConversationStarted) {
        onConversationStarted(
          firstRecipient.id,
          firstRecipient.phoneNumber,
          `${firstRecipient.firstName} ${firstRecipient.lastName}`
        );
      }

      // Reset and close
      setSelected([]);
      setMessage("");
      setSearch("");
      onOpenChange(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Selected recipients */}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((contact) => (
                <Badge
                  key={contact.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  {contact.firstName} {contact.lastName}
                  <button
                    onClick={() => handleRemove(contact.id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Contact results */}
          {search.trim() && (
            <div className="border rounded-md max-h-48 overflow-y-auto">
              {contactsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No contacts found
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleSelect(contact)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {contact.firstName} {contact.lastName}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ROLE_LABELS[contact.role] || contact.role}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatPhone(contact.phoneNumber)}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Message compose */}
          {selected.length > 0 && (
            <div className="space-y-3 mt-auto">
              <div className="relative">
                <Textarea
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={3}
                  className="resize-none pr-12"
                  disabled={sending}
                />
                {(() => {
                  const counter = smsCounterText(message);
                  return (
                    <span className={cn(
                      "absolute bottom-2 right-3 text-xs",
                      counter.isOverLimit ? "text-destructive font-medium" : counter.isMultiSegment ? "text-amber-600" : "text-muted-foreground"
                    )}>
                      {counter.text}
                    </span>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd>+
                  <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to send
                </p>
                <Button
                  onClick={handleSend}
                  disabled={!message.trim() || sending || message.length > SMS_MAX_LENGTH}
                  className={cn(
                    "gap-2",
                    sending && "opacity-70"
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send{selected.length > 1 ? ` to ${selected.length}` : ""}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
