"use client";

import { cn } from "@/lib/utils";

interface StreakMeterProps {
  currentStreak: number;
  bestStreak?: number;
  size?: "sm" | "md" | "lg";
  showBest?: boolean;
}

export function StreakMeter({
  currentStreak,
  bestStreak,
  size = "md",
  showBest = false,
}: StreakMeterProps) {
  const sizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  // Generate fire emojis based on streak
  const getFireDisplay = () => {
    if (currentStreak === 0) return "💤";
    if (currentStreak === 1) return "🔥";
    if (currentStreak === 2) return "🔥🔥";
    if (currentStreak === 3) return "🔥🔥🔥";
    if (currentStreak <= 5) return "🔥🔥🔥🔥";
    if (currentStreak <= 10) return "🔥🔥🔥🔥🔥";
    return "👑🔥"; // Legend status
  };

  const getStreakColor = () => {
    if (currentStreak === 0) return "text-muted-foreground";
    if (currentStreak <= 2) return "text-amber-500";
    if (currentStreak <= 5) return "text-orange-500";
    if (currentStreak <= 10) return "text-red-500";
    return "text-purple-500";
  };

  return (
    <div className={cn("flex items-center gap-1", sizeClasses[size])}>
      <span>{getFireDisplay()}</span>
      <span className={cn("font-bold", getStreakColor())}>
        {currentStreak}
      </span>
      <span className="text-muted-foreground">
        {currentStreak === 1 ? "week" : "weeks"}
      </span>
      {showBest && bestStreak !== undefined && bestStreak > currentStreak && (
        <span className="text-xs text-muted-foreground ml-1">
          (best: {bestStreak})
        </span>
      )}
    </div>
  );
}
