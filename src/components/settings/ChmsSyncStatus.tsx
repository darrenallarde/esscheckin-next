"use client";

import type { ChmsSyncLogEntry } from "@/hooks/queries/use-chms-connection";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

interface Props {
  history: ChmsSyncLogEntry[];
}

const SYNC_TYPE_LABELS: Record<string, string> = {
  import_people: "People Import",
  import_families: "Family Import",
  full_import: "Full Import",
  write_back: "Write-Back",
  incremental: "Incremental Sync",
  test_connection: "Connection Test",
};

function SyncStatusIcon({ entry }: { entry: ChmsSyncLogEntry }) {
  if (!entry.completed_at) {
    return <Clock className="h-4 w-4 text-yellow-500" />;
  }
  if (entry.records_failed > 0 && entry.records_created > 0) {
    return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  }
  if (entry.records_failed > 0) {
    return <XCircle className="h-4 w-4 text-red-500" />;
  }
  return <CheckCircle2 className="h-4 w-4 text-green-500" />;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChmsSyncStatus({ history }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sync History</CardTitle>
        <CardDescription>Recent sync operations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-start gap-2">
                <SyncStatusIcon entry={entry} />
                <div>
                  <p className="text-sm font-medium">
                    {SYNC_TYPE_LABELS[entry.sync_type] || entry.sync_type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(entry.started_at)}
                    {entry.trigger_method && (
                      <> &middot; {entry.trigger_method}</>
                    )}
                  </p>
                  {entry.records_processed > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {entry.records_created > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.records_created} created
                        </Badge>
                      )}
                      {entry.records_linked > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.records_linked} linked
                        </Badge>
                      )}
                      {entry.records_updated > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {entry.records_updated} updated
                        </Badge>
                      )}
                      {entry.records_skipped > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {entry.records_skipped} skipped
                        </Badge>
                      )}
                      {entry.records_failed > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {entry.records_failed} failed
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {entry.records_processed} records
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
