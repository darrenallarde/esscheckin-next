"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronRight, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
  student_id: string;
  first_name: string;
  last_name: string;
  total_points: number;
  current_rank: string;
  rank_info: {
    emoji: string;
    color: string;
  };
  position: number;
}

interface LeaderboardPreviewProps {
  data: LeaderboardEntry[];
  loading?: boolean;
  viewAllHref?: string;
}

const positionStyles = [
  "bg-yellow-500/10 border-yellow-500/30", // 1st - Gold
  "bg-slate-300/10 border-slate-400/30", // 2nd - Silver
  "bg-amber-700/10 border-amber-700/30", // 3rd - Bronze
];

const positionEmojis = ["🥇", "🥈", "🥉"];

export function LeaderboardPreview({
  data,
  loading = false,
  viewAllHref = "/analytics",
}: LeaderboardPreviewProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Leaderboard
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href={viewAllHref}>
            View All
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.slice(0, 5).map((entry) => (
            <div
              key={entry.student_id}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-2 transition-colors hover:bg-accent/50",
                entry.position <= 3 && positionStyles[entry.position - 1]
              )}
            >
              {/* Position */}
              <div className="flex h-7 w-7 items-center justify-center text-lg">
                {entry.position <= 3 ? (
                  positionEmojis[entry.position - 1]
                ) : (
                  <span className="text-sm font-medium text-muted-foreground">
                    {entry.position}
                  </span>
                )}
              </div>

              {/* Name and Rank */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium truncate">
                    {entry.first_name} {entry.last_name.charAt(0)}.
                  </span>
                  <span title={entry.current_rank}>{entry.rank_info.emoji}</span>
                </div>
              </div>

              {/* Points */}
              <div className="text-right">
                <span className="font-bold" style={{ color: entry.rank_info.color }}>
                  {entry.total_points.toLocaleString()}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">pts</span>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No students yet. Check-ins will appear here!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
