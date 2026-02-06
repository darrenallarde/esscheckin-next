/**
 * Insights V2 — SQL-based Query Hook
 *
 * Calls the /api/insights/query endpoint to execute LLM-generated SQL
 * against the insights_people view.
 */

import { useState, useCallback } from "react";
import type {
  InsightsSqlApiResponse,
  InsightsSqlQueryResult,
  SqlListResults,
} from "@/lib/insights/types-v2";
import type { OrgContext } from "@/lib/insights/prompts";

interface UseInsightsSqlReturn {
  results: SqlListResults | null;
  isLoading: boolean;
  error: string | null;
  cannotAnswer: boolean;
  explanation: string | null;
  submitQuery: (query: string) => Promise<void>;
  clearResults: () => void;
}

export function useInsightsSql(
  organizationId: string | null,
  orgContext: OrgContext
): UseInsightsSqlReturn {
  const [results, setResults] = useState<SqlListResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cannotAnswer, setCannotAnswer] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);

  const submitQuery = useCallback(
    async (query: string) => {
      if (!query.trim() || !organizationId) return;

      setIsLoading(true);
      setError(null);
      setResults(null);
      setCannotAnswer(false);
      setExplanation(null);

      try {
        const response = await fetch("/api/insights/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: query.trim(),
            organizationId,
            orgContext,
          }),
        });

        const data: InsightsSqlApiResponse = await response.json();

        if (!data.success) {
          if ("cannotAnswer" in data && data.cannotAnswer) {
            setCannotAnswer(true);
            setExplanation(data.explanation || null);
            setError(data.error);
          } else {
            setError(data.error);
          }
          return;
        }

        const result = data as InsightsSqlQueryResult;

        setResults({
          mode: "sql-list",
          data: result.data,
          summary: result.summary,
          displayColumns: result.displayColumns,
          displayLabels: result.displayLabels,
          totalCount: result.rowCount,
          rawQuery: query.trim(),
          sql: result.sql,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Something went wrong";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [organizationId, orgContext]
  );

  const clearResults = useCallback(() => {
    setResults(null);
    setError(null);
    setCannotAnswer(false);
    setExplanation(null);
  }, []);

  return {
    results,
    isLoading,
    error,
    cannotAnswer,
    explanation,
    submitQuery,
    clearResults,
  };
}
