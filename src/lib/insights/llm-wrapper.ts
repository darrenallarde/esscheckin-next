/**
 * AI Insights - LLM Wrapper with Validation
 *
 * Following Amplitude's pattern: validation wrapper with retry logic.
 * Expects hallucinations and validates + retries on failure.
 */

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// ============================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================

export const IntentSchema = z.object({
  outputMode: z.enum(["list", "chart"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

export const GradeFilterSchema = z
  .object({
    grades: z.array(z.number().min(1).max(12)),
    label: z.string().optional(),
  })
  .nullable()
  .optional();

export const GroupFilterSchema = z
  .object({
    groupNames: z.array(z.string()).optional(),
    groupIds: z.array(z.string()).optional(),
    role: z.enum(["leader", "member", "all"]).optional(),
  })
  .nullable()
  .optional();

export const ActivityFilterSchema = z
  .object({
    type: z.enum(["active", "inactive", "never"]),
    days: z.number().optional(),
  })
  .nullable()
  .optional();

export const EngagementFilterSchema = z
  .object({
    belongingLevels: z
      .array(
        z.enum([
          "ultra_core",
          "core",
          "connected",
          "fringe",
          "missing",
          "new",
        ])
      )
      .optional(),
    minCheckins: z.number().optional(),
    maxCheckins: z.number().nullable().optional(),
  })
  .nullable()
  .optional();

export const SegmentFiltersSchema = z.object({
  gender: z.enum(["male", "female", "all"]).nullable().optional(),
  grades: GradeFilterSchema,
  groups: GroupFilterSchema,
  activity: ActivityFilterSchema,
  engagement: EngagementFilterSchema,
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
});

export const SegmentSchema = z.object({
  label: z.string(),
  filters: SegmentFiltersSchema,
});

export const SegmentsResultSchema = z.object({
  segments: z.array(SegmentSchema).min(1).max(4),
});

export const TimeRangeSchema = z.object({
  range: z.enum([
    "last_7_days",
    "last_30_days",
    "last_60_days",
    "last_90_days",
    "last_6_months",
    "last_year",
    "this_semester",
    "custom",
  ]),
  granularity: z.enum(["daily", "weekly", "monthly"]),
  customStart: z.string().optional(),
  customEnd: z.string().optional(),
});

export const MetricSchema = z.object({
  metric: z.enum([
    "unique_checkins",
    "total_checkins",
    "attendance_rate",
    "new_students",
  ]),
});

// ============================================
// LLM WRAPPER
// ============================================

interface LLMOptions {
  maxRetries?: number;
  temperature?: number;
}

/**
 * Call Claude with validation and retry logic.
 *
 * @param prompt - The prompt to send to Claude
 * @param schema - Zod schema to validate the response
 * @param options - Configuration options
 * @returns Validated response data
 * @throws Error if validation fails after all retries
 */
export async function llmWithValidation<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options: LLMOptions = {}
): Promise<T> {
  const { maxRetries = 2, temperature = 0 } = options;

  // Get API key from environment (server-side only)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({ apiKey });

  let lastError: Error | null = null;
  let currentPrompt = prompt;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        temperature,
        messages: [
          {
            role: "user",
            content: currentPrompt,
          },
        ],
      });

      // Extract text content
      const textContent = response.content.find((c) => c.type === "text");
      if (!textContent || textContent.type !== "text") {
        throw new Error("No text content in response");
      }

      const text = textContent.text.trim();

      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const validated = schema.parse(parsed);

      return validated;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If we have retries left, add error feedback to prompt
      if (attempt < maxRetries) {
        currentPrompt = `${prompt}

Your previous response was invalid: ${lastError.message}
Please try again with valid JSON matching the exact schema specified.`;
      }
    }
  }

  throw new Error(
    `Failed to get valid response after ${maxRetries + 1} attempts: ${lastError?.message}`
  );
}

/**
 * Run multiple prompts in parallel for efficiency.
 * Used when steps don't depend on each other (e.g., time range + metric for chart mode).
 */
export async function llmParallel<T extends Record<string, unknown>>(
  prompts: Array<{
    key: keyof T;
    prompt: string;
    schema: z.ZodSchema<T[keyof T]>;
  }>,
  options?: LLMOptions
): Promise<T> {
  const results = await Promise.all(
    prompts.map(async ({ key, prompt, schema }) => {
      const result = await llmWithValidation(prompt, schema, options);
      return { key, result };
    })
  );

  return results.reduce(
    (acc, { key, result }) => {
      acc[key] = result;
      return acc;
    },
    {} as Record<keyof T, T[keyof T]>
  ) as T;
}
