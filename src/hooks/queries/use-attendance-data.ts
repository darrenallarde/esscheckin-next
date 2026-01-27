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
  dateRange: DateRange
): Promise<AttendanceDataPoint[]> {
  const supabase = createClient();

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select("checked_in_at")
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

export function useAttendanceData(dateRange: DateRange) {
  return useQuery({
    queryKey: ["attendance-data", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: () => fetchAttendanceData(dateRange),
  });
}

// Day breakdown data
export interface DayBreakdownData {
  day: string;
  count: number;
  percentage: number;
}

async function fetchDayBreakdown(dateRange: DateRange): Promise<DayBreakdownData[]> {
  const supabase = createClient();

  const { data: checkIns, error } = await supabase
    .from("check_ins")
    .select("checked_in_at")
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

export function useDayBreakdown(dateRange: DateRange) {
  return useQuery({
    queryKey: ["day-breakdown", dateRange.start.toISOString(), dateRange.end.toISOString()],
    queryFn: () => fetchDayBreakdown(dateRange),
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
