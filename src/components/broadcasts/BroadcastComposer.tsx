"use client";

import { useState, useMemo } from "react";
import { Send, Users, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  useRecipientPreview,
  useCreateAndSendBroadcast,
  type BroadcastTargetType,
} from "@/hooks/queries/use-broadcasts";

interface BroadcastComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string | null;
}

const SMS_CHAR_LIMIT = 160;

export function BroadcastComposer({ open, onOpenChange, orgId }: BroadcastComposerProps) {
  const { toast } = useToast();
  const [targetType, setTargetType] = useState<BroadcastTargetType>("all");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [includeLeaders, setIncludeLeaders] = useState(true);
  const [includeMembers, setIncludeMembers] = useState(true);
  const [messageBody, setMessageBody] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: groups } = useGroups(orgId);
  const createAndSend = useCreateAndSendBroadcast();

  // Get recipient preview
  const { data: recipients, isLoading: recipientsLoading } = useRecipientPreview(
    orgId,
    targetType,
    targetType === "groups" ? selectedGroupIds : [],
    includeLeaders,
    includeMembers
  );

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
    (includeLeaders || includeMembers) &&
    (targetType === "all" || selectedGroupIds.length > 0) &&
    recipientCounts.total > 0;

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
        includeLeaders,
        includeMembers,
      });

      toast({
        title: "Broadcast sent",
        description: `Message sent to ${recipientCounts.total} recipient${recipientCounts.total === 1 ? "" : "s"}.`,
      });

      // Reset form
      setMessageBody("");
      setTargetType("all");
      setSelectedGroupIds([]);
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

            {/* Role Selection */}
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

            {/* Recipient Preview */}
            <div className="rounded-lg bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                {recipientsLoading ? (
                  <span className="text-muted-foreground">Calculating recipients...</span>
                ) : recipientCounts.total === 0 ? (
                  <span className="text-muted-foreground">No recipients match your criteria</span>
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

            {/* Validation Warning */}
            {!includeLeaders && !includeMembers && (
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
