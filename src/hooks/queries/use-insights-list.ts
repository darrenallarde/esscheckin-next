/**
 * AI Insights - List Data Hook
 *
 * Fetches and filters people data based on parsed query segments.
 * Uses get_organization_people RPC and applies client-side filters.
 */

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { filterBySegment, type PersonData } from "@/lib/insights/filters";
import type { ParsedQuery, ListResults } from "@/lib/insights/types";

/**
 * Derive belonging status from activity data
 * Since get_organization_people doesn't return belonging_status directly,
 * we calculate it from check-in count and last check-in date.
 */
function deriveBelongingStatus(
  totalCheckIns: number,
  lastCheckIn: string | null
): string | null {
  // No check-ins = new or never engaged
  if (totalCheckIns === 0 || !lastCheckIn) {
    return "new";
  }

  const daysSinceCheckIn = Math.floor(
    (Date.now() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Ultra core: 10+ check-ins and active within 7 days
  if (totalCheckIns >= 10 && daysSinceCheckIn <= 7) {
    return "ultra_core";
  }

  // Core: 5+ check-ins and active within 14 days
  if (totalCheckIns >= 5 && daysSinceCheckIn <= 14) {
    return "core";
  }

  // Connected: active within 21 days
  if (daysSinceCheckIn <= 21) {
    return "connected";
  }

  // Fringe: active within 45 days
  if (daysSinceCheckIn <= 45) {
    return "fringe";
  }

  // Missing: not seen in 45+ days
  return "missing";
}

// Re-use the Person type structure from use-people
interface RpcPersonRow {
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  role: string;
  status: string;
  campus_id: string | null;
  campus_name: string | null;
  display_name: string | null;
  is_claimed: boolean;
  is_parent: boolean;
  linked_children_count: number;
  grade: string | null;
  gender: string | null;
  high_school: string | null;
  last_check_in: string | null;
  total_check_ins: number;
  total_points: number;
  current_rank: string;
  needs_triage: boolean | null;
  group_ids: string[] | null;
  group_names: string[] | null;
  group_roles: string[] | null;
  created_at: string;
}

async function fetchAndFilterPeople(
  organizationId: string,
  parsedQuery: ParsedQuery
): Promise<ListResults> {
  const supabase = createClient();

  // Fetch all students from the organization
  // We use "student" role but could expand to include others based on query
  const { data, error } = await supabase.rpc("get_organization_people", {
    p_org_id: organizationId,
    p_role_filter: ["student", "leader"], // Include students and leaders
    p_campus_id: null,
    p_include_archived: false,
  });

  if (error) throw error;

  const people = (data as RpcPersonRow[]) || [];

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
    // Derive belonging_status from activity data instead of membership status
    // row.status is "active"/"archived" which is wrong for engagement filtering
    belonging_status: deriveBelongingStatus(row.total_check_ins, row.last_check_in),
    last_check_in: row.last_check_in,
    check_in_count: row.total_check_ins,
    groups:
      row.group_ids?.map((id, idx) => ({
        id,
        name: row.group_names?.[idx] || "",
        role: row.group_roles?.[idx] || "member",
      })) || [],
  }));

  // Apply filters from the first segment (for list mode)
  // List mode typically has a single segment
  const segment = parsedQuery.segments[0];
  const filteredPeople = filterBySegment(personDataList, segment);

  return {
    mode: "list",
    people: filteredPeople,
    totalCount: filteredPeople.length,
    query: parsedQuery,
  };
}

interface UseInsightsListReturn {
  results: ListResults | null;
  isLoading: boolean;
  error: string | null;
}

export function useInsightsList(
  organizationId: string | null,
  parsedQuery: ParsedQuery | null
): UseInsightsListReturn {
  const queryResult = useQuery({
    queryKey: ["insights-list", organizationId, parsedQuery?.rawQuery],
    queryFn: () => fetchAndFilterPeople(organizationId!, parsedQuery!),
    enabled: !!organizationId && !!parsedQuery,
  });

  return {
    results: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error
      ? queryResult.error instanceof Error
        ? queryResult.error.message
        : "Failed to fetch data"
      : null,
  };
}
