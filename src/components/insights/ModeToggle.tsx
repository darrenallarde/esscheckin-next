"use client";

import { List, BarChart3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { OutputMode } from "@/lib/insights/types";

interface ModeToggleProps {
  currentMode: OutputMode;
  onModeChange: (mode: OutputMode) => void;
  disabled?: boolean;
}

export function ModeToggle({
  currentMode,
  onModeChange,
  disabled,
}: ModeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={currentMode}
      onValueChange={(value) => {
        if (value) onModeChange(value as OutputMode);
      }}
      disabled={disabled}
      className="justify-start"
    >
      <ToggleGroupItem value="list" aria-label="List view" className="gap-2">
        <List className="h-4 w-4" />
        <span className="text-sm">List</span>
      </ToggleGroupItem>
      <ToggleGroupItem value="chart" aria-label="Chart view" className="gap-2">
        <BarChart3 className="h-4 w-4" />
        <span className="text-sm">Chart</span>
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
