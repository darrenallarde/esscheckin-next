"use client";

import { useState } from "react";
import { MoreVertical, RefreshCw, X, Loader2, Clock } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PendingInvitation,
  useResendInvitation,
  useCancelInvitation,
} from "@/hooks/queries/use-team";
import type { Database } from "@/integrations/supabase/types";

type OrgRole = Database["public"]["Enums"]["org_role"];

interface PendingInvitesListProps {
  invitations: PendingInvitation[];
  loading?: boolean;
  organizationId: string;
}

const ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  leader: "Leader",
  viewer: "Viewer",
};

export function PendingInvitesList({
  invitations,
  loading,
  organizationId,
}: PendingInvitesListProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const resendInvitation = useResendInvitation();
  const cancelInvitation = useCancelInvitation();

  const handleResend = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await resendInvitation.mutateAsync({ invitationId, organizationId });
    } catch (error) {
      console.error("Failed to resend invitation:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await cancelInvitation.mutateAsync({ invitationId, organizationId });
    } catch (error) {
      console.error("Failed to cancel invitation:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No pending invitations.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Invited By</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => {
          const isProcessing = processingId === invitation.invitation_id;
          const expired = isExpired(invitation.expires_at);

          return (
            <TableRow key={invitation.invitation_id}>
              <TableCell className="font-medium">{invitation.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {ROLE_LABELS[invitation.role]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {invitation.invited_by_email}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {expired ? (
                    <Badge variant="destructive" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Expired
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">
                      {formatDate(invitation.expires_at)}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleResend(invitation.invitation_id)}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleCancel(invitation.invitation_id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
