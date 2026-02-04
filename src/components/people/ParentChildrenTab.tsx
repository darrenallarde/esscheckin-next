"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  Calendar,
  Trophy,
  GraduationCap,
  Flame,
  ChevronRight,
} from "lucide-react";
import { useParentChildren, LinkedChild } from "@/hooks/queries/use-parent-links";
import { useOrganization } from "@/hooks/useOrganization";

interface ParentChildrenTabProps {
  parentProfileId: string;
  onChildClick?: (studentProfileId: string) => void;
}

const relationshipEmoji: Record<string, string> = {
  father: "👨",
  mother: "👩",
  guardian: "👤",
  other: "👤",
};

const relationshipLabel: Record<string, string> = {
  father: "Father",
  mother: "Mother",
  guardian: "Guardian",
  other: "Guardian",
};

// Green gradient theme for belonging status (matching PersonProfileModal)
const belongingStatusColors: Record<string, string> = {
  "Ultra-Core": "bg-green-700 text-white",
  "Core": "bg-green-500 text-white",
  "Connected": "bg-green-400 text-gray-800",
  "On the Fringe": "bg-green-300 text-gray-800",
  "Missing": "bg-green-200 text-gray-600",
};

const rankEmojis: Record<string, string> = {
  "Newcomer": "🌱",
  "Regular": "🛡️",
  "Devoted": "⚔️",
  "Champion": "👑",
  "Legend": "🌟",
};

function getBelongingStatus(lastCheckIn: string | null): string {
  if (!lastCheckIn) return "Missing";
  const days = Math.floor(
    (new Date().getTime() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days >= 60) return "Missing";
  if (days >= 30) return "On the Fringe";
  if (days <= 7) return "Core";
  return "Connected";
}

function formatLastCheckIn(lastCheckIn: string | null): string {
  if (!lastCheckIn) return "Never checked in";
  const days = Math.floor(
    (new Date().getTime() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24)
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

export function ParentChildrenTab({
  parentProfileId,
  onChildClick,
}: ParentChildrenTabProps) {
  const { currentOrganization } = useOrganization();
  const { data: children, isLoading } = useParentChildren(
    parentProfileId,
    currentOrganization?.id || null
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No children linked</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Link students to this parent to see them here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Users className="h-4 w-4" />
        <span>
          {children.length} {children.length === 1 ? "child" : "children"} linked
        </span>
      </div>

      {children.map((child) => (
        <ChildCard
          key={child.student_profile_id}
          child={child}
          onClick={() => onChildClick?.(child.student_profile_id)}
        />
      ))}
    </div>
  );
}

interface ChildCardProps {
  child: LinkedChild;
  onClick?: () => void;
}

function ChildCard({ child, onClick }: ChildCardProps) {
  const fullName = `${child.first_name} ${child.last_name}`;
  const belongingStatus = getBelongingStatus(child.last_check_in);

  return (
    <Card
      className={onClick ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Name and Grade */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-base">{fullName}</span>
              {child.grade && (
                <Badge variant="secondary" className="text-xs">
                  Grade {child.grade}
                </Badge>
              )}
              {child.is_primary && (
                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                  Primary
                </Badge>
              )}
            </div>

            {/* Relationship */}
            <p className="text-sm text-muted-foreground mb-2">
              {relationshipEmoji[child.relationship]} {relationshipLabel[child.relationship]}
            </p>

            {/* Status Badge */}
            <Badge
              className={`${belongingStatusColors[belongingStatus] || "bg-gray-500"} mb-3`}
            >
              {belongingStatus}
            </Badge>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* Last Check-in */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {formatLastCheckIn(child.last_check_in)}
                </span>
              </div>

              {/* Total Check-ins */}
              <div className="flex items-center gap-2 text-sm">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span>
                  {child.total_check_ins} check-in{child.total_check_ins !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Points */}
              <div className="flex items-center gap-2 text-sm">
                <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                <span>{child.total_points} points</span>
              </div>

              {/* Rank */}
              <div className="flex items-center gap-2 text-sm">
                <span>{rankEmojis[child.current_rank] || "🌱"}</span>
                <span>{child.current_rank}</span>
              </div>
            </div>

            {/* School Info */}
            {child.high_school && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>{child.high_school}</span>
              </div>
            )}

            {/* Campus */}
            {child.campus_name && (
              <Badge variant="outline" className="mt-2 text-xs">
                {child.campus_name}
              </Badge>
            )}
          </div>

          {/* Click indicator */}
          {onClick && (
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
