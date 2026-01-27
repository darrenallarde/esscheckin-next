"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import { AchievementSummary } from "@/hooks/queries/use-gamification";
import { cn } from "@/lib/utils";

interface AchievementGridProps {
  data: AchievementSummary[];
  loading?: boolean;
}

const rarityConfig = {
  common: {
    label: "Common",
    bgColor: "bg-slate-100 dark:bg-slate-800",
    borderColor: "border-slate-300 dark:border-slate-600",
    textColor: "text-slate-600 dark:text-slate-400",
  },
  rare: {
    label: "Rare",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-300 dark:border-blue-700",
    textColor: "text-blue-600 dark:text-blue-400",
  },
  epic: {
    label: "Epic",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-300 dark:border-purple-700",
    textColor: "text-purple-600 dark:text-purple-400",
  },
  legendary: {
    label: "Legendary",
    bgColor: "bg-amber-50 dark:bg-amber-950",
    borderColor: "border-amber-300 dark:border-amber-700",
    textColor: "text-amber-600 dark:text-amber-400",
  },
};

export function AchievementGrid({ data, loading = false }: AchievementGridProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-purple-500" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by rarity (legendary first) then by earned count
  const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
  const sortedData = [...data].sort((a, b) => {
    if (rarityOrder[a.rarity] !== rarityOrder[b.rarity]) {
      return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    }
    return b.earned_count - a.earned_count;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-purple-500" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedData.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Award className="mx-auto h-12 w-12 opacity-50" />
            <p className="mt-2">No achievements configured yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedData.map((achievement) => {
              const config = rarityConfig[achievement.rarity];

              return (
                <div
                  key={achievement.id}
                  className={cn(
                    "rounded-lg border-2 p-4 transition-all hover:shadow-md",
                    config.bgColor,
                    config.borderColor
                  )}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-3xl">{achievement.emoji}</span>
                    <Badge variant="outline" className={cn("text-xs", config.textColor)}>
                      {config.label}
                    </Badge>
                  </div>
                  <h3 className="mt-2 font-semibold">{achievement.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {achievement.description}
                  </p>
                  <div className="mt-3 pt-2 border-t border-current/10">
                    <span className={cn("text-sm font-medium", config.textColor)}>
                      {achievement.earned_count} earned
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
