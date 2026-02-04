/**
 * AI Insights - Time Series Aggregation
 *
 * Aggregates check-in data into time series for chart visualization.
 */

import type {
  TimeRangeExtraction,
  TimeGranularity,
  ChartDataPoint,
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
 * Aggregate check-ins by segment and time period
 */
export function aggregateCheckIns(
  checkIns: CheckInRecord[],
  segmentProfileIds: Map<string, string[]>,
  timeRange: TimeRangeExtraction
): ChartDataPoint[] {
  const { start, end } = getDateRange(timeRange);
  const periods = generatePeriods(start, end, timeRange.granularity);

  return periods.map((period) => {
    const values: Record<string, number> = {};

    segmentProfileIds.forEach((profileIds, segmentLabel) => {
      // Count unique profiles that checked in during this period
      const uniqueProfiles = new Set<string>();

      for (const checkIn of checkIns) {
        const checkInDate = new Date(checkIn.checked_in_at);

        if (
          checkInDate >= period.start &&
          checkInDate < period.end &&
          profileIds.includes(checkIn.profile_id)
        ) {
          uniqueProfiles.add(checkIn.profile_id);
        }
      }

      values[segmentLabel] = uniqueProfiles.size;
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
