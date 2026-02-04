"use client";

import { List, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QUICK_REPLIES, type QuickReply } from "@/lib/insights/types";

interface QuickQueryChipsProps {
  onSelect: (query: string, label: string) => void;
  disabled?: boolean;
}

export function QuickQueryChips({ onSelect, disabled }: QuickQueryChipsProps) {
  const listQueries = QUICK_REPLIES.filter((q) => q.category === "list");
  const chartQueries = QUICK_REPLIES.filter((q) => q.category === "chart");

  return (
    <div className="space-y-6">
      {/* Lists Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <List className="h-4 w-4" />
          <span>Lists</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {listQueries.map((chip) => (
            <ChipButton
              key={chip.label}
              chip={chip}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          <span>Charts</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {chartQueries.map((chip) => (
            <ChipButton
              key={chip.label}
              chip={chip}
              onSelect={onSelect}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ChipButton({
  chip,
  onSelect,
  disabled,
}: {
  chip: QuickReply;
  onSelect: (query: string, label: string) => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => onSelect(chip.query, chip.label)}
      disabled={disabled}
      className="h-auto whitespace-normal py-2 text-left"
    >
      {chip.label}
    </Button>
  );
}
