import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { startOfDay, endOfDay, format, parseISO, differenceInDays, startOfWeek, endOfWeek } from "date-fns";
import { DateRange } from "./use-attendance-data";

// Types

export interface TodayCheckIn {
  id: string;
  student_id: string;
  checked_in_at: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  groups: string[];
}

export interface TodayStats {
  totalCheckIns: number;
  uniqueStudents: number;
  peakHour: string | null;
}

export interface StudentAttendanceListItem {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  groups: { id: string; name: string; color: string | null }[];
  total_check_ins: number;
  last_check_in: string | null;
  days_since_last_check_in: number | null;
}

export interface StudentAttendanceHistoryItem {
  id: string;
  checked_in_at: string;
  group_name: string | null;
}

export interface GroupAttendanceStat {
  id: string;
  name: string;
  color: string | null;
  member_count: number;
  unique_attendees: number;
  attendance_rate: number;
  weekly_data: { week: string; rate: number }[];
}

// Fetch today's check-ins
async function fetchTodayCheckIns(organizationId: string): Promise<TodayCheckIn[]> {
  const supabase = createClient();
  const today = new Date();

  const { data, error } = await supabase
    .from("check_ins")
    .select(`
      id,
      student_id,
      checked_in_at,
      students(
        id,
        first_name,
        last_name,
        grade,
        group_members(
          groups(id, name, color)
        )
      )
    `)
    .eq("organization_id", organizationId)
    .gte("checked_in_at", startOfDay(today).toISOString())
    .lte("checked_in_at", endOfDay(today).toISOString())
    .order("checked_in_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((ci) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = ci.students as any;
    const groups = student?.group_members?.map((gm: { groups: { id: string; name: string; color: string | null } }) => gm.groups?.name).filter(Boolean) || [];

    return {
      id: ci.id,
      student_id: ci.student_id,
      checked_in_at: ci.checked_in_at,
      first_name: student?.first_name || "",
      last_name: student?.last_name || "",
      grade: student?.grade || null,
      groups,
    };
  });
}

export function useTodayCheckIns(organizationId: string | null) {
  return useQuery({
    queryKey: ["today-check-ins", organizationId],
    queryFn: () => fetchTodayCheckIns(organizationId!),
    enabled: !!organizationId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Get today's stats
export function useTodayStats(checkIns: TodayCheckIn[] | undefined): TodayStats {
  if (!checkIns || checkIns.length === 0) {
    return { totalCheckIns: 0, uniqueStudents: 0, peakHour: null };
  }

  const uniqueStudentIds = new Set(checkIns.map((ci) => ci.student_id));

  // Find peak hour
  const hourCounts: Record<number, number> = {};
  checkIns.forEach((ci) => {
    const hour = parseISO(ci.checked_in_at).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  let peakHour: string | null = null;
  let maxCount = 0;
  Object.entries(hourCounts).forEach(([hour, count]) => {
    if (count > maxCount) {
      maxCount = count;
      const hourNum = parseInt(hour, 10);
      const ampm = hourNum >= 12 ? "PM" : "AM";
      const hour12 = hourNum % 12 || 12;
      peakHour = `${hour12}:00 ${ampm}`;
    }
  });

  return {
    totalCheckIns: checkIns.length,
    uniqueStudents: uniqueStudentIds.size,
    peakHour,
  };
}

// Manual check-in mutation
export function useManualCheckIn() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ studentId }: { studentId: string }) => {
      const { data, error } = await supabase.rpc("checkin_student", {
        p_student_id: studentId,
      });

      if (error) throw error;
      if (!data?.[0]?.success) {
        throw new Error(data?.[0]?.message || "Check-in failed");
      }

      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-check-ins"] });
      queryClient.invalidateQueries({ queryKey: ["student-attendance-list"] });
    },
  });
}

// Student search for manual check-in
export interface SearchStudentResult {
  student_id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  user_type: string;
}

