"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTrack } from "@/lib/amplitude/hooks";
import { EVENTS } from "@/lib/amplitude/events";
import type { ChartDataPoint, ChartType } from "@/lib/insights/types";

interface InsightsChartViewProps {
  dataPoints: ChartDataPoint[];
  segments: Array<{
    label: string;
    color: string;
    total: number;
    average: number;
  }>;
  chartType: ChartType;
  organizationId?: string | null;
  onDrillDown?: (segment: string, period: string, periodStart: string, periodEnd: string, count: number) => void;
}

export function InsightsChartView({
  dataPoints,
  segments,
  chartType,
  onDrillDown,
}: InsightsChartViewProps) {
  const track = useTrack();

  // Transform data for Recharts
  const chartData = dataPoints.map((dp) => ({
    name: dp.period,
    periodStart: dp.periodStart,
    periodEnd: dp.periodEnd,
    ...dp.values,
  })) as Array<Record<string, string | number>>;

  // Handle chart click for drill-down
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = (data: any) => {
    if (!data?.activePayload || data.activePayload.length === 0) return;

    // Get the clicked point
    const payload = data.activePayload[0];
    const clickedPeriod = chartData.find((d) => d[payload.name] === payload.value);

    if (clickedPeriod && onDrillDown) {
      track(EVENTS.INSIGHTS_DRILL_DOWN_CLICKED, {
        query_text: "", // Would need to pass from parent
        segment_label: payload.name,
        period: clickedPeriod.name,
        count: payload.value,
      });

      onDrillDown(
        payload.name,
        String(clickedPeriod.name),
        String(clickedPeriod.periodStart),
        String(clickedPeriod.periodEnd),
        payload.value
      );
    }
  };

  // Custom tooltip
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <div className="mt-2 space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}:</span>
                <span className="font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Chart */}
      <div className="h-[300px] md:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart
              data={chartData}
              onClick={handleChartClick}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {segments.map((segment) => (
                <Line
                  key={segment.label}
                  type="monotone"
                  dataKey={segment.label}
                  stroke={segment.color}
                  strokeWidth={2}
                  dot={{ fill: segment.color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          ) : (
            <BarChart
              data={chartData}
              onClick={handleChartClick}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {segments.map((segment) => (
                <Bar
                  key={segment.label}
                  dataKey={segment.label}
                  fill={segment.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend with Stats */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <span className="font-medium">{segment.label}</span>
            <span className="text-muted-foreground">
              (avg: {segment.average})
            </span>
          </div>
        ))}
      </div>

      {/* Click hint */}
      {onDrillDown && (
        <p className="text-center text-xs text-muted-foreground">
          Click any data point to see who checked in during that period
        </p>
      )}
    </div>
  );
}
