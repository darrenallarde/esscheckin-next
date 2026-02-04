"use client";

import { LineChart, BarChart3 } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChartType, TimeGranularity } from "@/lib/insights/types";

interface ChartControlsProps {
  chartType: ChartType;
  granularity: TimeGranularity;
  onChartTypeChange: (type: ChartType) => void;
  onGranularityChange: (granularity: TimeGranularity) => void;
  disabled?: boolean;
}

export function ChartControls({
  chartType,
  granularity,
  onChartTypeChange,
  onGranularityChange,
  disabled,
}: ChartControlsProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Chart Type Toggle */}
      <ToggleGroup
        type="single"
        value={chartType}
        onValueChange={(value) => {
          if (value) onChartTypeChange(value as ChartType);
        }}
        disabled={disabled}
        size="sm"
      >
        <ToggleGroupItem value="line" aria-label="Line chart">
          <LineChart className="h-4 w-4" />
        </ToggleGroupItem>
        <ToggleGroupItem value="bar" aria-label="Bar chart">
          <BarChart3 className="h-4 w-4" />
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Granularity Selector */}
      <Select
        value={granularity}
        onValueChange={(value) =>
          onGranularityChange(value as TimeGranularity)
        }
        disabled={disabled}
      >
        <SelectTrigger className="w-[110px] h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="daily">Daily</SelectItem>
          <SelectItem value="weekly">Weekly</SelectItem>
          <SelectItem value="monthly">Monthly</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
