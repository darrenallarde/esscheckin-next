import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { startOfWeek, endOfWeek, subWeeks, format, parseISO } from "date-fns";

export interface AttendanceDataPoint {
  date: string;
  displayDate: string;
  sunday: number;
  wednesday: number;
  total: number;
}

export interface DateRange {
  start: Date;
  end: Date;
}

async function fetchAttendanceData(
  organizationId: string,
  dateRange: DateRange
): Promise<AttendanceDataPoint[]> {
  const supabase = createClient();

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select("checked_in_at")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", dateRange.start.toISOString())
    .lte("checked_in_at", dateRange.end.toISOString())
    .order("checked_in_at", { ascending: true });

  if (error) throw error;

  // Group check-ins by week
  const weeklyData = new Map<string, { sunday: number; wednesday: number; total: number }>();

  (checkIns || []).forEach((ci) => {
    const date = parseISO(ci.checked_in_at);
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekKey = format(weekStart, "yyyy-MM-dd");
    const dayOfWeek = date.getDay();

    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, { sunday: 0, wednesday: 0, total: 0 });
    }

    const weekData = weeklyData.get(weekKey)!;
    weekData.total++;

    if (dayOfWeek === 0) {
      weekData.sunday++;
    } else if (dayOfWeek === 3) {
      weekData.wednesday++;
    }
  });

  // Convert to array and sort
  const result: AttendanceDataPoint[] = [];
  weeklyData.forEach((data, weekKey) => {
    result.push({
      date: weekKey,
      displayDate: format(parseISO(weekKey), "MMM d"),
      ...data,
    });
  });

  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

export function useAttendanceData(organizationId: string | null, dateRange: DateRange) {
  return useQuery({
    queryKey: ["attendance-data", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: () => fetchAttendanceData(organizationId!, dateRange),
    enabled: !!organizationId,
  });
}

// Day breakdown data
export interface DayBreakdownData {
  day: string;
  count: number;
  percentage: number;
}

async function fetchDayBreakdown(organizationId: string, dateRange: DateRange): Promise<DayBreakdownData[]> {
  const supabase = createClient();

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select("checked_in_at")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", dateRange.start.toISOString())
    .lte("checked_in_at", dateRange.end.toISOString());

  if (error) throw error;

  const dayCounts: Record<string, number> = {
    Sunday: 0,
    Wednesday: 0,
    Other: 0,
  };

  (checkIns || []).forEach((ci) => {
    const date = parseISO(ci.checked_in_at);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) {
      dayCounts.Sunday++;
    } else if (dayOfWeek === 3) {
      dayCounts.Wednesday++;
    } else {
      dayCounts.Other++;
    }
  });

  const total = Object.values(dayCounts).reduce((a, b) => a + b, 0) || 1;

  return [
    { day: "Sunday", count: dayCounts.Sunday, percentage: Math.round((dayCounts.Sunday / total) * 100) },
    { day: "Wednesday", count: dayCounts.Wednesday, percentage: Math.round((dayCounts.Wednesday / total) * 100) },
    { day: "Other", count: dayCounts.Other, percentage: Math.round((dayCounts.Other / total) * 100) },
  ];
}

