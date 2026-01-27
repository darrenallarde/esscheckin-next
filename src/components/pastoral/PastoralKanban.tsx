"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MessageCircle, CheckCircle, Heart, Loader2 } from "lucide-react";
import { RecommendationCard } from "./RecommendationCard";
import {
  useAIRecommendations,
  useUpdateRecommendationStatus,
  AIRecommendation,
} from "@/hooks/queries/use-ai-recommendations";
import { useToast } from "@/hooks/use-toast";
import { RecommendationStatus, InteractionType } from "@/types/interactions";

interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  items: AIRecommendation[];
  emptyMessage: string;
  onStatusChange: (id: string, status: RecommendationStatus, notes?: string) => void;
  onLogInteraction: (rec: AIRecommendation, type: InteractionType) => void;
  loading?: boolean;
}

function KanbanColumn({
  title,
  icon,
  iconColor,
  items,
  emptyMessage,
  onStatusChange,
  onLogInteraction,
  loading = false,
}: KanbanColumnProps) {
  return (
    <Card className="flex flex-col h-full min-h-[400px]">
      <CardHeader className="pb-3 flex-shrink-0">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <div className="flex items-center gap-2">
            <span className={iconColor}>{icon}</span>
            {title}
          </div>
          <Badge variant="secondary" className="text-xs">
            {items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loading ? (
          <>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : items.length > 0 ? (
          items.map((rec) => (
            <RecommendationCard
              key={rec.id}
              recommendation={rec}
              onStatusChange={(status, notes) => onStatusChange(rec.id, status as RecommendationStatus, notes)}
              onLogInteraction={(type) => onLogInteraction(rec, type)}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <div className={`${iconColor} opacity-30`}>{icon}</div>
            <p className="text-sm text-muted-foreground mt-2">{emptyMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PastoralKanban() {
  const { data, isLoading, error } = useAIRecommendations();
  const updateStatus = useUpdateRecommendationStatus();
  const { toast } = useToast();

  const handleStatusChange = async (id: string, status: RecommendationStatus, notes?: string) => {
    try {
      await updateStatus.mutateAsync({ recommendationId: id, status, notes });

      const statusMessages: Record<RecommendationStatus, string> = {
        pending: "Moved back to needs outreach",
        accepted: "Marked as contacted",
        completed: "Marked as connected!",
        dismissed: "Recommendation dismissed",
        expired: "Recommendation expired",
      };

      toast({
        title: statusMessages[status] || "Status updated",
        description: status === "completed" ? "Great job connecting with this student!" : undefined,
      });
    } catch (error) {
      console.error("Failed to update status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLogInteraction = (rec: AIRecommendation, type: InteractionType) => {
    // This is handled by the RecommendationCard's dialog
    console.log("Log interaction:", rec.id, type);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Failed to load recommendations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 h-full">
      <KanbanColumn
        title="Needs Outreach"
        icon={<AlertCircle className="h-4 w-4" />}
        iconColor="text-red-500"
        items={data?.pending || []}
        emptyMessage="No students need outreach"
        onStatusChange={handleStatusChange}
        onLogInteraction={handleLogInteraction}
        loading={isLoading}
      />

      <KanbanColumn
        title="Contacted"
        icon={<MessageCircle className="h-4 w-4" />}
        iconColor="text-blue-500"
        items={data?.accepted || []}
        emptyMessage="No pending contacts"
        onStatusChange={handleStatusChange}
        onLogInteraction={handleLogInteraction}
        loading={isLoading}
      />

      <KanbanColumn
        title="Connected"
        icon={<CheckCircle className="h-4 w-4" />}
        iconColor="text-green-500"
        items={data?.completed || []}
        emptyMessage="Complete some outreach!"
        onStatusChange={handleStatusChange}
        onLogInteraction={handleLogInteraction}
        loading={isLoading}
      />

      <KanbanColumn
        title="No Response"
        icon={<Heart className="h-4 w-4" />}
        iconColor="text-amber-500"
        items={data?.no_response || []}
        emptyMessage="No follow-ups needed"
        onStatusChange={handleStatusChange}
        onLogInteraction={handleLogInteraction}
        loading={isLoading}
      />

      {/* Loading overlay when updating */}
      {updateStatus.isPending && (
        <div className="fixed inset-0 bg-black/10 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 shadow-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Updating...</span>
          </div>
        </div>
      )}
    </div>
  );
}