async function searchStudents(searchTerm: string): Promise<SearchStudentResult[]> {
  const supabase = createClient();

  let cleanedSearch = searchTerm.trim();
  if (/\d/.test(cleanedSearch)) {
    cleanedSearch = cleanedSearch
      .replace(/[\s\-\.\(\)]/g, "")
      .replace(/^\+?1/, "");
  }

  const { data, error } = await supabase.rpc("search_student_for_checkin", {
    p_search_term: cleanedSearch,
  });

  if (error) throw error;

  return (data || []).map((r: { student_id: string; first_name: string; last_name: string; grade: string | null; user_type: string }) => ({
    student_id: r.student_id,
    first_name: r.first_name,
    last_name: r.last_name,
    grade: r.grade,
    user_type: r.user_type,
  }));
}

export function useSearchStudents(searchTerm: string) {
  return useQuery({
    queryKey: ["search-students", searchTerm],
    queryFn: () => searchStudents(searchTerm),
    enabled: searchTerm.length >= 2,
  });
}

// Student attendance list
async function fetchStudentAttendanceList(
  organizationId: string,
  searchQuery: string,
  groupFilter: string | null
): Promise<StudentAttendanceListItem[]> {
  const supabase = createClient();

  // First get students with their groups
  let query = supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      grade,
      group_members(
        groups(id, name, color)
      )
    `)
    .eq("organization_id", organizationId)
    .order("last_name");

  // Apply search filter
  if (searchQuery) {
    query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`);
  }

  const { data: students, error: studentsError } = await query;
  if (studentsError) throw studentsError;

  if (!students || students.length === 0) {
    return [];
  }

  // Get student IDs
  const studentIds = students.map((s) => s.id);

  // Get check-in counts and last check-in for each student
  const { data: checkInData, error: checkInError } = await supabase
    .from("check_ins")
    .select("student_id, checked_in_at")
    .in("student_id", studentIds)
    .eq("organization_id", organizationId)
    .order("checked_in_at", { ascending: false });

  if (checkInError) throw checkInError;

  // Aggregate check-in data
  const checkInMap = new Map<string, { count: number; last: string | null }>();
  studentIds.forEach((id) => checkInMap.set(id, { count: 0, last: null }));

  (checkInData || []).forEach((ci) => {
    const existing = checkInMap.get(ci.student_id);
    if (existing) {
      existing.count++;
      if (!existing.last) {
        existing.last = ci.checked_in_at;
      }
    }
  });

  const today = new Date();

  // Map to result format
  let results: StudentAttendanceListItem[] = students.map((student) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const groups = (student.group_members as any[])
      ?.map((gm) => gm.groups)
      .filter(Boolean) || [];

    const checkInInfo = checkInMap.get(student.id) || { count: 0, last: null };
    const daysSince = checkInInfo.last
      ? differenceInDays(today, parseISO(checkInInfo.last))
      : null;

    return {
      id: student.id,
      first_name: student.first_name,
      last_name: student.last_name,
      grade: student.grade,
      groups,
      total_check_ins: checkInInfo.count,
      last_check_in: checkInInfo.last,
      days_since_last_check_in: daysSince,
    };
  });

  // Apply group filter
  if (groupFilter) {
    results = results.filter((student) =>
      student.groups.some((g) => g.id === groupFilter)
    );
  }

  return results;
}

export function useStudentAttendanceList(
  organizationId: string | null,
  searchQuery: string,
  groupFilter: string | null
) {
  return useQuery({
    queryKey: ["student-attendance-list", organizationId, searchQuery, groupFilter],
    queryFn: () => fetchStudentAttendanceList(organizationId!, searchQuery, groupFilter),
    enabled: !!organizationId,
  });
}

// Student attendance history
async function fetchStudentAttendanceHistory(
  studentId: string
): Promise<StudentAttendanceHistoryItem[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("check_ins")
    .select("id, checked_in_at")
    .eq("student_id", studentId)
    .order("checked_in_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return (data || []).map((ci) => ({
    id: ci.id,
    checked_in_at: ci.checked_in_at,
    group_name: null, // Could be enhanced to include group if needed
  }));
}

export function useStudentAttendanceHistory(studentId: string | null) {
  return useQuery({
    queryKey: ["student-attendance-history", studentId],
    queryFn: () => fetchStudentAttendanceHistory(studentId!),
    enabled: !!studentId,
  });
}

