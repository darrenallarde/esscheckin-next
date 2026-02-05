/**
 * AI Insights - Time Series Aggregation
 *
 * Aggregates check-in data into time series for chart visualization.
 */

import type {
  TimeRangeExtraction,
  TimeGranularity,
  ChartDataPoint,
  MetricType,
} from "./types";

/**
 * Check-in record from database
 */
export interface CheckInRecord {
  id: string;
  profile_id: string;
  checked_in_at: string;
  organization_id: string;
}

/**
 * Calculate date range based on TimeRangeExtraction
 */
export function getDateRange(timeRange: TimeRangeExtraction): {
  start: Date;
  end: Date;
} {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;

  switch (timeRange.range) {
    case "last_7_days":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "last_30_days":
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case "last_60_days":
      start = new Date(now);
      start.setDate(start.getDate() - 60);
      break;
    case "last_90_days":
      start = new Date(now);
      start.setDate(start.getDate() - 90);
      break;
    case "last_6_months":
      start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      break;
    case "last_year":
      start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "this_semester":
      // Assume semester starts in August or January
      start = new Date(now);
      if (now.getMonth() >= 7) {
        // Aug-Dec: fall semester
        start.setMonth(7, 1); // August 1
      } else {
        // Jan-Jul: spring semester
        start.setMonth(0, 1); // January 1
      }
      break;
    case "custom":
      start = timeRange.customStart
        ? new Date(timeRange.customStart)
        : new Date(now.setDate(now.getDate() - 30));
      if (timeRange.customEnd) {
        end.setTime(new Date(timeRange.customEnd).getTime());
      }
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 60);
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}

/**
 * Generate time periods based on granularity
 */
export function generatePeriods(
  start: Date,
  end: Date,
  granularity: TimeGranularity
): Array<{ label: string; start: Date; end: Date }> {
  const periods: Array<{ label: string; start: Date; end: Date }> = [];
  const current = new Date(start);

  while (current < end) {
    const periodStart = new Date(current);
    let periodEnd: Date;
    let label: string;

    switch (granularity) {
      case "daily":
        periodEnd = new Date(current);
        periodEnd.setDate(periodEnd.getDate() + 1);
        label = periodStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        current.setDate(current.getDate() + 1);
        break;

      case "weekly":
        // Start weeks on Sunday
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && periods.length === 0) {
          // Adjust first period to start of week
          current.setDate(current.getDate() - dayOfWeek);
          continue;
        }
        periodEnd = new Date(current);
        periodEnd.setDate(periodEnd.getDate() + 7);
        label = `Week of ${periodStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`;
        current.setDate(current.getDate() + 7);
        break;

      case "monthly":
        // Start months on 1st
        if (current.getDate() !== 1 && periods.length === 0) {
          current.setDate(1);
          continue;
        }
        periodEnd = new Date(current);
        periodEnd.setMonth(periodEnd.getMonth() + 1);
        label = periodStart.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        });
        current.setMonth(current.getMonth() + 1);
        break;

      default:
        periodEnd = new Date(current);
        periodEnd.setDate(periodEnd.getDate() + 7);
        label = periodStart.toISOString().split("T")[0];
        current.setDate(current.getDate() + 7);
    }

    // Don't include periods that extend beyond our end date
    if (periodStart < end) {
      periods.push({
        label,
        start: periodStart,
        end: periodEnd > end ? new Date(end) : periodEnd,
      });
    }
  }

  return periods;
}

/**
 * Aggregate check-ins by segment and time period.
 * Supports multiple metric types:
 *  - unique_checkins: count distinct people who checked in (default)
 *  - total_checkins: total check-in count including duplicates
 *  - attendance_rate: percentage of segment that checked in
 *  - new_students: first-time check-ins within the period
 */
export function aggregateCheckIns(
  checkIns: CheckInRecord[],
  segmentProfileIds: Map<string, string[]>,
  timeRange: TimeRangeExtraction,
  metric: MetricType = "unique_checkins",
  allCheckIns?: CheckInRecord[] // Full history needed for new_students
): ChartDataPoint[] {
  const { start, end } = getDateRange(timeRange);
  const periods = generatePeriods(start, end, timeRange.granularity);

  // For new_students, pre-compute who checked in before the chart range
  let profilesSeenBefore: Set<string> | undefined;
  if (metric === "new_students") {
    profilesSeenBefore = new Set<string>();
    const allData = allCheckIns || checkIns;
    for (const ci of allData) {
      if (new Date(ci.checked_in_at) < start) {
        profilesSeenBefore.add(ci.profile_id);
      }
    }
  }

  // Track cumulative first-timers across periods for new_students
  const seenDuringChart = new Set<string>();

  return periods.map((period) => {
    const values: Record<string, number> = {};

    segmentProfileIds.forEach((profileIds, segmentLabel) => {
      const profileIdSet = new Set(profileIds);
      const periodCheckIns: CheckInRecord[] = [];

      for (const checkIn of checkIns) {
        const checkInDate = new Date(checkIn.checked_in_at);
        if (
          checkInDate >= period.start &&
          checkInDate < period.end &&
          profileIdSet.has(checkIn.profile_id)
        ) {
          periodCheckIns.push(checkIn);
        }
      }

      switch (metric) {
        case "total_checkins": {
          values[segmentLabel] = periodCheckIns.length;
          break;
        }
        case "attendance_rate": {
          const uniqueInPeriod = new Set(periodCheckIns.map((ci) => ci.profile_id));
          const total = profileIds.length;
          values[segmentLabel] =
            total > 0 ? Math.round((uniqueInPeriod.size / total) * 100) : 0;
          break;
        }
        case "new_students": {
          let count = 0;
          const uniqueInPeriod = new Set(periodCheckIns.map((ci) => ci.profile_id));
          Array.from(uniqueInPeriod).forEach((pid) => {
            if (!profilesSeenBefore!.has(pid) && !seenDuringChart.has(pid)) {
              count++;
              seenDuringChart.add(pid);
            }
          });
          values[segmentLabel] = count;
          break;
        }
        case "unique_checkins":
        default: {
          const uniqueProfiles = new Set(periodCheckIns.map((ci) => ci.profile_id));
          values[segmentLabel] = uniqueProfiles.size;
          break;
        }
      }
    });

    return {
      period: period.label,
      periodStart: period.start.toISOString(),
      periodEnd: period.end.toISOString(),
      values,
    };
  });
}

/**
 * Calculate segment statistics for chart legend
 */
export function calculateSegmentStats(
  dataPoints: ChartDataPoint[],
  segmentLabels: string[]
): Array<{
  label: string;
  total: number;
  average: number;
}> {
  return segmentLabels.map((label) => {
    const values = dataPoints.map((dp) => dp.values[label] || 0);
    const total = values.reduce((sum, v) => sum + v, 0);
    const average = values.length > 0 ? total / values.length : 0;

    return {
      label,
      total,
      average: Math.round(average * 10) / 10,
    };
  });
}

/**
 * Get profile IDs from check-ins in a specific period
 * Used for drill-down functionality
 */
export function getProfilesInPeriod(
  checkIns: CheckInRecord[],
  segmentProfileIds: string[],
  periodStart: Date,
  periodEnd: Date
): string[] {
  const uniqueProfiles = new Set<string>();

  for (const checkIn of checkIns) {
    const checkInDate = new Date(checkIn.checked_in_at);

    if (
      checkInDate >= periodStart &&
      checkInDate < periodEnd &&
      segmentProfileIds.includes(checkIn.profile_id)
    ) {
      uniqueProfiles.add(checkIn.profile_id);
    }
  }

  return Array.from(uniqueProfiles);
}
