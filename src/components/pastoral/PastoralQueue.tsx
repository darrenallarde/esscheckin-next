"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Heart, Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface PastoralRecommendation {
  id: string;
  student_id: string;
  student_name: string;
  reason: string;
  priority: "high" | "medium" | "low";
  last_seen: string | null;
  days_absent: number;
  created_at: string;
}

interface PastoralQueueProps {
  data: PastoralRecommendation[];
  loading?: boolean;
  viewAllHref?: string;
}

const priorityConfig = {
  high: {
    label: "Urgent",
    variant: "destructive" as const,
    icon: AlertTriangle,
  },
  medium: {
    label: "Follow Up",
    variant: "secondary" as const,
    icon: Clock,
  },
  low: {
    label: "Check In",
    variant: "outline" as const,
    icon: Heart,
  },
};

export function PastoralQueue({
  data,
  loading = false,
  viewAllHref = "/pastoral",
}: PastoralQueueProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Heart className="h-4 w-4 text-rose-500" />
            Pastoral Care Queue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Heart className="h-4 w-4 text-rose-500" />
          Pastoral Care Queue
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href={viewAllHref}>
            View All
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.slice(0, 5).map((rec) => {
            const config = priorityConfig[rec.priority];
            const PriorityIcon = config.icon;

            return (
              <div
                key={rec.id}
                className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                {/* Priority Icon */}
                <div className="mt-0.5">
                  <PriorityIcon className="h-4 w-4 text-muted-foreground" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{rec.student_name}</span>
                    <Badge variant={config.variant} className="text-[10px] h-5">
                      {config.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {rec.reason}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {rec.last_seen
                      ? `Last seen ${formatDistanceToNow(new Date(rec.last_seen), { addSuffix: true })}`
                      : `${rec.days_absent} days absent`}
                  </p>
                </div>
              </div>
            );
          })}

          {data.length === 0 && (
            <div className="py-6 text-center">
              <Heart className="mx-auto h-8 w-8 text-green-500/50" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                All caught up!
              </p>
              <p className="text-xs text-muted-foreground">
                No students need attention right now.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
