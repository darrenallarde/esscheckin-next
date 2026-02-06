"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Send, Users, Loader2, AlertCircle, Search, X, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useGroups } from "@/hooks/queries/use-groups";
import { useOrgContacts, type OrgContact } from "@/hooks/queries/use-org-contacts";
import {
  useRecipientPreview,
  useRecipientsByProfileIds,
  useCreateAndSendBroadcast,
  type BroadcastTargetType,
  type BroadcastRecipient,
} from "@/hooks/queries/use-broadcasts";

interface BroadcastComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | null;
  preSelectedProfileIds?: string[];
}

const SMS_CHAR_LIMIT = 160;
const DRAFT_STORAGE_KEY = "broadcast-draft-message";

export function BroadcastComposer({ open, onOpenChange, orgId, preSelectedProfileIds }: BroadcastComposerProps) {
  const { toast } = useToast();

  // When we have pre-selected profiles from Insights, default to "profiles"
  const hasPreSelectedProfiles = preSelectedProfileIds && preSelectedProfileIds.length > 0;
  const [targetType, setTargetType] = useState<BroadcastTargetType>(
    hasPreSelectedProfiles ? "profiles" : "all"
  );
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [includeLeaders, setIncludeLeaders] = useState(true);
  const [includeMembers, setIncludeMembers] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Message body with localStorage persistence
  const [messageBody, setMessageBody] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(DRAFT_STORAGE_KEY) || "";
    }
    return "";
  });

  // Persist message to localStorage on change
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (messageBody) {
        localStorage.setItem(DRAFT_STORAGE_KEY, messageBody);
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, [messageBody]);

  // Manual people picker state
  const [manualContacts, setManualContacts] = useState<OrgContact[]>([]);
  const [peopleSearch, setPeopleSearch] = useState("");

  const { data: groups } = useGroups(orgId);
  const { data: allContacts, isLoading: contactsLoading } = useOrgContacts(orgId);
  const createAndSend = useCreateAndSendBroadcast();

  // Combine pre-selected + manually picked profile IDs
  const allSelectedProfileIds = useMemo(() => {
    const manual = manualContacts.map((c) => c.id);
    if (hasPreSelectedProfiles) {
      // Merge, dedup
      return [...new Set([...preSelectedProfileIds, ...manual])];
    }
    return manual;
  }, [preSelectedProfileIds, hasPreSelectedProfiles, manualContacts]);

  // Filter contacts for people search
  const filteredContacts = useMemo(() => {
    if (!allContacts || !peopleSearch.trim()) return [];
    const selectedIds = new Set(allSelectedProfileIds);
    const q = peopleSearch.toLowerCase();
    return allContacts
      .filter((c) => !selectedIds.has(c.id))
      .filter(
        (c) =>
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.phoneNumber.includes(peopleSearch.trim())
      )
      .slice(0, 15);
  }, [allContacts, peopleSearch, allSelectedProfileIds]);

  const handleAddContact = useCallback((contact: OrgContact) => {
    setManualContacts((prev) => {
      if (prev.some((c) => c.id === contact.id)) return prev;
      return [...prev, contact];
    });
    setPeopleSearch("");
  }, []);

  const handleRemoveContact = useCallback((contactId: string) => {
    setManualContacts((prev) => prev.filter((c) => c.id !== contactId));
  }, []);

  // Get recipient preview for group-based targeting
  const { data: groupRecipients, isLoading: groupRecipientsLoading } = useRecipientPreview(
    orgId,
    targetType,
    targetType === "groups" ? selectedGroupIds : [],
    includeLeaders,
    includeMembers
  );

  // Get recipients by profile IDs when using "profiles" target type
  const { data: profileRecipients, isLoading: profileRecipientsLoading } = useRecipientsByProfileIds(
    orgId,
    targetType === "profiles" ? allSelectedProfileIds : []
  );

  // Determine which recipients to use based on target type
  const recipients: BroadcastRecipient[] | undefined = targetType === "profiles"
    ? profileRecipients
    : groupRecipients;
  const recipientsLoading = targetType === "profiles"
    ? profileRecipientsLoading
    : groupRecipientsLoading;

  // Count by role
  const recipientCounts = useMemo(() => {
    if (!recipients) return { leaders: 0, members: 0, total: 0 };
    const leaders = recipients.filter((r) => r.role === "leader").length;
    const members = recipients.filter((r) => r.role === "member").length;
    return { leaders, members, total: recipients.length };
  }, [recipients]);

  // Character count
  const charCount = messageBody.length;
  const isOverLimit = charCount > SMS_CHAR_LIMIT;

  // Validation
  const isValid =
    messageBody.trim().length > 0 &&
    !isOverLimit &&
    recipientCounts.total > 0 &&
    (
      targetType === "profiles" ||
      (
        (includeLeaders || includeMembers) &&
        (targetType === "all" || selectedGroupIds.length > 0)
      )
    );

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSend = async () => {
    if (!orgId || !isValid) return;

    try {
      await createAndSend.mutateAsync({
        orgId,
        messageBody: messageBody.trim(),
        targetType,
        targetGroupIds: targetType === "groups" ? selectedGroupIds : [],
        targetProfileIds: targetType === "profiles" ? allSelectedProfileIds : [],
        includeLeaders,
        includeMembers,
      });

      toast({
        title: "Broadcast sent",
        description: `Message sent to ${recipientCounts.total} recipient${recipientCounts.total === 1 ? "" : "s"}.`,
      });

      // Reset form and clear draft
      setMessageBody("");
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setTargetType(hasPreSelectedProfiles ? "profiles" : "all");
      setSelectedGroupIds([]);
      setManualContacts([]);
      setPeopleSearch("");
      setIncludeLeaders(true);
      setIncludeMembers(true);
      setConfirmOpen(false);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Failed to send",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>New Broadcast</SheetTitle>
            <SheetDescription>
              Send a message to multiple recipients at once.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Target Selection */}
            <div className="space-y-3">
              <Label>Target Audience</Label>
              <RadioGroup
                value={targetType}
                onValueChange={(v) => setTargetType(v as BroadcastTargetType)}
                className="gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="profiles" id="target-people" />
                  <Label htmlFor="target-people" className="font-normal cursor-pointer">
                    Select people
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="target-all" />
                  <Label htmlFor="target-all" className="font-normal cursor-pointer">
                    All groups
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="groups" id="target-groups" />
                  <Label htmlFor="target-groups" className="font-normal cursor-pointer">
                    Select groups
                  </Label>
                </div>
              </RadioGroup>

              {/* People Picker */}
              {targetType === "profiles" && (
                <div className="space-y-3 ml-6 border-l-2 border-muted pl-4">
                  {/* Pre-selected from Insights */}
                  {hasPreSelectedProfiles && (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        {preSelectedProfileIds.length} people from Insights query
                      </p>
                    </div>
                  )}

                  {/* Selected people chips */}
                  {manualContacts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {manualContacts.map((contact) => (
                        <Badge
                          key={contact.id}
                          variant="secondary"
                          className="flex items-center gap-1 pr-1"
                        >
                          {contact.firstName} {contact.lastName}
                          <button
                            onClick={() => handleRemoveContact(contact.id)}
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
                      value={peopleSearch}
                      onChange={(e) => setPeopleSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  {/* Search results */}
                  {peopleSearch.trim() && (
                    <div className="border rounded-md max-h-48 overflow-y-auto">
                      {contactsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredContacts.length === 0 ? (
                        <div className="py-4 text-center text-sm text-muted-foreground">
                          No contacts found
                        </div>
                      ) : (
                        filteredContacts.map((contact) => (
                          <button
                            key={contact.id}
                            onClick={() => handleAddContact(contact)}
                            className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left border-b last:border-b-0"
                          >
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-sm">
                                {contact.firstName} {contact.lastName}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {contact.role}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Group Selection */}
              {targetType === "groups" && (
                <div className="ml-6 space-y-2 border-l-2 border-muted pl-4">
                  {groups && groups.length > 0 ? (
                    groups.map((group) => (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedGroupIds.includes(group.id)}
                          onCheckedChange={() => handleGroupToggle(group.id)}
                        />
                        <Label
                          htmlFor={`group-${group.id}`}
                          className="font-normal cursor-pointer text-sm"
                        >
                          {group.name}
                          <span className="text-muted-foreground ml-1">
                            ({group.member_count} members)
                          </span>
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No groups available</p>
                  )}
                </div>
              )}
            </div>

            {/* Role Selection - only for group-based targeting */}
            {(targetType === "all" || targetType === "groups") && (
              <div className="space-y-3">
                <Label>Include</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-leaders"
                      checked={includeLeaders}
                      onCheckedChange={(checked) => setIncludeLeaders(!!checked)}
                    />
                    <Label htmlFor="include-leaders" className="font-normal cursor-pointer">
                      Leaders
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-members"
                      checked={includeMembers}
                      onCheckedChange={(checked) => setIncludeMembers(!!checked)}
                    />
                    <Label htmlFor="include-members" className="font-normal cursor-pointer">
                      Members
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Recipient Preview */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                {recipientsLoading ? (
                  <span className="text-muted-foreground">Calculating recipients...</span>
                ) : recipientCounts.total === 0 ? (
                  <span className="text-muted-foreground">
                    {targetType === "profiles"
                      ? "Search and select people above"
                      : "No recipients match your criteria"}
                  </span>
                ) : (
                  <span>
                    <span className="font-medium">{recipientCounts.total}</span> recipient
                    {recipientCounts.total === 1 ? "" : "s"}
                    {recipientCounts.leaders > 0 && recipientCounts.members > 0 && (
                      <span className="text-muted-foreground">
                        {" "}({recipientCounts.leaders} leader{recipientCounts.leaders === 1 ? "" : "s"}, {recipientCounts.members} member{recipientCounts.members === 1 ? "" : "s"})
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Message Composer */}
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Type your message..."
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                rows={4}
                className={isOverLimit ? "border-destructive" : ""}
              />
              <div className="flex justify-between text-xs">
                <span className={isOverLimit ? "text-destructive" : "text-muted-foreground"}>
                  {charCount} / {SMS_CHAR_LIMIT} characters
                </span>
                {isOverLimit && (
                  <span className="text-destructive">
                    Message will be split into multiple texts
                  </span>
                )}
              </div>
            </div>

            {/* Validation Warning - only show for group targeting */}
            {(targetType === "all" || targetType === "groups") && !includeLeaders && !includeMembers && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Select at least one recipient type (Leaders or Members).
                </AlertDescription>
              </Alert>
            )}

            {/* Send Button */}
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!isValid || createAndSend.isPending}
              className="w-full gap-2"
            >
              {createAndSend.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Broadcast
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send a message to{" "}
              <span className="font-medium text-foreground">
                {recipientCounts.total} recipient{recipientCounts.total === 1 ? "" : "s"}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-muted rounded-lg p-3 text-sm mt-2">
            <p className="text-muted-foreground mb-1">Message preview:</p>
            <p className="whitespace-pre-wrap">{messageBody}</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={createAndSend.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              disabled={createAndSend.isPending}
              className="gap-2"
            >
              {createAndSend.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send Now
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
