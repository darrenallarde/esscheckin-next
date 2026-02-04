"use client";

import { useState, useCallback, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsightsInput } from "@/components/insights/InsightsInput";
import { QuickQueryChips } from "@/components/insights/QuickQueryChips";
import { InsightsResults } from "@/components/insights/InsightsResults";
import { ModeToggle } from "@/components/insights/ModeToggle";
import { SavedQueries } from "@/components/insights/SavedQueries";
import { PersonProfileModal } from "@/components/people/PersonProfileModal";
import { useInsights } from "@/hooks/queries/use-insights";
import { useOrganization } from "@/hooks/useOrganization";
import { useSaveQuery } from "@/hooks/queries/use-saved-queries";
import { useTrack } from "@/lib/amplitude/hooks";
import { EVENTS } from "@/lib/amplitude/events";
import type { ChartType, TimeGranularity, OutputMode, PersonResult } from "@/lib/insights/types";
import type { Student } from "@/hooks/queries/use-students";

export default function InsightsPage() {
  const track = useTrack();
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  const [query, setQuery] = useState("");
  const [chartType, setChartType] = useState<ChartType>("line");
  const [granularity, setGranularity] = useState<TimeGranularity>("weekly");
  const [modeOverride, setModeOverride] = useState<OutputMode | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Student | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const {
    results,
    parsedQuery,
    isLoading,
    isParsing,
    error,
    submitQuery,
    clearResults,
    effectiveMode,
  } = useInsights(organizationId, { modeOverride });

  const saveQuery = useSaveQuery();

  // Track page view on mount
  useState(() => {
    track(EVENTS.INSIGHTS_PAGE_VIEWED, {});
  });

  // Auto-save query when results come back
  useEffect(() => {
    if (results && query.trim() && organizationId) {
      saveQuery.mutate({
        orgId: organizationId,
        queryText: query.trim(),
      });

      track(EVENTS.INSIGHTS_QUERY_SAVED, {
        query_text: query,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, organizationId]);

  const handleSubmit = useCallback(() => {
    if (!query.trim()) return;

    track(EVENTS.INSIGHTS_QUERY_SUBMITTED, {
      query_text: query,
      source: "typed",
      output_mode: parsedQuery?.intent.outputMode || "unknown",
    });

    // Reset mode override for new queries - let Claude's intent classification decide
    setModeOverride(null);
    submitQuery(query);
  }, [query, submitQuery, track, parsedQuery]);

  // Handle selecting a saved query
  const handleSelectSavedQuery = useCallback(
    (queryText: string) => {
      setQuery(queryText);

      track(EVENTS.INSIGHTS_QUERY_SUBMITTED, {
        query_text: queryText,
        source: "saved_query",
        output_mode: "unknown",
      });

      // Reset mode override for new queries
      setModeOverride(null);
      submitQuery(queryText);
    },
    [submitQuery, track]
  );

  const handleQuickReply = useCallback(
    (queryText: string, label: string) => {
      setQuery(queryText);

      track(EVENTS.INSIGHTS_QUERY_SUBMITTED, {
        query_text: queryText,
        source: "quick_reply",
        quick_reply_label: label,
        output_mode: "unknown",
      });

      // Reset mode override for new queries
      setModeOverride(null);
      submitQuery(queryText);
    },
    [submitQuery, track]
  );

  const handleClear = useCallback(() => {
    track(EVENTS.INSIGHTS_QUERY_CLEARED, {
      previous_query_text: query,
    });

    setQuery("");
    setModeOverride(null);
    clearResults();
  }, [query, clearResults, track]);

  const handleModeToggle = useCallback(
    (newMode: OutputMode) => {
      if (!parsedQuery) return;

      const currentMode = effectiveMode || parsedQuery.intent.outputMode;

      track(EVENTS.INSIGHTS_MODE_TOGGLED, {
        from_mode: currentMode,
        to_mode: newMode,
        query_text: query,
      });

      // Set mode override to switch between list/chart views
      setModeOverride(newMode);
    },
    [parsedQuery, effectiveMode, query, track]
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
  const outputMode = effectiveMode;

  // Handle clicking on a person in results
  const handlePersonClick = useCallback((person: PersonResult) => {
    // Convert PersonResult to Student type for the modal
    const studentData: Student = {
      id: person.profileId,
      profile_id: person.profileId,
      first_name: person.firstName,
      last_name: person.lastName,
      phone_number: person.phone || null,
      email: person.email || null,
      grade: person.grade?.toString() || null,
      high_school: null,
      user_type: "student",
      total_points: 0,
      current_rank: "Newcomer",
      last_check_in: person.lastCheckIn || null,
      days_since_last_check_in: null,
      total_check_ins: person.checkInCount || 0,
      groups: person.groups?.map(g => ({
        id: g.id,
        name: g.name,
        color: null,
      })) || [],
    };
    setSelectedPerson(studentData);
    setProfileModalOpen(true);
  }, []);

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
          onPersonClick={handlePersonClick}
          organizationId={organizationId}
          orgSlug={currentOrganization?.slug}
        />
      ) : (
        !isLoading &&
        !isParsing && (
          <div className="space-y-4">
            {/* Saved Queries */}
            <SavedQueries
              organizationId={organizationId}
              onSelectQuery={handleSelectSavedQuery}
              disabled={isLoading || isParsing}
            />

            {/* Quick Queries */}
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
          </div>
        )
      )}

      {/* Person Profile Modal */}
      <PersonProfileModal
        person={selectedPerson}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        organizationId={organizationId || undefined}
      />
    </div>
  );
}
