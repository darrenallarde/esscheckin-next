"use client";

import { Card, CardContent } from "@/components/ui/card";
import { GroupAttendanceStat } from "@/hooks/queries/use-attendance";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupAttendanceCardProps {
  group: GroupAttendanceStat;
  onClick?: () => void;
}

// Mini sparkline component
function MiniSparkline({ data }: { data: { week: string; rate: number }[] }) {
  if (data.length === 0) return null;

  const maxRate = Math.max(...data.map((d) => d.rate), 100);
  const height = 32;
  const width = 80;
  const padding = 2;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - padding * 2);
    const y = height - padding - (d.rate / maxRate) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // Fill area under the line
  const fillPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${width - padding},${height - padding}`,
  ];
  const fillD = `M ${fillPoints.join(" L ")} Z`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Fill area */}
      <path d={fillD} fill="currentColor" opacity={0.1} />
      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {data.length > 0 && (
        <circle
          cx={width - padding}
          cy={height - padding - (data[data.length - 1].rate / maxRate) * (height - padding * 2)}
          r={3}
          fill="currentColor"
        />
      )}
    </svg>
  );
}

export function GroupAttendanceCard({ group, onClick }: GroupAttendanceCardProps) {
  // Determine color based on attendance rate
  const getColorClass = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getBgClass = (rate: number) => {
    if (rate >= 80) return "bg-green-50 border-green-200";
    if (rate >= 60) return "bg-yellow-50 border-yellow-200";
    return "bg-red-50 border-red-200";
  };

  // Calculate trend
  const getTrend = () => {
    if (group.weekly_data.length < 2) return null;

    const recent = group.weekly_data.slice(-2);
    const diff = recent[1].rate - recent[0].rate;

    if (Math.abs(diff) < 5) return { icon: Minus, text: "Stable", class: "text-muted-foreground" };
    if (diff > 0) return { icon: TrendingUp, text: `+${diff}%`, class: "text-green-600" };
    return { icon: TrendingDown, text: `${diff}%`, class: "text-red-600" };
  };

  const trend = getTrend();
  const colorClass = getColorClass(group.attendance_rate);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        getBgClass(group.attendance_rate)
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {group.color && (
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: group.color }}
                />
              )}
              <h3 className="font-semibold truncate">{group.name}</h3>
            </div>

            <div className="flex items-baseline gap-2 mb-3">
              <span className={cn("text-3xl font-bold", colorClass)}>
                {group.attendance_rate}%
              </span>
              {trend && (
                <span className={cn("flex items-center gap-0.5 text-sm", trend.class)}>
                  <trend.icon className="h-3.5 w-3.5" />
                  {trend.text}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {group.member_count} members
              </span>
              <span>·</span>
              <span>{group.unique_attendees} attended</span>
            </div>
          </div>

          {/* Sparkline */}
          <div className={cn("shrink-0", colorClass)}>
            <MiniSparkline data={group.weekly_data} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading skeleton
export function GroupAttendanceCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
            <div className="h-9 w-16 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-8 w-20 bg-muted rounded animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}
