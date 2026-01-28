"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface QuickTemplatePillsProps {
  onSelect: (text: string) => void;
  aiSuggestion?: string | null;
  personName?: string;
  className?: string;
}

const DEFAULT_TEMPLATES = [
  "We miss you! Hope to see you soon.",
  "Great seeing you this week!",
  "Praying for you today.",
  "Hey! Just checking in. How are you?",
  "Can't wait to see you Wednesday!",
];

export function QuickTemplatePills({
  onSelect,
  aiSuggestion,
  personName,
  className,
}: QuickTemplatePillsProps) {
  // Personalize templates with first name if available
  const templates = personName
    ? DEFAULT_TEMPLATES.map((t) =>
        t.replace("Hey!", `Hey ${personName}!`).replace("Hope to", `Hope to`)
      )
    : DEFAULT_TEMPLATES;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {/* AI Suggestion pill (if available) */}
      {aiSuggestion && (
        <button
          type="button"
          onClick={() => onSelect(aiSuggestion)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm",
            "bg-gradient-to-r from-purple-500/10 to-blue-500/10",
            "border border-purple-500/30 text-purple-700 dark:text-purple-300",
            "hover:border-purple-500/50 hover:bg-purple-500/15",
            "transition-all duration-200 active:scale-95",
            "max-w-full"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            {aiSuggestion.length > 40 ? aiSuggestion.slice(0, 40) + "..." : aiSuggestion}
          </span>
        </button>
      )}

      {/* Quick template pills */}
      {templates.map((template, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(template)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm",
            "bg-muted hover:bg-muted/80",
            "border border-transparent hover:border-border",
            "transition-all duration-200 active:scale-95",
            "text-muted-foreground hover:text-foreground"
          )}
        >
          {template.length > 30 ? template.slice(0, 30) + "..." : template}
        </button>
      ))}
    </div>
  );
}
