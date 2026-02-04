import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { BelongingDistribution, BelongingStatus } from "@/types/pastoral";

interface BelongingData {
  distribution: BelongingDistribution;
  totalStudents: number;
  studentsByStatus: Record<BelongingStatus, Array<{
    id: string;
    first_name: string;
    last_name: string;
    days_since_last_seen: number;
    grade: string | null;
  }>>;
}

async function fetchBelongingDistribution(organizationId: string): Promise<BelongingData> {
  const supabase = createClient();
  const today = new Date();

  // Use get_organization_people to get students with belonging_status
  const { data, error } = await supabase.rpc("get_organization_people", {
    p_org_id: organizationId,
    p_role_filter: ["student"],
    p_campus_id: null,
    p_include_archived: false,
  });

  if (error) throw error;

  // Calculate distribution from the returned data
  const distribution: BelongingDistribution = {
    "Ultra-Core": 0,
    "Core": 0,
    "Connected": 0,
    "On the Fringe": 0,
    "Missing": 0,
  };

  const studentsByStatus: Record<BelongingStatus, Array<{
    id: string;
    first_name: string;
    last_name: string;
    days_since_last_seen: number;
    grade: string | null;
  }>> = {
    "Ultra-Core": [],
    "Core": [],
    "Connected": [],
    "On the Fringe": [],
    "Missing": [],
  };

  (data || []).forEach((student: {
    profile_id: string;
    first_name: string;
    last_name: string;
    belonging_status: string | null;
    last_check_in: string | null;
    grade: string | null;
  }) => {
    // Use the server-calculated belonging_status, default to "Missing" if null
    const status = (student.belonging_status || "Missing") as BelongingStatus;

    // Calculate days since last check-in
    const lastCheckIn = student.last_check_in;
    const daysSince = lastCheckIn
      ? Math.floor(
          (today.getTime() - new Date(lastCheckIn).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 9999; // Large number for never checked in

    if (distribution[status] !== undefined) {
      distribution[status]++;
      studentsByStatus[status].push({
        id: student.profile_id,
        first_name: student.first_name,
        last_name: student.last_name,
        days_since_last_seen: daysSince,
        grade: student.grade,
      });
    }
  });

  return {
    distribution,
    totalStudents: (data || []).length,
    studentsByStatus,
  };
}

export function useBelongingDistribution(organizationId: string | null) {
  return useQuery({
    queryKey: ["belonging-distribution", organizationId],
    queryFn: () => fetchBelongingDistribution(organizationId!),
    enabled: !!organizationId,
  });
}
