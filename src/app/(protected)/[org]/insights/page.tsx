"use client";

import { useState, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsightsInput } from "@/components/insights/InsightsInput";
import { QuickQueryChips } from "@/components/insights/QuickQueryChips";
import { InsightsResults } from "@/components/insights/InsightsResults";
import { ModeToggle } from "@/components/insights/ModeToggle";
import { useInsights } from "@/hooks/queries/use-insights";
import { useOrganization } from "@/hooks/useOrganization";
import { useTrack } from "@/lib/amplitude/hooks";
import { EVENTS } from "@/lib/amplitude/events";
import type { ChartType, TimeGranularity, OutputMode } from "@/lib/insights/types";

export default function InsightsPage() {
  const track = useTrack();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  const [query, setQuery] = useState("");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [granularity, setGranularity] = useState<TimeGranularity>("weekly");

  const {
    results,
    parsedQuery,
    isLoading,
    isParsing,
    error,
    submitQuery,
    clearResults,
  } = useInsights(organizationId);

  // Track page view on mount
  useState(() => {
    track(EVENTS.INSIGHTS_PAGE_VIEWED, {});
  });

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;

    track(EVENTS.INSIGHTS_QUERY_SUBMITTED, {
      query_text: query,
      source: "typed",
      output_mode: parsedQuery?.intent.outputMode || "unknown",
    });

    submitQuery(query);
  }, [query, submitQuery, track, parsedQuery]);

  const handleQuickReply = useCallback(
    (queryText: string, label: string) => {
      setQuery(queryText);

      track(EVENTS.INSIGHTS_QUERY_SUBMITTED, {
        query_text: queryText,
        source: "quick_reply",
        quick_reply_label: label,
        output_mode: "unknown",
      });

      submitQuery(queryText);
    },
    [submitQuery, track]
  );

  const handleClear = useCallback(() => {
    track(EVENTS.INSIGHTS_QUERY_CLEARED, {
      previous_query_text: query,
    });

    setQuery("");
    clearResults();
  }, [query, clearResults, track]);

  const handleModeToggle = useCallback(
    (newMode: OutputMode) => {
      if (!parsedQuery) return;

      track(EVENTS.INSIGHTS_MODE_TOGGLED, {
        from_mode: parsedQuery.intent.outputMode,
        to_mode: newMode,
        query_text: query,
      });

      // Re-submit with mode hint (future enhancement)
    },
    [parsedQuery, query, track]
  );

  const handleChartTypeChange = useCallback(
    (newType: ChartType) => {
      track(EVENTS.INSIGHTS_CHART_TYPE_CHANGED, {
        chart_type: newType,
        query_text: query,
      });

      setChartType(newType);
    },
    [query, track]
  );

  const handleGranularityChange = useCallback(
    (newGranularity: TimeGranularity) => {
      track(EVENTS.INSIGHTS_GRANULARITY_CHANGED, {
        granularity: newGranularity,
        query_text: query,
        previous_granularity: granularity,
      });

      setGranularity(newGranularity);
    },
    [query, granularity, track]
  );

  const hasResults = !!results;
  const outputMode = parsedQuery?.intent.outputMode;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Insights
          </h1>
        </div>
        <p className="text-muted-foreground">
          Ask anything about your students
        </p>
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="pt-6">
          <InsightsInput
            value={query}
            onChange={setQuery}
            onSubmit={handleSubmit}
            onClear={handleClear}
            isLoading={isLoading || isParsing}
          />

          {/* Mode Toggle (when results exist) */}
          {hasResults && outputMode && (
            <div className="mt-4 flex items-center justify-between">
              <ModeToggle
                currentMode={outputMode}
                onModeChange={handleModeToggle}
                disabled={isLoading}
              />

              {/* Chart controls (chart mode only) */}
              {outputMode === "chart" && (
                <div className="flex items-center gap-2">
                  {/* These will be implemented in ChartControls component */}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try rephrasing your question or select a quick reply below.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Results or Quick Replies */}
      {hasResults ? (
        <InsightsResults
          results={results}
          parsedQuery={parsedQuery!}
          chartType={chartType}
          granularity={granularity}
          onChartTypeChange={handleChartTypeChange}
          onGranularityChange={handleGranularityChange}
          organizationId={organizationId}
        />
      ) : (
        !isLoading &&
        !isParsing && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick queries</CardTitle>
            </CardHeader>
            <CardContent>
              <QuickQueryChips
                onSelect={handleQuickReply}
                disabled={isLoading || isParsing}
              />
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
