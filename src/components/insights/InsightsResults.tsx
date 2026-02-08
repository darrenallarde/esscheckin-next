"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { InsightsListView } from "./InsightsListView";
import { InsightsActions } from "./InsightsActions";
import { Skeleton } from "@/components/ui/skeleton";

const InsightsChartView = dynamic(
  () =>
    import("./InsightsChartView").then((m) => ({
      default: m.InsightsChartView,
    })),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[250px] md:h-[400px] w-full rounded-xl" />
    ),
  },
);
import { ChartControls } from "./ChartControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type {
  InsightsResults as InsightsResultsType,
  ParsedQuery,
  ChartType,
  TimeGranularity,
  ListResults,
  ChartResults,
  PersonResult,
  SegmentFilters,
} from "@/lib/insights/types";

interface InsightsResultsProps {
  results: InsightsResultsType;
  parsedQuery: ParsedQuery;
  chartType: ChartType;
  granularity: TimeGranularity;
  onChartTypeChange: (type: ChartType) => void;
  onGranularityChange: (granularity: TimeGranularity) => void;
  onPersonClick?: (person: PersonResult) => void;
  organizationId: string | null;
  orgSlug?: string | null;
}

/**
 * Extract readable filter descriptions from parsed segment filters
 */
function getFilterChips(filters: SegmentFilters): string[] {
  const chips: string[] = [];

  if (filters.firstName) {
    chips.push(`firstName: "${filters.firstName}"`);
  }
  if (filters.lastName) {
    chips.push(`lastName: "${filters.lastName}"`);
  }
  if (filters.gender && filters.gender !== "all") {
    chips.push(`gender: ${filters.gender}`);
  }
  if (filters.grades?.grades && filters.grades.grades.length > 0) {
    const label =
      filters.grades.label || `grades ${filters.grades.grades.join(", ")}`;
    chips.push(`grade: ${label}`);
  }
  if (filters.groups?.groupNames && filters.groups.groupNames.length > 0) {
    chips.push(`group: ${filters.groups.groupNames.join(", ")}`);
  }
  if (filters.activity) {
    const days = filters.activity.days ? ` ${filters.activity.days}d` : "";
    chips.push(`activity: ${filters.activity.type}${days}`);
  }
  if (
    filters.engagement?.belongingLevels &&
    filters.engagement.belongingLevels.length > 0
  ) {
    chips.push(`belonging: ${filters.engagement.belongingLevels.join(", ")}`);
  }
  if (filters.engagement?.minCheckins !== undefined) {
    chips.push(`min check-ins: ${filters.engagement.minCheckins}`);
  }

  return chips;
}

export function InsightsResults({
  results,
  parsedQuery,
  chartType,
  granularity,
  onChartTypeChange,
  onGranularityChange,
  onPersonClick,
  organizationId,
  orgSlug,
}: InsightsResultsProps) {
  const isListMode = results.mode === "list";
  const listResults = isListMode ? (results as ListResults) : null;
  const chartResults = !isListMode ? (results as ChartResults) : null;

  // Selection state for list mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Initialize selection with all people when results change
  const allProfileIds = useMemo(() => {
    return isListMode ? listResults?.people.map((p) => p.profileId) || [] : [];
  }, [isListMode, listResults?.people]);

  // Auto-select all when results first load
  useMemo(() => {
    if (allProfileIds.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(allProfileIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProfileIds]);

  // Toggle individual selection
  const toggleSelection = useCallback((profileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  }, []);

  // Toggle all selection
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === allProfileIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allProfileIds));
    }
  }, [selectedIds.size, allProfileIds]);

  // Get profile IDs for messaging - only selected ones
  const profileIds = isListMode ? Array.from(selectedIds) : []; // For chart mode, we'd need to aggregate from data points

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {/* Select all checkbox (list mode only) */}
          {isListMode && allProfileIds.length > 0 && (
            <Checkbox
              checked={selectedIds.size === allProfileIds.length}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
          )}
          <CardTitle className="text-lg">
            {isListMode
              ? selectedIds.size === allProfileIds.length
                ? `Found ${listResults?.totalCount || 0} student${listResults?.totalCount === 1 ? "" : "s"}`
                : `${selectedIds.size} of ${listResults?.totalCount || 0} selected`
              : `${parsedQuery.segments.map((s) => s.label).join(" vs ")}`}
          </CardTitle>
        </div>

        {/* Chart controls (chart mode only) */}
        {!isListMode && chartResults && (
          <ChartControls
            chartType={chartType}
            granularity={granularity}
            onChartTypeChange={onChartTypeChange}
            onGranularityChange={onGranularityChange}
          />
        )}
      </CardHeader>

      {/* Filter transparency: show what filters the NLP extracted */}
      {isListMode &&
        parsedQuery.segments[0] &&
        (() => {
          const chips = getFilterChips(parsedQuery.segments[0].filters);
          if (chips.length === 0) return null;
          return (
            <div className="px-6 pb-2 flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground mr-1">
                Filters:
              </span>
              {chips.map((chip) => (
                <Badge
                  key={chip}
                  variant="secondary"
                  className="text-xs font-normal"
                >
                  {chip}
                </Badge>
              ))}
            </div>
          );
        })()}

      <CardContent className="space-y-4">
        {/* Results View */}
        {isListMode && listResults ? (
          <InsightsListView
            people={listResults.people}
            organizationId={organizationId}
            onPersonClick={onPersonClick}
            selectedIds={selectedIds}
            onToggleSelection={toggleSelection}
          />
        ) : chartResults ? (
          <InsightsChartView
            dataPoints={chartResults.dataPoints}
            segments={chartResults.segments}
            chartType={chartType}
            organizationId={organizationId}
          />
        ) : null}

        {/* Action Buttons */}
        <InsightsActions
          mode={results.mode}
          profileIds={profileIds}
          queryText={parsedQuery.rawQuery}
          resultCount={isListMode ? listResults?.totalCount || 0 : 0}
          people={listResults?.people}
          chartData={chartResults}
          organizationId={organizationId}
          orgSlug={orgSlug}
        />
      </CardContent>
    </Card>
  );
}
