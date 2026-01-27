"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useLogInteraction } from "@/hooks/queries/use-ai-recommendations";
import { useToast } from "@/hooks/use-toast";
import {
  InteractionType,
  InteractionStatus,
  INTERACTION_TYPE_CONFIG,
} from "@/types/interactions";
import { MessageSquare, Phone, Instagram, Users, Mail, FileText, Loader2 } from "lucide-react";

interface LogInteractionFormProps {
  studentId: string;
  studentName: string;
  recommendationId?: string;
  onSuccess: () => void;
  onCancel: () => void;
  prefilledContent?: string;
  prefilledType?: InteractionType;
}

const INTERACTION_TYPES: { type: InteractionType; icon: React.ReactNode }[] = [
  { type: "text", icon: <MessageSquare className="w-4 h-4" /> },
  { type: "call", icon: <Phone className="w-4 h-4" /> },
  { type: "instagram_dm", icon: <Instagram className="w-4 h-4" /> },
  { type: "in_person", icon: <Users className="w-4 h-4" /> },
  { type: "parent_contact", icon: <Phone className="w-4 h-4" /> },
  { type: "email", icon: <Mail className="w-4 h-4" /> },
  { type: "other", icon: <FileText className="w-4 h-4" /> },
];

const LogInteractionForm: React.FC<LogInteractionFormProps> = ({
  studentId,
  studentName,
  recommendationId,
  onSuccess,
  onCancel,
  prefilledContent = "",
  prefilledType,
}) => {
  const [interactionType, setInteractionType] = useState<InteractionType>(prefilledType || "text");
  const [content, setContent] = useState(prefilledContent);
  const [outcome, setOutcome] = useState("");
  const [status, setStatus] = useState<InteractionStatus>("completed");
  const [needsFollowUp, setNeedsFollowUp] = useState(false);

  const logInteraction = useLogInteraction();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await logInteraction.mutateAsync({
        studentId,
        interactionType,
        content: content || undefined,
        outcome: outcome || undefined,
        status: needsFollowUp ? "pending" : status,
        recommendationId,
        followUpDate: needsFollowUp
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
          : undefined,
      });

      toast({
        title: "Interaction logged",
        description: `${INTERACTION_TYPE_CONFIG[interactionType].label} with ${studentName} recorded.`,
      });

      onSuccess();
    } catch (error) {
      console.error("Error logging interaction:", error);
      toast({
        title: "Error",
        description: "Failed to log interaction. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Interaction Type Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">How did you reach out?</Label>
        <div className="grid grid-cols-4 gap-2">
          {INTERACTION_TYPES.map(({ type, icon }) => {
            const config = INTERACTION_TYPE_CONFIG[type];
            const isSelected = interactionType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setInteractionType(type)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all ${
                  isSelected
                    ? "border-primary bg-primary/10"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <span className={`p-1.5 rounded-full ${config.color}`}>
                  {icon}
                </span>
                <span className="text-xs font-medium truncate w-full text-center">
                  {config.label.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* What happened */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm font-medium">
          What did you say/do? <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="e.g., 'Hey! We missed you at youth group...'"
          className="min-h-[80px] resize-none"
        />
      </div>

      {/* Outcome */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">What was the outcome?</Label>
        <RadioGroup
          value={status}
          onValueChange={(value) => setStatus(value as InteractionStatus)}
          className="flex flex-wrap gap-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="completed" id="completed" />
            <Label htmlFor="completed" className="text-sm cursor-pointer">
              Had a conversation
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="pending" id="pending" />
            <Label htmlFor="pending" className="text-sm cursor-pointer">
              Waiting for response
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no_response" id="no_response" />
            <Label htmlFor="no_response" className="text-sm cursor-pointer">
              No response
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Outcome notes if completed */}
      {status === "completed" && (
        <div className="space-y-2">
          <Label htmlFor="outcome" className="text-sm font-medium">
            How did it go? <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="outcome"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="e.g., 'Seemed happy to hear from me. Said they've been busy with school.'"
            className="min-h-[60px] resize-none"
          />
        </div>
      )}

      {/* Follow-up reminder */}
      {status === "pending" && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="followUp"
            checked={needsFollowUp}
            onCheckedChange={(checked) => setNeedsFollowUp(checked as boolean)}
          />
          <Label htmlFor="followUp" className="text-sm cursor-pointer">
            Remind me to follow up in 3 days
          </Label>
        </div>
      )}

      {/* Recommendation connection */}
      {recommendationId && (
        <div className="text-xs text-muted-foreground bg-purple-50 p-2 rounded">
          This will mark the AI recommendation as completed.
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={logInteraction.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1"
          disabled={logInteraction.isPending}
        >
          {logInteraction.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Log Interaction"
          )}
        </Button>
      </div>
    </form>
  );
};

export default LogInteractionForm;