export function useDayBreakdown(organizationId: string | null, dateRange: DateRange) {
  return useQuery({
    queryKey: ["day-breakdown", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: () => fetchDayBreakdown(organizationId!, dateRange),
    enabled: !!organizationId,
  });
}

// Default date range (last 8 weeks)
export function getDefaultDateRange(): DateRange {
  const end = endOfWeek(new Date(), { weekStartsOn: 0 });
  const start = startOfWeek(subWeeks(end, 7), { weekStartsOn: 0 });
  return { start, end };
}

// Preset date ranges
export const DATE_RANGE_PRESETS = [
  { label: "Last 4 weeks", weeks: 4 },
  { label: "Last 8 weeks", weeks: 8 },
  { label: "Last 12 weeks", weeks: 12 },
  { label: "Last 6 months", weeks: 26 },
  { label: "Last year", weeks: 52 },
] as const;

export function getDateRangeFromPreset(weeks: number): DateRange {
  const end = endOfWeek(new Date(), { weekStartsOn: 0 });
  const start = startOfWeek(subWeeks(end, weeks - 1), { weekStartsOn: 0 });
  return { start, end };
}

// New Student Growth data
export interface NewStudentGrowthPoint {
  date: string;
  displayDate: string;
  newStudents: number;
  cumulative: number;
}

async function fetchNewStudentGrowth(
  organizationId: string,
  dateRange: DateRange
): Promise<NewStudentGrowthPoint[]> {
  const supabase = createClient();

  // Get actual registration dates from profiles (via organization_memberships)
  // This shows when students were REGISTERED, not when they first checked in
  const { data: memberships, error } = await supabase
    .from("organization_memberships")
    .select("profile_id, created_at")
    .eq("organization_id", organizationId)
    .eq("role", "student")
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Group registrations by week within range
  const weeklyNewStudents = new Map<string, number>();

  (memberships || []).forEach((m) => {
    const date = parseISO(m.created_at);
    if (date >= dateRange.start && date <= dateRange.end) {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekKey = format(weekStart, "yyyy-MM-dd");
      weeklyNewStudents.set(weekKey, (weeklyNewStudents.get(weekKey) || 0) + 1);
    }
  });

  // Fill in all weeks in the range
  const result: NewStudentGrowthPoint[] = [];
  let currentWeek = startOfWeek(dateRange.start, { weekStartsOn: 0 });
  let cumulative = 0;

  // Count students registered before the date range (total ministry reach)
  (memberships || []).forEach((m) => {
    const date = parseISO(m.created_at);
    if (date < dateRange.start) {
      cumulative++;
    }
  });

  while (currentWeek <= dateRange.end) {
    const weekKey = format(currentWeek, "yyyy-MM-dd");
    const newCount = weeklyNewStudents.get(weekKey) || 0;
    cumulative += newCount;

    result.push({
      date: weekKey,
      displayDate: format(currentWeek, "MMM d"),
      newStudents: newCount,
      cumulative,
    });

    currentWeek = new Date(currentWeek);
    currentWeek.setDate(currentWeek.getDate() + 7);
  }

  return result;
}

export function useNewStudentGrowth(organizationId: string | null, dateRange: DateRange) {
  return useQuery({
    queryKey: ["new-student-growth", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: () => fetchNewStudentGrowth(organizationId!, dateRange),
    enabled: !!organizationId,
  });
}

// Retention data - students returning week over week
export interface RetentionDataPoint {
  date: string;
  displayDate: string;
  uniqueStudents: number;
  returningStudents: number;
  retentionRate: number;
}

async function fetchRetentionData(
  organizationId: string,
  dateRange: DateRange
): Promise<RetentionDataPoint[]> {
  const supabase = createClient();

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select("student_id, checked_in_at")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", subWeeks(dateRange.start, 1).toISOString())
    .lte("checked_in_at", dateRange.end.toISOString())
    .order("checked_in_at", { ascending: true });

  if (error) throw error;

  // Group by week and track unique students
  const weeklyStudents = new Map<string, Set<string>>();

  (checkIns || []).forEach((ci) => {
    const date = parseISO(ci.checked_in_at);
    const weekStart = startOfWeek(date, { weekStartsOn: 0 });
    const weekKey = format(weekStart, "yyyy-MM-dd");

    if (!weeklyStudents.has(weekKey)) {
      weeklyStudents.set(weekKey, new Set());
    }
    weeklyStudents.get(weekKey)!.add(ci.student_id);
  });

  // Calculate retention for each week
  const result: RetentionDataPoint[] = [];
  let currentWeek = startOfWeek(dateRange.start, { weekStartsOn: 0 });
  let previousWeekStudents: Set<string> = new Set();

  // Get previous week's students first
  const prevWeekKey = format(subWeeks(currentWeek, 1), "yyyy-MM-dd");
  previousWeekStudents = weeklyStudents.get(prevWeekKey) || new Set();

  while (currentWeek <= dateRange.end) {
    const weekKey = format(currentWeek, "yyyy-MM-dd");
    const thisWeekStudents = weeklyStudents.get(weekKey) || new Set();

    // Count students who were here last week and came back
    let returningCount = 0;
    thisWeekStudents.forEach((studentId) => {
      if (previousWeekStudents.has(studentId)) {
        returningCount++;
      }
    });

    const retentionRate = previousWeekStudents.size > 0
      ? Math.round((returningCount / previousWeekStudents.size) * 100)
      : 0;

    result.push({
      date: weekKey,
      displayDate: format(currentWeek, "MMM d"),
      uniqueStudents: thisWeekStudents.size,
      returningStudents: returningCount,
      retentionRate,
    });

    previousWeekStudents = thisWeekStudents;
    currentWeek = new Date(currentWeek);
    currentWeek.setDate(currentWeek.getDate() + 7);
  }

  return result;
}

export function useRetentionData(organizationId: string | null, dateRange: DateRange) {
  return useQuery({
    queryKey: ["retention-data", organizationId, dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: () => fetchRetentionData(organizationId!, dateRange),
    enabled: !!organizationId,
  });
}

// Export attendance data as CSV
export interface ExportableCheckIn {
  date: string;
  dayOfWeek: string;
  studentName: string;
  grade: string | null;
  checkInTime: string;
}

export async function exportAttendanceCSV(
  organizationId: string,
  dateRange: DateRange
): Promise<string> {
  const supabase = createClient();

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select(`
      checked_in_at,
      students(first_name, last_name, grade)
    `)
    .eq("organization_id", organizationId)
    .gte("checked_in_at", dateRange.start.toISOString())
    .lte("checked_in_at", dateRange.end.toISOString())
    .order("checked_in_at", { ascending: false });

  if (error) throw error;

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const rows: ExportableCheckIn[] = (checkIns || []).map((ci) => {
    const date = parseISO(ci.checked_in_at);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const student = ci.students as any;

    return {
      date: format(date, "yyyy-MM-dd"),
      dayOfWeek: dayNames[date.getDay()],
      studentName: student ? `${student.first_name} ${student.last_name}` : "Unknown",
      grade: student?.grade || "",
      checkInTime: format(date, "h:mm a"),
    };
  });

  // Generate CSV
  const headers = ["Date", "Day", "Student Name", "Grade", "Time"];
  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      [
        row.date,
        row.dayOfWeek,
        `"${row.studentName}"`,
        row.grade || "",
        row.checkInTime,
      ].join(",")
    ),
  ];

  return csvRows.join("\n");
}
