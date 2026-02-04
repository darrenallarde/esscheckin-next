"use client";

import { useState } from "react";
import { Loader2, Send, Mail, Phone, CheckCircle, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useInviteGuardianToClaim } from "@/hooks/queries/use-parent-links";
import { useOrganization } from "@/hooks/useOrganization";

interface InviteGuardianModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardianProfileId: string;
  guardianName: string;
  guardianEmail: string | null;
  guardianPhone: string | null;
}

export function InviteGuardianModal({
  open,
  onOpenChange,
  guardianProfileId,
  guardianName,
  guardianEmail,
  guardianPhone,
}: InviteGuardianModalProps) {
  const { currentOrganization } = useOrganization();
  const [inviteResult, setInviteResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const inviteGuardian = useInviteGuardianToClaim(currentOrganization?.id || null);

  const canInvite = guardianEmail || guardianPhone;

  const handleInvite = async () => {
    if (!currentOrganization?.id) return;

    try {
      const result = await inviteGuardian.mutateAsync({
        guardianProfileId,
        organizationId: currentOrganization.id,
      });

      setInviteResult({
        success: true,
        message: `Invitation sent to ${guardianEmail || guardianPhone}`,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to send invitation";
      setInviteResult({
        success: false,
        message,
      });
    }
  };

  const handleClose = () => {
    setInviteResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Parent to Claim Profile</DialogTitle>
          <DialogDescription>
            Send an invitation for {guardianName} to create their account and access their
            student's information.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Contact info display */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <p className="font-medium">{guardianName}</p>
              {guardianEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{guardianEmail}</span>
                </div>
              )}
              {guardianPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{guardianPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* No contact info warning */}
          {!canInvite && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This guardian has no email or phone number on file. Please add contact
                information before sending an invitation.
              </AlertDescription>
            </Alert>
          )}

          {/* Success/Error result */}
          {inviteResult && (
            <Alert variant={inviteResult.success ? "default" : "destructive"}>
              {inviteResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{inviteResult.message}</AlertDescription>
            </Alert>
          )}

          {/* What happens when invited */}
          {canInvite && !inviteResult && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>When invited, {guardianName.split(" ")[0]} will:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Receive an email with a sign-up link</li>
                <li>Create a password for their account</li>
                <li>Be able to view their children's attendance and progress</li>
                <li>Receive communications from your organization</li>
              </ul>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            {inviteResult?.success ? "Done" : "Cancel"}
          </Button>
          {!inviteResult?.success && (
            <Button
              onClick={handleInvite}
              disabled={!canInvite || inviteGuardian.isPending}
            >
              {inviteGuardian.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
