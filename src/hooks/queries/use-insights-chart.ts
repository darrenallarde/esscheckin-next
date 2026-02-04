/**
 * AI Insights - Chart Data Hook
 *
 * Fetches check-in data and aggregates it for chart visualization.
 * Supports multiple segments for comparison.
 */

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { getSegmentProfileIds, type PersonData } from "@/lib/insights/filters";
import {
  aggregateCheckIns,
  calculateSegmentStats,
  getDateRange,
  type CheckInRecord,
} from "@/lib/insights/aggregation";
import type { ParsedQuery, ChartResults } from "@/lib/insights/types";
import { SEGMENT_COLORS } from "@/lib/insights/types";

// Re-use the Person type structure from use-people
interface RpcPersonRow {
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  role: string;
  status: string;
  grade: string | null;
  gender: string | null;
  last_check_in: string | null;
  total_check_ins: number;
  group_ids: string[] | null;
  group_names: string[] | null;
  group_roles: string[] | null;
}

async function fetchChartData(
  organizationId: string,
  parsedQuery: ParsedQuery
): Promise<ChartResults> {
  const supabase = createClient();

  // 1. Fetch all people to filter by segment
  const { data: peopleData, error: peopleError } = await supabase.rpc(
    "get_organization_people",
    {
      p_org_id: organizationId,
      p_role_filter: ["student", "leader"],
      p_campus_id: null,
      p_include_archived: false,
    }
  );

  if (peopleError) throw peopleError;

  const people = (peopleData as RpcPersonRow[]) || [];

  // Transform to PersonData format for filtering
  const personDataList: PersonData[] = people.map((row) => ({
    profile_id: row.profile_id,
    first_name: row.first_name,
    last_name: row.last_name,
    phone_number: row.phone_number,
    email: row.email,
    grade: row.grade ? parseInt(row.grade, 10) : null,
    gender: row.gender,
    role: row.role,
    status: row.status,
    belonging_status: row.status,
    last_check_in: row.last_check_in,
    check_in_count: row.total_check_ins,
    groups:
      row.group_ids?.map((id, idx) => ({
        id,
        name: row.group_names?.[idx] || "",
        role: row.group_roles?.[idx] || "member",
      })) || [],
  }));

  // 2. Get profile IDs for each segment
  const segmentProfileIds = getSegmentProfileIds(
    personDataList,
    parsedQuery.segments
  );

  // 3. Calculate date range for check-ins query
  const timeRange = parsedQuery.timeRange || {
    range: "last_60_days" as const,
    granularity: "weekly" as const,
  };
  const { start, end } = getDateRange(timeRange);

  // 4. Fetch check-ins within the date range
  const { data: checkInsData, error: checkInsError } = await supabase
    .from("check_ins")
    .select("id, profile_id, checked_in_at, organization_id")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", start.toISOString())
    .lte("checked_in_at", end.toISOString())
    .order("checked_in_at", { ascending: true });

  if (checkInsError) throw checkInsError;

  const checkIns: CheckInRecord[] = (checkInsData || []).map((row) => ({
    id: row.id,
    profile_id: row.profile_id,
    checked_in_at: row.checked_in_at,
    organization_id: row.organization_id,
  }));

  // 5. Aggregate check-ins by segment and time period
  const dataPoints = aggregateCheckIns(checkIns, segmentProfileIds, timeRange);

  // 6. Calculate segment statistics
  const segmentLabels = parsedQuery.segments.map((s) => s.label);
  const stats = calculateSegmentStats(dataPoints, segmentLabels);

  // 7. Build segment metadata with colors
  const segments = stats.map((stat, index) => ({
    ...stat,
    color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
  }));

  return {
    mode: "chart",
    dataPoints,
    segments,
    timeRange,
    query: parsedQuery,
  };
}

interface UseInsightsChartReturn {
  results: ChartResults | null;
  isLoading: boolean;
  error: string | null;
}

export function useInsightsChart(
  organizationId: string | null,
  parsedQuery: ParsedQuery | null
): UseInsightsChartReturn {
  const queryResult = useQuery({
    queryKey: ["insights-chart", organizationId, parsedQuery?.rawQuery],
    queryFn: () => fetchChartData(organizationId!, parsedQuery!),
    enabled: !!organizationId && !!parsedQuery,
  });

  return {
    results: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error
      ? queryResult.error instanceof Error
        ? queryResult.error.message
        : "Failed to fetch chart data"
      : null,
  };
}
