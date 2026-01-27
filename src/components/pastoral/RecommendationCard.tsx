"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Phone,
  MoreVertical,
  CheckCircle,
  Clock,
  User,
  ChevronRight,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AIRecommendation } from "@/hooks/queries/use-ai-recommendations";
import StudentContextPanel from "./workflow/StudentContextPanel";
import LogInteractionForm from "./workflow/LogInteractionForm";
import { InteractionType } from "@/types/interactions";

interface RecommendationCardProps {
  recommendation: AIRecommendation;
  onStatusChange: (status: string, notes?: string) => void;
  onLogInteraction: (type: InteractionType) => void;
  compact?: boolean;
}

export function RecommendationCard({
  recommendation,
  onStatusChange,
  compact = false,
}: RecommendationCardProps) {
  const [showDetail, setShowDetail] = useState(false);
  const [showLogForm, setShowLogForm] = useState(false);

  const engagementColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    declining: "bg-yellow-100 text-yellow-700",
    at_risk: "bg-orange-100 text-orange-700",
    inactive: "bg-red-100 text-red-700",
  };

  const engagementColor = engagementColors[recommendation.engagement_status] || "bg-gray-100 text-gray-700";

  return (
    <>
      <Card className="group hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-3" onClick={() => setShowDetail(true)}>
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{recommendation.student_name}</p>
                {recommendation.days_since_last_seen !== null && (
                  <p className="text-xs text-muted-foreground">
                    {recommendation.days_since_last_seen === 0
                      ? "Seen today"
                      : `${recommendation.days_since_last_seen} days absent`}
                  </p>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowLogForm(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Log Interaction
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {recommendation.status === "pending" && (
                  <DropdownMenuItem onClick={() => onStatusChange("accepted")}>
                    <Clock className="h-4 w-4 mr-2" />
                    Mark as Contacted
                  </DropdownMenuItem>
                )}
                {recommendation.status !== "completed" && (
                  <DropdownMenuItem onClick={() => onStatusChange("completed")}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Connected
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onStatusChange("dismissed")}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  Dismiss
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Key Insight */}
          {!compact && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {recommendation.key_insight}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={`text-[10px] ${engagementColor}`}>
                {recommendation.engagement_status?.replace("_", " ")}
              </Badge>
              {recommendation.interaction_count > 0 && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {recommendation.interaction_count}
                </span>
              )}
            </div>
            {recommendation.assigned_to_name && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                {recommendation.assigned_to_name.split("@")[0]}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <span>{recommendation.student_name}</span>
                <p className="text-sm font-normal text-muted-foreground">
                  {recommendation.days_since_last_seen !== null
                    ? recommendation.days_since_last_seen === 0
                      ? "Seen today"
                      : `${recommendation.days_since_last_seen} days absent`
                    : "No recent check-ins"}
                </p>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">
              Pastoral care details for {recommendation.student_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* AI Insight */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🤖</div>
                <div>
                  <p className="font-medium text-purple-900">{recommendation.key_insight}</p>
                  {recommendation.action_bullets.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {recommendation.action_bullets.map((bullet, i) => (
                        <li key={i} className="text-sm text-purple-800 flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  )}
                  {recommendation.context_paragraph && (
                    <p className="text-sm text-purple-700 mt-3 pt-3 border-t border-purple-200">
                      {recommendation.context_paragraph}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowLogForm(true)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowLogForm(true)}
              >
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              {recommendation.status !== "completed" && (
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    onStatusChange("completed");
                    setShowDetail(false);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Connected
                </Button>
              )}
            </div>

            {/* Student Context Panel */}
            <StudentContextPanel
              studentId={recommendation.student_id}
              studentName={recommendation.student_name}
              recommendationId={recommendation.id}
              onInteractionLogged={() => {
                setShowLogForm(false);
              }}
            />

            {/* Metadata */}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              Generated {formatDistanceToNow(new Date(recommendation.generated_at), { addSuffix: true })}
              {recommendation.assigned_to_name && (
                <> &bull; Assigned to {recommendation.assigned_to_name}</>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Log Interaction Dialog */}
      <Dialog open={showLogForm} onOpenChange={setShowLogForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Interaction with {recommendation.student_name}</DialogTitle>
            <DialogDescription>
              Record your outreach attempt and outcome
            </DialogDescription>
          </DialogHeader>
          <LogInteractionForm
            studentId={recommendation.student_id}
            studentName={recommendation.student_name}
            recommendationId={recommendation.id}
            onSuccess={() => {
              setShowLogForm(false);
            }}
            onCancel={() => setShowLogForm(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
