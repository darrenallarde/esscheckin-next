/**
 * AI Insights - Main Orchestration Hook
 *
 * Coordinates:
 * 1. Query parsing via API
 * 2. Data fetching via list or chart hooks
 * 3. State management for the Insights feature
 */

import { useState, useCallback } from "react";
import { useInsightsList } from "./use-insights-list";
import { useInsightsChart } from "./use-insights-chart";
import type { ParsedQuery, InsightsResults } from "@/lib/insights/types";
import type { OrgContext } from "@/lib/insights/prompts";
import { useGroups } from "./use-groups";

interface UseInsightsReturn {
  results: InsightsResults | null;
  parsedQuery: ParsedQuery | null;
  isLoading: boolean;
  isParsing: boolean;
  error: string | null;
  submitQuery: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useInsights(organizationId: string | null): UseInsightsReturn {
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch groups for org context (used in prompts)
  const { data: groups } = useGroups(organizationId);

  // Build org context for the parser
  const orgContext: OrgContext = {
    groupNames: groups?.map((g) => g.name) || [],
    hasGrades: true,
    gradeRange: { min: 6, max: 12 },
  };

  // List data hook (only active when output mode is "list")
  const {
    results: listResults,
    isLoading: isListLoading,
    error: listError,
  } = useInsightsList(
    organizationId,
    parsedQuery?.intent.outputMode === "list" ? parsedQuery : null
  );

  // Chart data hook (only active when output mode is "chart")
  const {
    results: chartResults,
    isLoading: isChartLoading,
    error: chartError,
  } = useInsightsChart(
    organizationId,
    parsedQuery?.intent.outputMode === "chart" ? parsedQuery : null
  );

  // Combine results based on mode
  const results: InsightsResults | null =
    parsedQuery?.intent.outputMode === "list"
      ? listResults
      : parsedQuery?.intent.outputMode === "chart"
        ? chartResults
        : null;

  const isLoading = isListLoading || isChartLoading;
  const dataError = listError || chartError;

  // Parse and submit query
  const submitQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setIsParsing(true);
      setError(null);
      setParsedQuery(null);

      try {
        const response = await fetch("/api/insights/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            orgContext,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to parse query");
        }

        setParsedQuery(data.parsedQuery);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      } finally {
        setIsParsing(false);
      }
    },
    [orgContext]
  );

  // Clear all results
  const clearResults = useCallback(() => {
    setParsedQuery(null);
    setError(null);
  }, []);

  return {
    results,
    parsedQuery,
    isLoading,
    isParsing,
    error: error || dataError,
    submitQuery,
    clearResults,
  };
}
