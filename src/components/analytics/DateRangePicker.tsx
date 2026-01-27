"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar, ChevronDown } from "lucide-react";
import { DATE_RANGE_PRESETS } from "@/hooks/queries/use-attendance-data";

interface DateRangePickerProps {
  selectedWeeks: number;
  onSelect: (weeks: number) => void;
}

export function DateRangePicker({ selectedWeeks, onSelect }: DateRangePickerProps) {
  const selectedPreset = DATE_RANGE_PRESETS.find((p) => p.weeks === selectedWeeks);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          {selectedPreset?.label || "Select range"}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {DATE_RANGE_PRESETS.map((preset) => (
          <DropdownMenuItem
            key={preset.weeks}
            onClick={() => onSelect(preset.weeks)}
            className={selectedWeeks === preset.weeks ? "bg-accent" : ""}
          >
            {preset.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
