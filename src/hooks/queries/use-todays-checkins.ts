import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface TodayCheckIn {
  id: string;
  student_id: string;
  checked_in_at: string;
  student: {
    id: string;
    first_name: string;
    last_name: string;
    grade: string | null;
    phone_number: string | null;
  };
}

async function fetchTodaysCheckIns(organizationId: string): Promise<TodayCheckIn[]> {
  const supabase = createClient();

  // Get start of today in local time
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("check_ins")
    .select(`
      id,
      student_id,
      checked_in_at,
      students!inner(
        id,
        first_name,
        last_name,
        grade,
        phone_number
      )
    `)
    .eq("organization_id", organizationId)
    .gte("checked_in_at", today.toISOString())
    .order("checked_in_at", { ascending: false });

  if (error) throw error;

  // Transform the data to flatten the student object
  // The !inner join returns the students object directly (not an array)
  type StudentData = {
    id: string;
    first_name: string;
    last_name: string;
    grade: string | null;
    phone_number: string | null;
  };

  return (data || []).map((row) => {
    const studentData = row.students as unknown as StudentData;
    return {
      id: row.id,
      student_id: row.student_id,
      checked_in_at: row.checked_in_at,
      student: {
        id: studentData.id,
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        grade: studentData.grade,
        phone_number: studentData.phone_number,
      },
    };
  });
}

export function useTodaysCheckIns(organizationId: string | null) {
  return useQuery({
    queryKey: ["todays-checkins", organizationId],
    queryFn: () => fetchTodaysCheckIns(organizationId!),
    enabled: !!organizationId,
    // Refetch every minute to keep it fresh
    refetchInterval: 60000,
  });
}