// Group attendance stats
async function fetchGroupAttendanceStats(
  organizationId: string,
  dateRange: DateRange
): Promise<GroupAttendanceStat[]> {
  const supabase = createClient();

  // Get all groups with their members
  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select(`
      id,
      name,
      color,
      group_members(student_id)
    `)
    .eq("organization_id", organizationId);

  if (groupsError) throw groupsError;

  if (!groups || groups.length === 0) {
    return [];
  }

  // Get all check-ins in the date range
  const { data: checkIns, error: checkInsError } = await supabase
    .from("check_ins")
    .select("student_id, checked_in_at")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", dateRange.start.toISOString())
    .lte("checked_in_at", dateRange.end.toISOString());

  if (checkInsError) throw checkInsError;

  // Calculate weekly data for sparklines
  const weeks: { start: Date; end: Date; key: string }[] = [];
  let currentWeekStart = startOfWeek(dateRange.start, { weekStartsOn: 0 });
  while (currentWeekStart <= dateRange.end) {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 0 });
    weeks.push({
      start: currentWeekStart,
      end: weekEnd > dateRange.end ? dateRange.end : weekEnd,
      key: format(currentWeekStart, "MM/dd"),
    });
    currentWeekStart = new Date(currentWeekStart);
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
  }

  return groups.map((group) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const memberIds = new Set((group.group_members as any[])?.map((gm) => gm.student_id) || []);
    const memberCount = memberIds.size;

    if (memberCount === 0) {
      return {
        id: group.id,
        name: group.name,
        color: group.color,
        member_count: 0,
        unique_attendees: 0,
        attendance_rate: 0,
        weekly_data: weeks.map((w) => ({ week: w.key, rate: 0 })),
      };
    }

    // Find unique attendees from this group
    const uniqueAttendees = new Set<string>();
    (checkIns || []).forEach((ci) => {
      if (memberIds.has(ci.student_id)) {
        uniqueAttendees.add(ci.student_id);
      }
    });

    // Calculate weekly attendance rates
    const weeklyData = weeks.map((week) => {
      const weekAttendees = new Set<string>();
      (checkIns || []).forEach((ci) => {
        const checkInDate = parseISO(ci.checked_in_at);
        if (
          memberIds.has(ci.student_id) &&
          checkInDate >= week.start &&
          checkInDate <= week.end
        ) {
          weekAttendees.add(ci.student_id);
        }
      });

      return {
        week: week.key,
        rate: Math.round((weekAttendees.size / memberCount) * 100),
      };
    });

    return {
      id: group.id,
      name: group.name,
      color: group.color,
      member_count: memberCount,
      unique_attendees: uniqueAttendees.size,
      attendance_rate: Math.round((uniqueAttendees.size / memberCount) * 100),
      weekly_data: weeklyData,
    };
  });
}

export function useGroupAttendanceStats(
  organizationId: string | null,
  dateRange: DateRange
) {
  return useQuery({
    queryKey: [
      "group-attendance-stats",
      organizationId,
      dateRange.start.toISOString(),
      dateRange.end.toISOString(),
    ],
    queryFn: () => fetchGroupAttendanceStats(organizationId!, dateRange),
    enabled: !!organizationId,
  });
}

// Export attendance data
export async function exportStudentAttendanceCSV(
  organizationId: string,
  searchQuery: string,
  groupFilter: string | null
): Promise<string> {
  const data = await fetchStudentAttendanceList(organizationId, searchQuery, groupFilter);

  const headers = ["Name", "Grade", "Groups", "Total Check-ins", "Last Check-in", "Days Since Last"];
  const csvRows = [
    headers.join(","),
    ...data.map((student) => [
      `"${student.first_name} ${student.last_name}"`,
      student.grade || "",
      `"${student.groups.map((g) => g.name).join(", ")}"`,
      student.total_check_ins,
      student.last_check_in ? format(parseISO(student.last_check_in), "yyyy-MM-dd") : "",
      student.days_since_last_check_in ?? "",
    ].join(",")),
  ];

  return csvRows.join("\n");
}
