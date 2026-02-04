/**
 * AI Insights - Decomposed Prompt Templates
 *
 * Following Amplitude's proven pattern: break NL→Result into discrete steps,
 * each with its own focused prompt. This reduces hallucinations and improves consistency.
 *
 * Architecture:
 * STEP 1: Intent Classification (list vs chart)
 * STEP 2: Segment Extraction (who are we looking at)
 * STEP 3: Time Range Extraction (chart mode only)
 * STEP 4: Metric Selection (chart mode only)
 */

/**
 * Context about the organization's data structure.
 * Passed to all prompts to help Claude understand what's available.
 */
export interface OrgContext {
  groupNames: string[]; // Available groups like "HS Boys", "MS Girls"
  hasGrades: boolean; // Whether grade data is tracked
  gradeRange: { min: number; max: number }; // e.g., 6-12
}

/**
 * STEP 1: Intent Classification
 *
 * Determines whether the query is asking for a list of people or a chart/trend.
 */
export function buildIntentPrompt(query: string): string {
  return `You are classifying a natural language query about student ministry data.

Determine if this query is asking for:
- "list": A list of specific people matching criteria (who, show me, students that, which students)
- "chart": A trend, comparison, or visualization over time (trend, compare, over time, attendance, growth)

Query: "${query}"

Respond with ONLY valid JSON:
{
  "outputMode": "list" | "chart",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Examples:
- "Show me HS boys" → list (asking for specific people)
- "Students missing 3 weeks" → list (asking for specific people)
- "Compare MS vs HS attendance" → chart (comparing over time)
- "Attendance trend" → chart (time series)
- "Who hasn't checked in" → list (asking for specific people)
- "Growth this semester" → chart (trend over time)`;
}

/**
 * STEP 2: Segment Extraction
 *
 * Extracts one or more segments (population filters) from the query.
 * For charts, this enables multi-segment comparisons (e.g., "boys vs girls").
 * For lists, this defines the filter criteria.
 */
export function buildSegmentPrompt(
  query: string,
  orgContext: OrgContext
): string {
  const groupList = orgContext.groupNames.length
    ? `Available groups: ${orgContext.groupNames.join(", ")}`
    : "No specific groups defined";

  return `You are extracting population segments from a query about student ministry data.

${groupList}
Grade range: ${orgContext.gradeRange.min}-${orgContext.gradeRange.max}

Extract up to 4 segments for comparison. Each segment defines a population to query.

Query: "${query}"

Respond with ONLY valid JSON:
{
  "segments": [
    {
      "label": "Human-readable label like 'HS Boys' or 'Active Students'",
      "filters": {
        "gender": "male" | "female" | "all" | null,
        "grades": {
          "grades": [6, 7, 8],  // array of grade numbers
          "label": "MS"  // optional friendly name
        } | null,
        "groups": {
          "groupNames": ["HS Boys"],  // match against available groups
          "role": "leader" | "member" | "all"
        } | null,
        "activity": {
          "type": "active" | "inactive" | "never",
          "days": 30  // for active/inactive: within/beyond this many days
        } | null,
        "engagement": {
          "belongingLevels": ["ultra_core", "core", "connected", "fringe", "missing", "new"],
          "minCheckins": 5,
          "maxCheckins": null
        } | null
      }
    }
  ]
}

Grade mapping:
- "middle school" / "MS" / "junior high" = grades 6-8
- "high school" / "HS" = grades 9-12
- "7th grade" / "7th graders" = grade 7
- "freshmen" = grade 9, "sophomores" = grade 10, "juniors" = grade 11, "seniors" = grade 12

Gender mapping:
- "boys" / "guys" / "men" / "male students" = gender: "male"
- "girls" / "gals" / "women" / "female students" = gender: "female"
- "HS boys" / "high school boys" = grades 9-12 AND gender: "male"
- "MS girls" / "middle school girls" = grades 6-8 AND gender: "female"

Activity mapping:
- "active this month" = { type: "active", days: 30 }
- "missing 3 weeks" / "haven't checked in for 3 weeks" = { type: "inactive", days: 21 }
- "never checked in" = { type: "never" }

Engagement mapping:
- "on the fringe" / "need attention" / "fringe students" = belongingLevels: ["fringe"]
- "ultra core" / "most engaged" = belongingLevels: ["ultra_core"]
- "new students" = belongingLevels: ["new"]

If the query compares groups (e.g., "boys vs girls", "MS vs HS"), create multiple segments.
If no specific filter mentioned, use a single segment with minimal filters.`;
}

/**
 * STEP 3: Time Range Extraction (Chart mode only)
 *
 * Determines the time range and granularity for chart data.
 */
export function buildTimeRangePrompt(query: string): string {
  return `You are extracting time range information from a query about student attendance trends.

Query: "${query}"

Respond with ONLY valid JSON:
{
  "range": "last_7_days" | "last_30_days" | "last_60_days" | "last_90_days" | "last_6_months" | "last_year" | "this_semester",
  "granularity": "daily" | "weekly" | "monthly"
}

Mapping guidelines:
- "this week" → last_7_days, daily
- "this month" / "past month" → last_30_days, weekly
- "this semester" / "this term" → this_semester, weekly
- "over time" (no specific period) → last_60_days, weekly
- "by month" / "monthly" → last_6_months, monthly
- "past few weeks" → last_30_days, weekly
- "this year" / "all year" → last_year, monthly

Default to weekly granularity unless:
- Very short period (< 2 weeks) → daily
- Long period (> 3 months) → monthly
- Query explicitly mentions "daily" or "monthly"`;
}

/**
 * STEP 4: Metric Selection (Chart mode only)
 *
 * Determines what metric to display on the chart.
 */
export function buildMetricPrompt(query: string): string {
  return `You are determining what metric to display for a student attendance chart.

Query: "${query}"

Respond with ONLY valid JSON:
{
  "metric": "unique_checkins" | "total_checkins" | "attendance_rate" | "new_students"
}

Metric definitions:
- "unique_checkins": Count of distinct students who checked in (default for most queries)
- "total_checkins": Total number of check-ins including duplicates (rare, only if explicitly asked)
- "attendance_rate": Percentage of enrolled students who checked in (when comparing rates)
- "new_students": First-time registrations/check-ins (for growth queries)

Mapping guidelines:
- "attendance" / "who came" / "checked in" → unique_checkins
- "new students" / "growth" / "registrations" → new_students
- "attendance rate" / "percentage" → attendance_rate
- Default to unique_checkins if unclear`;
}

/**
 * Error recovery prompt - used when initial parse fails
 */
export function buildRecoveryPrompt(
  query: string,
  previousError: string
): string {
  return `The previous attempt to parse this query failed with: "${previousError}"

Please try again with the query: "${query}"

Focus on extracting the core intent. If the query is ambiguous, make reasonable assumptions based on common ministry terminology:
- "guys" = male students
- "girls" = female students
- "MIA" = missing/inactive students
- "regulars" = active/engaged students
- "newcomers" = new students`;
}
