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

  // Get pastoral analytics for all students
  const { data, error } = await supabase.rpc("get_pastoral_analytics");

  if (error) throw error;

  // Filter by organization (the RPC doesn't filter by org, we need to join)
  // For now, get students for this org and match them
  const { data: orgStudents } = await supabase
    .from("students")
    .select("id")
    .eq("organization_id", organizationId);

  const orgStudentIds = new Set(orgStudents?.map(s => s.id) || []);

  // Filter analytics to only include org students
  const filteredData = (data || []).filter((s: { student_id: string }) =>
    orgStudentIds.has(s.student_id)
  );

  // Calculate distribution
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

  filteredData.forEach((student: {
    student_id: string;
    first_name: string;
    last_name: string;
    belonging_status: string;
    days_since_last_seen: number;
    grade: string | null;
  }) => {
    const status = student.belonging_status as BelongingStatus;
    if (distribution[status] !== undefined) {
      distribution[status]++;
      studentsByStatus[status].push({
        id: student.student_id,
        first_name: student.first_name,
        last_name: student.last_name,
        days_since_last_seen: student.days_since_last_seen,
        grade: student.grade,
      });
    }
  });

  return {
    distribution,
    totalStudents: filteredData.length,
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
