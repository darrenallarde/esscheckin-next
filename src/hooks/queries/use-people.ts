import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

// Organization membership roles
export type OrgRole = "owner" | "admin" | "leader" | "viewer" | "student" | "guardian";

// Tab types for People page
export type PeopleTab = "students" | "team" | "parents";

// Filters for the People page
export interface PeopleFilters {
  search?: string;
  grade?: string;
  groupId?: string;
  status?: string; // belonging status for students
  campusId?: string;
  isClaimed?: boolean; // for parents: claimed/unclaimed filter
}

// Person type returned from the unified get_organization_people RPC
export interface Person {
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  role: OrgRole;
  status: string;
  campus_id: string | null;
  campus_name: string | null;
  display_name: string | null;
  is_claimed: boolean;
  is_parent: boolean;
  linked_children_count: number;
  // Student-specific
  grade: string | null;
  gender: string | null;
  high_school: string | null;
  last_check_in: string | null;
  total_check_ins: number;
  check_ins_last_4_weeks: number;
  check_ins_last_8_weeks: number;
  belonging_status: string | null;
  total_points: number;
  current_rank: string;
  needs_triage: boolean | null;
  // Group info
  group_ids: string[];
  group_names: string[];
  group_roles: string[];
  created_at: string;
  // Computed
  days_since_last_check_in: number | null;
}

// Role filters for each tab
const TAB_ROLE_FILTERS: Record<PeopleTab, OrgRole[]> = {
  students: ["student"],
  team: ["owner", "admin", "leader", "viewer"],
  parents: ["guardian"],
};

// Raw data from RPC
interface RpcPersonRow {
  profile_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone_number: string | null;
  role: OrgRole;
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
  check_ins_last_4_weeks: number;
  check_ins_last_8_weeks: number;
  belonging_status: string | null;
  total_points: number;
  current_rank: string;
  needs_triage: boolean | null;
  group_ids: string[] | null;
  group_names: string[] | null;
  group_roles: string[] | null;
  created_at: string;
}

async function fetchPeople(
  organizationId: string,
  tab: PeopleTab,
  filters: PeopleFilters,
  includeArchived: boolean = false
): Promise<Person[]> {
  const supabase = createClient();
  const today = new Date();

  // Get role filter based on tab
  const roleFilter = TAB_ROLE_FILTERS[tab];

  // Call the unified RPC
  const { data, error } = await supabase.rpc("get_organization_people", {
    p_org_id: organizationId,
    p_role_filter: roleFilter,
    p_campus_id: filters.campusId || null,
    p_include_archived: includeArchived,
  });

  if (error) throw error;

  const people = (data as RpcPersonRow[]) || [];

  // Transform and filter
  let result = people.map((person): Person => {
    const lastCheckIn = person.last_check_in;
    const daysSince = lastCheckIn
      ? Math.floor(
          (today.getTime() - new Date(lastCheckIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    return {
      ...person,
      group_ids: person.group_ids || [],
      group_names: person.group_names || [],
      group_roles: person.group_roles || [],
      check_ins_last_4_weeks: person.check_ins_last_4_weeks || 0,
      check_ins_last_8_weeks: person.check_ins_last_8_weeks || 0,
      days_since_last_check_in: daysSince,
    };
  });

  // Apply client-side filters
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.first_name.toLowerCase().includes(searchLower) ||
        p.last_name.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.phone_number?.includes(filters.search!)
    );
  }

  if (filters.grade) {
    result = result.filter((p) => p.grade === filters.grade);
  }

  if (filters.groupId) {
    result = result.filter((p) => p.group_ids.includes(filters.groupId!));
  }

  if (filters.isClaimed !== undefined) {
    result = result.filter((p) => p.is_claimed === filters.isClaimed);
  }

  return result;
}

export function usePeople(
  organizationId: string | null,
  tab: PeopleTab = "students",
  filters: PeopleFilters = {},
  includeArchived: boolean = false
) {
  return useQuery({
    queryKey: ["people", organizationId, tab, filters, includeArchived],
    queryFn: () => fetchPeople(organizationId!, tab, filters, includeArchived),
    enabled: !!organizationId,
  });
}

// Convenience hooks for specific tabs
export function useStudentPeople(
  organizationId: string | null,
  filters: PeopleFilters = {}
) {
  return usePeople(organizationId, "students", filters);
}

export function useTeamPeople(
  organizationId: string | null,
  filters: PeopleFilters = {}
) {
  return usePeople(organizationId, "team", filters);
}

export function useParentPeople(
  organizationId: string | null,
  filters: PeopleFilters = {}
) {
  return usePeople(organizationId, "parents", filters);
}

// Get counts for each tab (for badge display)
export function usePeopleCounts(organizationId: string | null) {
  const studentsQuery = usePeople(organizationId, "students", {});
  const teamQuery = usePeople(organizationId, "team", {});
  const parentsQuery = usePeople(organizationId, "parents", {});

  return {
    students: studentsQuery.data?.length ?? 0,
    team: teamQuery.data?.length ?? 0,
    parents: parentsQuery.data?.length ?? 0,
    isLoading:
      studentsQuery.isLoading ||
      teamQuery.isLoading ||
      parentsQuery.isLoading,
  };
}
