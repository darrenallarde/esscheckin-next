/**
 * AI Insights Types
 *
 * TypeScript types for the conversational data assistant feature.
 * Supports both List mode (people queries) and Chart mode (trend queries).
 */

// ============================================
// OUTPUT MODES
// ============================================

export type OutputMode = "list" | "chart";

export type ChartType = "line" | "bar";

export type TimeGranularity = "daily" | "weekly" | "monthly";

export type TimeRange =
  | "last_7_days"
  | "last_30_days"
  | "last_60_days"
  | "last_90_days"
  | "last_6_months"
  | "last_year"
  | "this_semester"
  | "custom";

// ============================================
// FILTER TYPES
// ============================================

export type Gender = "male" | "female" | "all";

export type BelongingLevel =
  | "ultra_core"
  | "core"
  | "connected"
  | "fringe"
  | "missing"
  | "new";

export type MembershipRole = "leader" | "member" | "all";

export interface GradeFilter {
  grades: number[]; // e.g., [6, 7, 8] for middle school
  label?: string; // e.g., "MS" or "Middle School"
}

export interface GroupFilter {
  groupIds?: string[];
  groupNames?: string[];
  role?: MembershipRole;
}

export interface ActivityFilter {
  type:
    | "active" // checked in within timeframe
    | "inactive" // not checked in within timeframe
    | "never"; // never checked in
  days?: number; // for active/inactive: number of days
}

export interface EngagementFilter {
  belongingLevels?: BelongingLevel[];
  minCheckins?: number;
  maxCheckins?: number | null;
  streakMin?: number;
}

// ============================================
// PARSED QUERY STRUCTURE
// ============================================

/**
 * Step 1 output: Intent classification
 */
export interface IntentClassification {
  outputMode: OutputMode;
  confidence: number; // 0-1
  reasoning?: string;
}

/**
 * Step 2 output: Segment extraction (for comparisons)
 * Max 4 segments for chart comparisons
 */
export interface Segment {
  label: string; // e.g., "HS Boys", "MS Girls"
  filters: SegmentFilters;
}

export interface SegmentFilters {
  gender?: Gender | null;
  grades?: GradeFilter | null;
  groups?: GroupFilter | null;
  activity?: ActivityFilter | null;
  engagement?: EngagementFilter | null;
}

/**
 * Step 3 output: Time range extraction
 */
export interface TimeRangeExtraction {
  range: TimeRange;
  granularity: TimeGranularity;
  customStart?: string; // ISO date
  customEnd?: string; // ISO date
}

/**
 * Step 4 output: Metric selection
 */
export type MetricType =
  | "unique_checkins" // count distinct people who checked in
  | "total_checkins" // total check-in count (with duplicates)
  | "attendance_rate" // percentage of group who checked in
  | "new_students"; // first-time check-ins

export interface MetricSelection {
  metric: MetricType;
}

/**
 * Complete parsed query - all steps combined
 */
export interface ParsedQuery {
  intent: IntentClassification;
  segments: Segment[];
  timeRange?: TimeRangeExtraction; // only for chart mode
  metric?: MetricSelection; // only for chart mode
  rawQuery: string;
  parseTimeMs: number;
}

// ============================================
// QUERY RESULTS
// ============================================

/**
 * Person result for list mode
 */
export interface PersonResult {
  profileId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  grade?: number;
  gender?: string;
  belongingLevel?: BelongingLevel;
  lastCheckIn?: string; // ISO date
  checkInCount?: number;
  groups?: Array<{
    id: string;
    name: string;
    role: MembershipRole;
  }>;
}

/**
 * Data point for chart mode
 */
export interface ChartDataPoint {
  period: string; // e.g., "2026-01-15" or "Week 3"
  periodStart: string; // ISO date
  periodEnd: string; // ISO date
  values: Record<string, number>; // segment label -> count
}

/**
 * List mode results
 */
export interface ListResults {
  mode: "list";
  people: PersonResult[];
  totalCount: number;
  query: ParsedQuery;
}

/**
 * Chart mode results
 */
export interface ChartResults {
  mode: "chart";
  dataPoints: ChartDataPoint[];
  segments: Array<{
    label: string;
    color: string;
    total: number;
    average: number;
  }>;
  timeRange: TimeRangeExtraction;
  query: ParsedQuery;
}

export type InsightsResults = ListResults | ChartResults;

// ============================================
// DRILL-DOWN
// ============================================

export interface DrillDownContext {
  segmentLabel: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  count: number;
}

// ============================================
// UI STATE
// ============================================

export interface InsightsState {
  query: string;
  isLoading: boolean;
  isParsing: boolean;
  error?: string;
  results?: InsightsResults;
  parsedQuery?: ParsedQuery;

  // Chart controls
  chartType: ChartType;
  granularity: TimeGranularity;

  // Drill-down
  drillDown?: DrillDownContext;
}

// ============================================
// QUICK REPLIES
// ============================================

export interface QuickReply {
  label: string;
  query: string;
  category: "list" | "chart";
}

export const QUICK_REPLIES: QuickReply[] = [
  // Lists
  {
    label: "HS boys active this month",
    query: "HS boys who have checked in this month",
    category: "list",
  },
  {
    label: "Students missing 3+ weeks",
    query: "Students who haven't checked in for 3 weeks or more",
    category: "list",
  },
  {
    label: "7th graders not in any group",
    query: "7th graders who are not in any group",
    category: "list",
  },
  {
    label: "Students who need attention",
    query: "Fringe students who might need outreach",
    category: "list",
  },
  {
    label: "Group leaders",
    query: "Show me all group leaders",
    category: "list",
  },
  {
    label: "Never checked in",
    query: "Students who have never checked in",
    category: "list",
  },

  // Charts
  {
    label: "Attendance trend this semester",
    query: "Show attendance trend over this semester",
    category: "chart",
  },
  {
    label: "Compare MS vs HS attendance",
    query: "Compare middle school vs high school attendance over time",
    category: "chart",
  },
  {
    label: "Compare boys vs girls",
    query: "Compare attendance between boys and girls this month",
    category: "chart",
  },
  {
    label: "New student growth by month",
    query: "Show new student registrations by month",
    category: "chart",
  },
  {
    label: "Weekly check-ins over time",
    query: "Show weekly check-in totals over the past 2 months",
    category: "chart",
  },
  {
    label: "All grade groups side by side",
    query: "Compare attendance across all grade groups",
    category: "chart",
  },
];

// ============================================
// SEGMENT COLORS
// ============================================

export const SEGMENT_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
] as const;
