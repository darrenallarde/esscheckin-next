"use client";

import { useState, useCallback } from "react";
import { Target, Flame, ChevronRight, Check, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  useQuestBoard,
  useMiaStudents,
  useCompleteQuest,
  generateQuests,
  type Quest,
} from "@/hooks/queries/use-quests";
import { useTrack } from "@/lib/amplitude/hooks";
import { EVENTS } from "@/lib/amplitude/events";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

interface QuestBoardProps {
  organizationId: string;
  orgSlug?: string;
}

export function QuestBoard({ organizationId, orgSlug }: QuestBoardProps) {
  const router = useRouter();
  const track = useTrack();
  const { toast } = useToast();

  const { data: board, isLoading: boardLoading } = useQuestBoard(organizationId);
  const { data: miaStudents } = useMiaStudents(organizationId, 5);
  const completeQuest = useCompleteQuest();

  const { dailyQuests, priorityQuests } = generateQuests(board, miaStudents, orgSlug);

  // Calculate progress
  const completedCount = dailyQuests.filter((q) => q.completed).length;
  const totalCount = dailyQuests.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allComplete = completedCount === totalCount && totalCount > 0;

  // Handle quest completion
  const handleCompleteQuest = useCallback(async (quest: Quest) => {
    if (quest.completed || completeQuest.isPending) return;

    try {
      await completeQuest.mutateAsync({
        orgId: organizationId,
        questType: quest.id,
      });

      track(EVENTS.QUEST_COMPLETED, {
        quest_id: quest.id,
        quest_type: quest.type,
        quest_title: quest.title,
      });

      // Check if this completes all quests
      if (completedCount + 1 === totalCount) {
        // Celebrate!
        toast({
          title: "🎉 All quests complete!",
          description: board?.streak.current
            ? `You're on a ${board.streak.current + 1}-day streak!`
            : "Great work today!",
        });

        track(EVENTS.ALL_QUESTS_COMPLETED, {
          streak_count: board?.streak.current || 0,
          total_completed: totalCount,
        });
      }
    } catch (error) {
      console.error("Failed to complete quest:", error);
    }
  }, [completeQuest, organizationId, track, completedCount, totalCount, board?.streak.current]);

  // Handle quest action clicks
  const handleQuestAction = useCallback((quest: Quest, action: { type: string; path?: string; handler?: string }) => {
    track(EVENTS.QUEST_ACTION_CLICKED, {
      quest_id: quest.id,
      action_type: action.type,
      action_label: action.handler || action.path || "",
    });

    if (action.type === "navigate" && action.path) {
      router.push(action.path);
    } else if (action.type === "inline" && action.handler === "markComplete") {
      handleCompleteQuest(quest);
    } else if (action.handler === "skipQuest") {
      track(EVENTS.QUEST_SKIPPED, {
        quest_id: quest.id,
        quest_title: quest.title,
      });
      // Mark as complete to hide it
      handleCompleteQuest(quest);
    }
  }, [router, track, handleCompleteQuest]);

  if (boardLoading) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Today&apos;s Quests
          </CardTitle>
          <div className="flex items-center gap-3">
            {/* Streak indicator */}
            {board?.streak.current && board.streak.current > 0 && (
              <div className="flex items-center gap-1 text-sm font-medium text-orange-500">
                <Flame className="h-4 w-4" />
                {board.streak.current} day{board.streak.current === 1 ? "" : "s"}
              </div>
            )}
            {/* Progress */}
            <div className="flex items-center gap-2">
              <Progress value={progressPercent} className="w-20 h-2" />
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalCount}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Daily Habits */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
            Daily Habits
          </h4>
          <div className="space-y-2">
            {dailyQuests.map((quest) => (
              <QuestItem
                key={quest.id}
                quest={quest}
                onComplete={() => handleCompleteQuest(quest)}
                onAction={(action) => handleQuestAction(quest, action)}
                isPending={completeQuest.isPending}
              />
            ))}
          </div>
        </div>

        {/* Priority Actions */}
        {priorityQuests.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Priority Actions
            </h4>
            <div className="space-y-2">
              {priorityQuests.map((quest) => (
                <QuestItem
                  key={quest.id}
                  quest={quest}
                  onComplete={() => handleCompleteQuest(quest)}
                  onAction={(action) => handleQuestAction(quest, action)}
                  isPending={completeQuest.isPending}
                  expanded
                />
              ))}
            </div>
          </div>
        )}

        {/* All Done State */}
        {allComplete && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-4 text-center">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              🎉 All caught up! Great work today.
            </p>
            {board?.streak.current && board.streak.current >= 5 && (
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                You&apos;re on a {board.streak.current}-day streak!
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface QuestItemProps {
  quest: Quest;
  onComplete: () => void;
  onAction: (action: { type: string; path?: string; handler?: string }) => void;
  isPending: boolean;
  expanded?: boolean;
}

function QuestItem({ quest, onComplete, onAction, isPending, expanded }: QuestItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-colors",
        quest.completed
          ? "bg-muted/50 opacity-60 border-transparent"
          : "hover:bg-muted/30 border-border"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onComplete}
        disabled={quest.completed || isPending}
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          quest.completed
            ? "bg-primary border-primary text-primary-foreground"
            : "border-muted-foreground/30 hover:border-primary"
        )}
      >
        {quest.completed && <Check className="h-3 w-3" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-base">{quest.icon}</span>
          <span
            className={cn(
              "text-sm font-medium",
              quest.completed && "line-through text-muted-foreground"
            )}
          >
            {quest.title}
          </span>
        </div>

        {expanded && quest.description && !quest.completed && (
          <p className="text-xs text-muted-foreground mt-1 ml-7">
            {quest.description}
          </p>
        )}

        {/* Action buttons */}
        {!quest.completed && quest.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 ml-7">
            {quest.actions.map((action, idx) => (
              <Button
                key={idx}
                size="sm"
                variant={action.type === "skip" || action.handler === "skipQuest" ? "ghost" : "secondary"}
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(action);
                }}
              >
                {action.label}
                {action.type === "navigate" && <ChevronRight className="h-3 w-3 ml-1" />}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
