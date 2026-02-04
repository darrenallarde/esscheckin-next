"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Radio, Plus, Send, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBroadcasts, type Broadcast, type BroadcastStatus } from "@/hooks/queries/use-broadcasts";
import { useOrganization } from "@/hooks/useOrganization";
import { BroadcastComposer } from "@/components/broadcasts/BroadcastComposer";
import { formatDistanceToNow } from "date-fns";

function getStatusBadge(status: BroadcastStatus) {
  switch (status) {
    case "draft":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          Draft
        </Badge>
      );
    case "sending":
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-500/10 text-blue-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Sending
        </Badge>
      );
    case "sent":
      return (
        <Badge variant="secondary" className="gap-1 bg-green-500/10 text-green-600">
          <CheckCircle className="h-3 w-3" />
          Sent
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getAudienceSummary(broadcast: Broadcast): string {
  const parts: string[] = [];

  if (broadcast.targetType === "all") {
    parts.push("All groups");
  } else if (broadcast.targetGroupNames.length > 0) {
    parts.push(broadcast.targetGroupNames.join(", "));
  }

  const roles: string[] = [];
  if (broadcast.includeLeaders) roles.push("Leaders");
  if (broadcast.includeMembers) roles.push("Members");
  if (roles.length > 0 && roles.length < 2) {
    parts.push(`(${roles.join(" & ")} only)`);
  }

  return parts.join(" ") || "No audience";
}

function BroadcastHistoryTable({ broadcasts, loading }: { broadcasts: Broadcast[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (broadcasts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Radio className="h-12 w-12 text-muted-foreground/20 mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No broadcasts yet</h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
          Create your first broadcast to send messages to groups.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Message</TableHead>
          <TableHead>Audience</TableHead>
          <TableHead className="text-center">Recipients</TableHead>
          <TableHead className="text-center">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {broadcasts.map((broadcast) => (
          <TableRow key={broadcast.id}>
            <TableCell className="whitespace-nowrap">
              <div className="text-sm">
                {broadcast.sentAt
                  ? formatDistanceToNow(new Date(broadcast.sentAt), { addSuffix: true })
                  : formatDistanceToNow(new Date(broadcast.createdAt), { addSuffix: true })}
              </div>
              <div className="text-xs text-muted-foreground">
                by {broadcast.createdByName}
              </div>
            </TableCell>
            <TableCell>
              <div className="max-w-xs truncate text-sm">
                {broadcast.messageBody}
              </div>
            </TableCell>
            <TableCell>
              <div className="text-sm text-muted-foreground">
                {getAudienceSummary(broadcast)}
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div className="text-sm">
                {broadcast.status === "sent" ? (
                  <span>
                    <span className="text-green-600">{broadcast.sentCount}</span>
                    {broadcast.failedCount > 0 && (
                      <span className="text-destructive">
                        {" / "}{broadcast.failedCount} failed
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{broadcast.recipientCount}</span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-center">
              {getStatusBadge(broadcast.status)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function BroadcastsPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const orgId = currentOrganization?.id || null;
  const searchParams = useSearchParams();

  const { data: broadcasts, isLoading: broadcastsLoading } = useBroadcasts(orgId);
  const [composerOpen, setComposerOpen] = useState(false);

  // Parse pre-selected profile IDs from URL (from Insights "Message All" action)
  const profileIdsParam = searchParams.get("profileIds");
  const preSelectedProfileIds = profileIdsParam ? profileIdsParam.split(",").filter(Boolean) : [];

  // Auto-open composer if we have pre-selected profiles
  useEffect(() => {
    if (preSelectedProfileIds.length > 0) {
      setComposerOpen(true);
    }
  }, [preSelectedProfileIds.length]);

  const isLoading = orgLoading || broadcastsLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Page Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Radio className="h-8 w-8" />
            Broadcasts
          </h1>
          <p className="text-muted-foreground mt-1">
            Send messages to groups of students and leaders
          </p>
        </div>
        <Button onClick={() => setComposerOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Broadcast
        </Button>
      </div>

      {/* Broadcast History */}
      <div className="flex-1 overflow-auto p-6">
        <BroadcastHistoryTable
          broadcasts={broadcasts || []}
          loading={isLoading}
        />
      </div>

      {/* Broadcast Composer Sheet */}
      <BroadcastComposer
        open={composerOpen}
        onOpenChange={setComposerOpen}
        orgId={orgId}
        preSelectedProfileIds={preSelectedProfileIds.length > 0 ? preSelectedProfileIds : undefined}
      />
    </div>
  );
}
