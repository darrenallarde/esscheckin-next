/**
 * AI Insights - Query Parse API Route
 *
 * Implements the decomposed prompt chain:
 * STEP 1: Intent Classification (list vs chart)
 * STEP 2: Segment Extraction (who are we looking at)
 * STEP 3: Time Range Extraction (chart mode only)
 * STEP 4: Metric Selection (chart mode only)
 *
 * Steps 3 & 4 run in parallel for chart mode.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  llmWithValidation,
  llmParallel,
  IntentSchema,
  SegmentsResultSchema,
  TimeRangeSchema,
  MetricSchema,
} from "@/lib/insights/llm-wrapper";
import {
  buildIntentPrompt,
  buildSegmentPrompt,
  buildTimeRangePrompt,
  buildMetricPrompt,
  type OrgContext,
} from "@/lib/insights/prompts";
import type {
  ParsedQuery,
  IntentClassification,
  Segment,
  TimeRangeExtraction,
  MetricSelection,
} from "@/lib/insights/types";

interface ParseRequest {
  query: string;
  orgContext?: OrgContext;
}

interface ParseResponse {
  success: boolean;
  parsedQuery?: ParsedQuery;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<ParseResponse>> {
  const startTime = performance.now();

  try {
    const body = (await request.json()) as ParseRequest;
    const { query, orgContext } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Query is required" },
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

    // Default org context if not provided
    const ctx: OrgContext = orgContext || {
      groupNames: [],
      hasGrades: true,
      gradeRange: { min: 6, max: 12 },
    };

    // STEP 1: Intent Classification
    const intentPrompt = buildIntentPrompt(query);
    const intent = await llmWithValidation<IntentClassification>(
      intentPrompt,
      IntentSchema
    );

    // STEP 2: Segment Extraction
    const segmentPrompt = buildSegmentPrompt(query, ctx);
    const segmentsResult = await llmWithValidation<{ segments: Segment[] }>(
      segmentPrompt,
      SegmentsResultSchema
    );

    let timeRange: TimeRangeExtraction | undefined;
    let metric: MetricSelection | undefined;

    // STEPS 3 & 4: Time Range + Metric (chart mode only, in parallel)
    if (intent.outputMode === "chart") {
      const chartPrompts = [
        {
          key: "timeRange" as const,
          prompt: buildTimeRangePrompt(query),
          schema: TimeRangeSchema,
        },
        {
          key: "metric" as const,
          prompt: buildMetricPrompt(query),
          schema: MetricSchema,
        },
      ];

      const chartResults = await llmParallel<{
        timeRange: TimeRangeExtraction;
        metric: MetricSelection;
      }>(chartPrompts);

      timeRange = chartResults.timeRange;
      metric = chartResults.metric;
    }

    const parseTimeMs = Math.round(performance.now() - startTime);

    const parsedQuery: ParsedQuery = {
      intent,
      segments: segmentsResult.segments,
      timeRange,
      metric,
      rawQuery: query,
      parseTimeMs,
    };

    return NextResponse.json({
      success: true,
      parsedQuery,
    });
  } catch (error) {
    console.error("Insights parse error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse query. Please try rephrasing.",
      },
      { status: 500 }
    );
  }
}
