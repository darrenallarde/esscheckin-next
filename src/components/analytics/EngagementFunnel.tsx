"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RankDistribution } from "@/hooks/queries/use-gamification";
import { cn } from "@/lib/utils";

interface EngagementFunnelProps {
  data: RankDistribution[];
  loading?: boolean;
}

export function EngagementFunnel({ data, loading = false }: EngagementFunnelProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Engagement Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0) || 1;
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Reverse order so Legend is at top, Newcomer at bottom (funnel shape)
  const funnelData = [...data].reverse();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Engagement Funnel</CardTitle>
        <p className="text-sm text-muted-foreground">Students by rank</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {funnelData.map((rank, index) => {
            const percentage = Math.round((rank.count / total) * 100);
            const widthPercentage = Math.max((rank.count / maxCount) * 100, 15);

            return (
              <div key={rank.rank} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{rank.emoji}</span>
                    <span className="font-medium">{rank.rank}</span>
                  </div>
                  <div className="text-muted-foreground">
                    <span className="font-medium" style={{ color: rank.color }}>
                      {rank.count}
                    </span>{" "}
                    ({percentage}%)
                  </div>
                </div>
                <div className="h-6 w-full rounded-lg bg-muted/50 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-lg transition-all duration-500",
                      "flex items-center justify-center"
                    )}
                    style={{
                      width: `${widthPercentage}%`,
                      backgroundColor: rank.color,
                      opacity: 0.8 + (index * 0.03), // Slightly more opaque as we go up
                    }}
                  >
                    {rank.count > 0 && (
                      <span className="text-xs font-medium text-white drop-shadow">
                        {rank.count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Students</span>
            <span className="font-bold">{total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
