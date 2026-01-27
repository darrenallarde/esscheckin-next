import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface DashboardStats {
  totalStudents: number;
  checkInsToday: number;
  weeklyAverage: number;
  needsAttention: number;
  // Trend data for sparklines
  todayTrend: number; // percentage change from yesterday
  weeklyTrend: number; // percentage change from last week
}

async function fetchDashboardStats(organizationId: string): Promise<DashboardStats> {
  const supabase = createClient();

  // Get total students for this organization
  const { count: totalStudents, error: studentsError } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (studentsError) throw studentsError;

  // Get today's check-ins for this organization
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: checkInsToday, error: todayError } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("checked_in_at", today.toISOString());

  if (todayError) throw todayError;

  // Get yesterday's check-ins for trend
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const { count: checkInsYesterday } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("checked_in_at", yesterday.toISOString())
    .lt("checked_in_at", today.toISOString());

  // Get check-ins from last 7 days for weekly average
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: weeklyCheckIns, error: weeklyError } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("checked_in_at", weekAgo.toISOString());

  if (weeklyError) throw weeklyError;

  // Get check-ins from previous week for trend
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const { count: previousWeekCheckIns } = await supabase
    .from("check_ins")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("checked_in_at", twoWeeksAgo.toISOString())
    .lt("checked_in_at", weekAgo.toISOString());

  // Get students who haven't checked in for 30+ days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentCheckIns, error: recentError } = await supabase
    .from("check_ins")
    .select("student_id")
    .eq("organization_id", organizationId)
    .gte("checked_in_at", thirtyDaysAgo.toISOString());

  if (recentError) throw recentError;

  const activeStudentIds = new Set(recentCheckIns?.map((c) => c.student_id) || []);
  const needsAttention = (totalStudents || 0) - activeStudentIds.size;

  // Calculate trends
  const todayTrend =
    checkInsYesterday && checkInsYesterday > 0
      ? Math.round(((checkInsToday || 0) - checkInsYesterday) / checkInsYesterday * 100)
      : 0;

  const weeklyTrend =
    previousWeekCheckIns && previousWeekCheckIns > 0
      ? Math.round(((weeklyCheckIns || 0) - previousWeekCheckIns) / previousWeekCheckIns * 100)
      : 0;

  return {
    totalStudents: totalStudents || 0,
    checkInsToday: checkInsToday || 0,
    weeklyAverage: Math.round((weeklyCheckIns || 0) / 7),
    needsAttention: Math.max(0, needsAttention),
    todayTrend,
    weeklyTrend,
  };
}

export function useDashboardStats(organizationId: string | null) {
  return useQuery({
    queryKey: ["dashboard-stats", organizationId],
    queryFn: () => fetchDashboardStats(organizationId!),
    enabled: !!organizationId,
  });
}

// Weekly attendance data for the mini trend chart
export interface WeeklyAttendanceData {
  week: string;
  date: Date;
  attendance: number;
}

async function fetchWeeklyAttendance(organizationId: string): Promise<WeeklyAttendanceData[]> {
  const supabase = createClient();
  const weeks: WeeklyAttendanceData[] = [];

  // Get last 4 weeks of data
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const { count } = await supabase
      .from("check_ins")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("checked_in_at", weekStart.toISOString())
      .lt("checked_in_at", weekEnd.toISOString());

    weeks.push({
      week: `Week ${4 - i}`,
      date: weekStart,
      attendance: count || 0,
    });
  }

  return weeks;
}

export function useWeeklyAttendance(organizationId: string | null) {
  return useQuery({
    queryKey: ["weekly-attendance", organizationId],
    queryFn: () => fetchWeeklyAttendance(organizationId!),
    enabled: !!organizationId,
  });
}
