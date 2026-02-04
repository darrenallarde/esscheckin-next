"use client";

import { InsightsListView } from "./InsightsListView";
import { InsightsChartView } from "./InsightsChartView";
import { InsightsActions } from "./InsightsActions";
import { ChartControls } from "./ChartControls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  InsightsResults as InsightsResultsType,
  ParsedQuery,
  ChartType,
  TimeGranularity,
  ListResults,
  ChartResults,
  PersonResult,
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

  // Get profile IDs for messaging
  const profileIds = isListMode
    ? listResults?.people.map((p) => p.profileId) || []
    : []; // For chart mode, we'd need to aggregate from data points

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">
          {isListMode
            ? `Found ${listResults?.totalCount || 0} student${listResults?.totalCount === 1 ? "" : "s"}`
            : `${parsedQuery.segments.map((s) => s.label).join(" vs ")}`}
        </CardTitle>

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

      <CardContent className="space-y-4">
        {/* Results View */}
        {isListMode && listResults ? (
          <InsightsListView
            people={listResults.people}
            organizationId={organizationId}
            onPersonClick={onPersonClick}
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
