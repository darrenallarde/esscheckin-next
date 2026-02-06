/**
 * Insights V2 Types — SQL Generation Mode
 *
 * Types for the SQL-based insights pipeline where the LLM generates
 * SELECT queries against the insights_people view.
 */

import { z } from "zod";

// ============================================
// LLM RESPONSE SCHEMA
// ============================================

/**
 * Zod schema for validating the LLM's SQL generation response.
 */
export const InsightsSqlResponseSchema = z.object({
  sql: z.string().describe("SQL SELECT query against insights_people"),
  summary: z.string().describe("Human-readable summary of what the query does"),
  display_columns: z
    .array(z.string())
    .describe("Column keys to display in the results table"),
  display_labels: z
    .array(z.string())
    .describe("Human-readable labels for each display column"),
  can_answer: z
    .boolean()
    .describe("Whether the query can be answered with available data"),
  explanation: z
    .string()
    .optional()
    .describe("Explanation when can_answer is false"),
});

export type InsightsSqlResponse = z.infer<typeof InsightsSqlResponseSchema>;

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * Successful query result from the API route.
 */
export interface InsightsSqlQueryResult {
  success: true;
  data: Record<string, unknown>[];
  summary: string;
  displayColumns: string[];
  displayLabels: string[];
  rowCount: number;
  sql?: string; // Only in development
}

/**
 * Error response from the API route.
 */
export interface InsightsSqlQueryError {
  success: false;
  error: string;
  cannotAnswer?: boolean; // True when the data doesn't exist to answer the query
  explanation?: string;
}

export type InsightsSqlApiResponse =
  | InsightsSqlQueryResult
  | InsightsSqlQueryError;

// ============================================
// LIST RESULTS V2 (extends existing types)
// ============================================

/**
 * SQL-based list results — dynamic columns instead of hardcoded PersonResult.
 */
export interface SqlListResults {
  mode: "sql-list";
  data: Record<string, unknown>[];
  summary: string;
  displayColumns: string[];
  displayLabels: string[];
  totalCount: number;
  rawQuery: string;
  sql?: string;
}
