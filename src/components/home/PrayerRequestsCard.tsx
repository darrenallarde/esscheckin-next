"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { PrayerRequest } from "@/hooks/queries/use-prayer-requests";

interface PrayerRequestsCardProps {
  data: PrayerRequest[];
  loading: boolean;
  viewAllHref: string;
  maxDisplay?: number;
  onPersonClick?: (request: PrayerRequest) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function PrayerRequestsCard({
  data,
  loading,
  viewAllHref,
  maxDisplay = 4,
  onPersonClick,
}: PrayerRequestsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-rose-500" />
            Prayer Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-rose-500" />
            Prayer Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No prayer requests yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const displayed = data.slice(0, maxDisplay);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Heart className="h-4 w-4 text-rose-500" />
            Prayer Requests
          </CardTitle>
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View All
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayed.map((request) => (
          <button
            key={request.engagement_id}
            onClick={() => onPersonClick?.(request)}
            className="w-full text-left p-3 rounded-lg border border-stone-100 hover:bg-stone-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-800 truncate">
                  {request.first_name} {request.last_name}
                </p>
                <p className="text-xs text-stone-500 line-clamp-2 mt-0.5">
                  {request.prayer_request}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-xs text-muted-foreground">
                  {timeAgo(request.prayed_at)}
                </span>
                {request.response_count > 0 && (
                  <span className="text-xs text-emerald-600 font-medium mt-0.5">
                    Prayed for
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
