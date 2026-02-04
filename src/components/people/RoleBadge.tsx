"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { OrgRole } from "@/hooks/queries/use-people";

// Role display configuration
const ROLE_CONFIG: Record<
  OrgRole,
  { label: string; className: string; icon?: string }
> = {
  owner: {
    label: "Owner",
    className: "bg-purple-100 text-purple-800 border-purple-200",
  },
  admin: {
    label: "Admin",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  leader: {
    label: "Leader",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  viewer: {
    label: "Viewer",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  student: {
    label: "Student",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  guardian: {
    label: "Parent",
    className: "bg-pink-100 text-pink-800 border-pink-200",
  },
};

// Status badges
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-50 text-green-700 border-green-200",
  },
  pending: {
    label: "Unregistered",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  suspended: {
    label: "Suspended",
    className: "bg-red-50 text-red-700 border-red-200",
  },
  archived: {
    label: "Archived",
    className: "bg-gray-50 text-gray-500 border-gray-200",
  },
};

interface RoleBadgeProps {
  role: OrgRole;
  status?: string;
  showStatus?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function RoleBadge({
  role,
  status = "active",
  showStatus = false,
  size = "md",
  className,
}: RoleBadgeProps) {
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.student;
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;

  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0" : "";

  // Show status badge if pending/suspended/archived
  const shouldShowStatus =
    showStatus && status && status !== "active";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Badge
        variant="outline"
        className={cn(config.className, sizeClasses)}
      >
        {config.label}
      </Badge>
      {shouldShowStatus && (
        <Badge
          variant="outline"
          className={cn(statusConfig.className, sizeClasses)}
        >
          {statusConfig.label}
        </Badge>
      )}
    </div>
  );
}

// Standalone status badge
interface StatusBadgeProps {
  status: string;
  size?: "sm" | "md";
  className?: string;
}

export function StatusBadge({
  status,
  size = "md",
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0" : "";

  return (
    <Badge
      variant="outline"
      className={cn(config.className, sizeClasses, className)}
    >
      {config.label}
    </Badge>
  );
}

// Parent indicator badge (shows when someone is a parent, regardless of role)
interface ParentIndicatorProps {
  childrenCount: number;
  size?: "sm" | "md";
  className?: string;
}

export function ParentIndicator({
  childrenCount,
  size = "md",
  className,
}: ParentIndicatorProps) {
  if (childrenCount === 0) return null;

  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0" : "";

  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-pink-50 text-pink-700 border-pink-200",
        sizeClasses,
        className
      )}
    >
      {childrenCount === 1 ? "1 Child" : `${childrenCount} Children`}
    </Badge>
  );
}

// Campus badge
interface CampusBadgeProps {
  campusName: string | null;
  size?: "sm" | "md";
  className?: string;
}

export function CampusBadge({
  campusName,
  size = "md",
  className,
}: CampusBadgeProps) {
  if (!campusName) return null;

  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0" : "";

  return (
    <Badge
      variant="outline"
      className={cn(
        "bg-slate-50 text-slate-700 border-slate-200",
        sizeClasses,
        className
      )}
    >
      {campusName}
    </Badge>
  );
}

// Claimed/Unclaimed indicator
interface ClaimedBadgeProps {
  isClaimed: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ClaimedBadge({
  isClaimed,
  size = "md",
  className,
}: ClaimedBadgeProps) {
  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0" : "";

  return (
    <Badge
      variant="outline"
      className={cn(
        isClaimed
          ? "bg-green-50 text-green-700 border-green-200"
          : "bg-yellow-50 text-yellow-700 border-yellow-200",
        sizeClasses,
        className
      )}
    >
      {isClaimed ? "Registered" : "Unregistered"}
    </Badge>
  );
}

// Export role label helper
export function getRoleLabel(role: OrgRole): string {
  return ROLE_CONFIG[role]?.label || role;
}

// Export status label helper
export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label || status;
}
