"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AttendanceDataPoint } from "@/hooks/queries/use-attendance-data";
import { cn } from "@/lib/utils";

interface AttendanceTrendChartProps {
  data: AttendanceDataPoint[];
  loading?: boolean;
}

type ViewMode = "combined" | "sunday" | "wednesday";
type ChartType = "area" | "bar";

export function AttendanceTrendChart({
  data,
  loading = false,
}: AttendanceTrendChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("combined");
  const [chartType, setChartType] = useState<ChartType>("area");

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: d.displayDate,
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Attendance Trends</CardTitle>
        <div className="flex gap-2">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg border p-1">
            {(["combined", "sunday", "wednesday"] as ViewMode[]).map((mode) => (
              <Button
                key={mode}
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs capitalize",
                  viewMode === mode && "bg-accent"
                )}
                onClick={() => setViewMode(mode)}
              >
                {mode === "combined" ? "All" : mode}
              </Button>
            ))}
          </div>
          {/* Chart Type Toggle */}
          <div className="flex rounded-lg border p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 text-xs", chartType === "area" && "bg-accent")}
              onClick={() => setChartType("area")}
            >
              Area
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2 text-xs", chartType === "bar" && "bg-accent")}
              onClick={() => setChartType("bar")}
            >
              Bar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "area" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSunday" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorWednesday" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                {viewMode === "combined" && (
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Total"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fill="url(#colorTotal)"
                  />
                )}
                {(viewMode === "combined" || viewMode === "sunday") && (
                  <Area
                    type="monotone"
                    dataKey="sunday"
                    name="Sunday"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fill="url(#colorSunday)"
                  />
                )}
                {(viewMode === "combined" || viewMode === "wednesday") && (
                  <Area
                    type="monotone"
                    dataKey="wednesday"
                    name="Wednesday"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    fill="url(#colorWednesday)"
                  />
                )}
                <Legend />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                {viewMode === "combined" && (
                  <Bar dataKey="total" name="Total" fill="#22c55e" radius={[4, 4, 0, 0]} />
                )}
                {(viewMode === "combined" || viewMode === "sunday") && (
                  <Bar dataKey="sunday" name="Sunday" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                )}
                {(viewMode === "combined" || viewMode === "wednesday") && (
                  <Bar dataKey="wednesday" name="Wednesday" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                )}
                <Legend />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
