import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  owner_email: string | null;
  timezone: string | null;
  status: string | null;
  parent_organization_id: string | null;
  member_count: number;
  student_count: number;
  created_at: string;
}

async function fetchAllOrganizations(): Promise<AdminOrganization[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_all_organizations");

  if (error) throw error;

  return (data || []).map((org: {
    id: string;
    name: string;
    slug: string;
    owner_email: string | null;
    timezone: string | null;
    status: string | null;
    parent_organization_id: string | null;
    member_count: number;
    student_count: number;
    created_at: string;
  }) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    owner_email: org.owner_email,
    timezone: org.timezone,
    status: org.status,
    parent_organization_id: org.parent_organization_id,
    member_count: Number(org.member_count),
    student_count: Number(org.student_count),
    created_at: org.created_at,
  }));
}

export function useAllOrganizations() {
  return useQuery({
    queryKey: ["admin-organizations"],
    queryFn: fetchAllOrganizations,
  });
}

export interface CreateOrganizationInput {
  name: string;
  owner_email: string;
  slug?: string;
  timezone?: string;
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      const { data, error } = await supabase.rpc("create_organization", {
        p_name: input.name,
        p_owner_email: input.owner_email,
        p_slug: input.slug || null,
        p_timezone: input.timezone || "America/Los_Angeles",
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-organizations"] });
    },
  });
}

// Platform stats for admin dashboard
export interface PlatformStats {
  totalOrganizations: number;
  totalStudents: number;
  totalCheckIns: number;
  activeOrganizations: number;
}

async function fetchPlatformStats(): Promise<PlatformStats> {
  const supabase = createClient();

  // Get total organizations
  const { count: totalOrganizations } = await supabase
    .from("organizations")
    .select("*", { count: "exact", head: true });

  // Get total students
  const { count: totalStudents } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });

  // Get total check-ins
  const { count: totalCheckIns } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true });

  // Get active organizations (with activity in last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentCheckIns } = await supabase
    .from("check_ins")
    .select("organization_id")
    .gte("checked_in_at", thirtyDaysAgo.toISOString());

  const activeOrgIds = new Set(recentCheckIns?.map((c) => c.organization_id) || []);

  return {
    totalOrganizations: totalOrganizations || 0,
    totalStudents: totalStudents || 0,
    totalCheckIns: totalCheckIns || 0,
    activeOrganizations: activeOrgIds.size,
  };
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ["admin-platform-stats"],
    queryFn: fetchPlatformStats,
  });
}
