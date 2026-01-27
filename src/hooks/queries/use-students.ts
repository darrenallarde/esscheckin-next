import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Student {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  high_school: string | null;
  user_type: string | null;
  total_points: number;
  current_rank: string;
  last_check_in: string | null;
  days_since_last_check_in: number | null;
  total_check_ins: number;
  groups: Array<{ id: string; name: string; color: string | null }>;
}

async function fetchStudents(): Promise<Student[]> {
  const supabase = createClient();

  // Get all students with game stats and group memberships
  const { data: students, error } = await supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      phone_number,
      email,
      grade,
      high_school,
      user_type,
      student_game_stats(total_points, current_rank),
      group_members(
        groups(id, name, color)
      )
    `)
    .order("first_name");

  if (error) throw error;

  // Get check-in counts and last check-in for each student
  const studentIds = students?.map((s) => s.id) || [];

  const { data: checkInData } = await supabase
    .from("check_ins")
    .select("student_id, checked_in_at")
    .in("student_id", studentIds)
    .order("checked_in_at", { ascending: false });

  // Build check-in maps
  const lastCheckInMap = new Map<string, string>();
  const checkInCountMap = new Map<string, number>();

  (checkInData || []).forEach((ci) => {
    if (!lastCheckInMap.has(ci.student_id)) {
      lastCheckInMap.set(ci.student_id, ci.checked_in_at);
    }
    checkInCountMap.set(ci.student_id, (checkInCountMap.get(ci.student_id) || 0) + 1);
  });

  const today = new Date();

  return (students || []).map((student) => {
    const gameStats = (student.student_game_stats as Array<{ total_points: number; current_rank: string }>)?.[0];
    const lastCheckIn = lastCheckInMap.get(student.id);
    const daysSince = lastCheckIn
      ? Math.floor((today.getTime() - new Date(lastCheckIn).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups = (student.group_members as any[])
      ?.map((gm) => gm.groups)
      .filter(Boolean) || [];

    return {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      phone_number: student.phone_number,
      email: student.email,
      grade: student.grade,
      high_school: student.high_school,
      user_type: student.user_type,
      total_points: gameStats?.total_points || 0,
      current_rank: gameStats?.current_rank || "Newcomer",
      last_check_in: lastCheckIn || null,
      days_since_last_check_in: daysSince,
      total_check_ins: checkInCountMap.get(student.id) || 0,
      groups,
    };
  });
}

export function useStudents() {
  return useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
  });
}

// Search students (for adding to groups)
async function searchStudents(query: string): Promise<Student[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      phone_number,
      email,
      grade,
      high_school,
      user_type,
      student_game_stats(total_points, current_rank)
    `)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;

  return (data || []).map((student) => {
    const gameStats = (student.student_game_stats as Array<{ total_points: number; current_rank: string }>)?.[0];
    return {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      phone_number: student.phone_number,
      email: student.email,
      grade: student.grade,
      high_school: student.high_school,
      user_type: student.user_type,
      total_points: gameStats?.total_points || 0,
      current_rank: gameStats?.current_rank || "Newcomer",
      last_check_in: null,
      days_since_last_check_in: null,
      total_check_ins: 0,
      groups: [],
    };
  });
}

export function useSearchStudents(query: string) {
  return useQuery({
    queryKey: ["search-students", query],
    queryFn: () => searchStudents(query),
    enabled: query.length >= 2,
  });
}
