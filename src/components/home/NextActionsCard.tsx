"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Zap,
  Phone,
  Hand,
  Heart,
  BookOpen,
  BarChart3,
  MessageSquare,
  RefreshCw,
  ChevronRight,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orgPath } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface Suggestion {
  icon: string;
  title: string;
  description: string;
  actionType: "navigate" | "broadcast" | "modal";
  actionPath?: string;
  priority: "high" | "medium" | "low";
}

interface NextActionsCardProps {
  organizationId: string;
  orgSlug?: string;
}

const iconMap: Record<string, typeof Phone> = {
  phone: Phone,
  wave: Hand,
  heart: Heart,
  book: BookOpen,
  chart: BarChart3,
  message: MessageSquare,
  users: Users,
};

const priorityStyles: Record<string, string> = {
  high: "border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20",
  medium: "border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20",
  low: "border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/20",
};

async function fetchSuggestions(organizationId: string): Promise<Suggestion[]> {
  const response = await fetch("/api/home/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizationId }),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch suggestions");
  }

  const data = await response.json();
  return data.suggestions || [];
}

function NextActionsSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-6 w-48" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionItem({
  suggestion,
  orgSlug,
  onClick,
}: {
  suggestion: Suggestion;
  orgSlug?: string;
  onClick: () => void;
}) {
  const Icon = iconMap[suggestion.icon] || Zap;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors hover:bg-accent",
        priorityStyles[suggestion.priority]
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background shadow-sm">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{suggestion.title}</p>
        <p className="text-xs text-muted-foreground truncate">
          {suggestion.description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function NextActionsCard({ organizationId, orgSlug }: NextActionsCardProps) {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: suggestions,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["home-suggestions", organizationId],
    queryFn: () => fetchSuggestions(organizationId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleActionClick = (suggestion: Suggestion) => {
    if (suggestion.actionType === "navigate" && suggestion.actionPath) {
      router.push(orgPath(orgSlug, suggestion.actionPath));
    }
    // Future: handle broadcast and modal action types
  };

  if (isLoading) {
    return <NextActionsSkeleton />;
  }

  if (error || !suggestions || suggestions.length === 0) {
    return null; // Don't show card if no suggestions
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-primary" />
            Suggested Next Actions
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 p-0"
          >
            <RefreshCw
              className={cn("h-4 w-4", isRefreshing && "animate-spin")}
            />
            <span className="sr-only">Refresh suggestions</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <ActionItem
              key={index}
              suggestion={suggestion}
              orgSlug={orgSlug}
              onClick={() => handleActionClick(suggestion)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
