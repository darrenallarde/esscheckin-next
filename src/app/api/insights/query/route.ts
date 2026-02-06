/**
 * Insights V2 — SQL Query API Route
 *
 * Generates and executes SQL queries against the insights_people view.
 *
 * Flow:
 * 1. Validate auth (user must be admin/leader/owner in org)
 * 2. Build prompt with view schema + org context
 * 3. Call Claude to generate SQL
 * 4. If can_answer is false, return explanation
 * 5. Validate SQL with TypeScript validator
 * 6. Call run_insights_query RPC
 * 7. Return results + metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { llmWithValidation } from "@/lib/insights/llm-wrapper";
import { buildSqlGenerationPrompt } from "@/lib/insights/prompts-v2";
import { validateInsightsSql } from "@/lib/insights/sql-validator";
import {
  InsightsSqlResponseSchema,
  type InsightsSqlApiResponse,
} from "@/lib/insights/types-v2";
import type { OrgContext } from "@/lib/insights/prompts";

interface QueryRequest {
  query: string;
  organizationId: string;
  orgContext?: OrgContext;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<InsightsSqlApiResponse>> {
  try {
    const body = (await request.json()) as QueryRequest;
    const { query, organizationId, orgContext } = body;

    // Validate input
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Query is required" },
        { status: 400 }
      );
    }

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: "AI service not configured" },
        { status: 500 }
      );
    }

    // Validate auth
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Default org context
    const ctx: OrgContext = orgContext || {
      groupNames: [],
      hasGrades: true,
      gradeRange: { min: 6, max: 12 },
    };

    // Compute today's date in the org's timezone (for relative date queries like "yesterday")
    const tz = ctx.timezone || "America/Los_Angeles";
    const todayLocal = new Date().toLocaleDateString("en-CA", { timeZone: tz }); // "2026-02-04" format

    // Build prompt and call Claude for SQL generation
    const prompt = buildSqlGenerationPrompt(query.trim(), ctx, todayLocal);
    const llmResponse = await llmWithValidation(
      prompt,
      InsightsSqlResponseSchema,
      { maxRetries: 1 }
    );

    // If the LLM says it can't answer, return explanation
    if (!llmResponse.can_answer) {
      return NextResponse.json({
        success: false,
        error:
          llmResponse.explanation ||
          "This question cannot be answered with available data.",
        cannotAnswer: true,
        explanation: llmResponse.explanation,
      });
    }

    // Validate the SQL with TypeScript validator (Layer 2)
    const validation = validateInsightsSql(llmResponse.sql);
    if (!validation.valid) {
      console.error("SQL validation failed:", validation.error, llmResponse.sql);
      return NextResponse.json(
        {
          success: false,
          error: "The generated query could not be validated. Please try rephrasing your question.",
        },
        { status: 400 }
      );
    }

    // Execute via RPC (Layers 3 + 4: PostgreSQL validation + org scoping)
    const { data, error: rpcError } = await supabase.rpc(
      "run_insights_query",
      {
        p_org_id: organizationId,
        p_sql: llmResponse.sql,
      }
    );

    if (rpcError) {
      console.error("Insights RPC error:", rpcError.message);

      // Check for timeout
      if (rpcError.message.includes("timed out")) {
        return NextResponse.json(
          {
            success: false,
            error: "Query took too long. Try a simpler question.",
          },
          { status: 408 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to execute query. Please try rephrasing.",
        },
        { status: 500 }
      );
    }

    const results = (data as Record<string, unknown>[]) || [];

    const response: InsightsSqlApiResponse = {
      success: true,
      data: results,
      summary: llmResponse.summary,
      displayColumns: llmResponse.display_columns,
      displayLabels: llmResponse.display_labels,
      rowCount: results.length,
      ...(process.env.NODE_ENV === "development" && {
        sql: llmResponse.sql,
      }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Insights query error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process query. Please try rephrasing.",
      },
      { status: 500 }
    );
  }
}
