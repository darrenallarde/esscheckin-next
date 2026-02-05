/**
 * AI Insights - Main Orchestration Hook
 *
 * V2 architecture:
 * - List mode → SQL generation via /api/insights/query (new V2 path)
 * - Chart mode → existing pipeline via /api/insights/parse → segments → aggregation
 *
 * The intent check (list vs chart) is done first via the parse endpoint.
 * If the intent is "list", we route to the SQL path instead.
 */

import { useState, useCallback, useRef } from "react";
import { useInsightsChart } from "./use-insights-chart";
import { useInsightsSql } from "./use-insights-sql";
import type {
  ParsedQuery,
  InsightsResults,
} from "@/lib/insights/types";
import type { SqlListResults } from "@/lib/insights/types-v2";
import type { OrgContext } from "@/lib/insights/prompts";
import { useGroups } from "./use-groups";

// Combined results type that includes both V1 and V2 result shapes
export type CombinedResults = InsightsResults | SqlListResults;

interface UseInsightsReturn {
  results: CombinedResults | null;
  parsedQuery: ParsedQuery | null;
  isLoading: boolean;
  isParsing: boolean;
  error: string | null;
  submitQuery: (query: string) => Promise<void>;
  clearResults: () => void;
  effectiveMode: "list" | "chart" | null;
}

interface UseInsightsOptions {
  modeOverride?: "list" | "chart" | null;
}

export function useInsights(
  organizationId: string | null,
  options: UseInsightsOptions = {}
): UseInsightsReturn {
  const { modeOverride } = options;
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track whether the current query is using V2 SQL mode
  const [isSqlMode, setIsSqlMode] = useState(false);

  // Fetch groups for org context (used in prompts)
  const { data: groups } = useGroups(organizationId);

  // Build org context for the parser
  const orgContext: OrgContext = {
    groupNames: groups?.map((g) => g.name) || [],
    hasGrades: true,
    gradeRange: { min: 6, max: 12 },
  };

  // Ref to persist orgContext for stable callback
  const orgContextRef = useRef(orgContext);
  orgContextRef.current = orgContext;

  // V2 SQL hook for list mode
  const {
    results: sqlResults,
    isLoading: isSqlLoading,
    error: sqlError,
    submitQuery: submitSqlQuery,
    clearResults: clearSqlResults,
  } = useInsightsSql(organizationId, orgContext);

  // Determine effective mode
  const effectiveMode = isSqlMode
    ? modeOverride ?? "list"
    : modeOverride ?? parsedQuery?.intent.outputMode ?? null;

  // Chart data hook (only active when effective mode is "chart" and we have a parsed query)
  const {
    results: chartResults,
    isLoading: isChartLoading,
    error: chartError,
  } = useInsightsChart(
    organizationId,
    effectiveMode === "chart" && parsedQuery ? parsedQuery : null
  );

  // Combine results based on mode
  const results: CombinedResults | null = (() => {
    if (isSqlMode && effectiveMode === "list") {
      return sqlResults;
    }
    if (effectiveMode === "chart") {
      return chartResults;
    }
    return null;
  })();

  const isLoading = isSqlLoading || isChartLoading;
  const dataError = sqlError || chartError;

  // Submit query — first classify intent, then route accordingly
  const submitQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      setIsParsing(true);
      setError(null);
      setParsedQuery(null);
      setIsSqlMode(false);
      clearSqlResults();

      try {
        // Step 1: Classify intent (list vs chart) via the parse endpoint
        // We only need intent classification — for list mode, we skip to SQL
        const response = await fetch("/api/insights/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            orgContext: orgContextRef.current,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to parse query");
        }

        const parsed: ParsedQuery = data.parsedQuery;
        const intent = parsed.intent.outputMode;

        if (intent === "chart") {
          // Chart mode: use existing V1 pipeline
          setParsedQuery(parsed);
          setIsSqlMode(false);
        } else {
          // List mode: use V2 SQL generation pipeline
          setIsSqlMode(true);
          // Store parsed query for mode toggle support
          setParsedQuery(parsed);
          // Fire the SQL query
          await submitSqlQuery(query);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      } finally {
        setIsParsing(false);
      }
    },
    [submitSqlQuery, clearSqlResults]
  );

  // Clear all results
  const clearResults = useCallback(() => {
    setParsedQuery(null);
    setError(null);
    setIsSqlMode(false);
    clearSqlResults();
  }, [clearSqlResults]);

  return {
    results,
    parsedQuery,
    isLoading,
    isParsing,
    error: error || dataError,
    submitQuery,
    clearResults,
    effectiveMode,
  };
}
