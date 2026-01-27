"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DayBreakdownData } from "@/hooks/queries/use-attendance-data";

interface DayBreakdownChartProps {
  data: DayBreakdownData[];
  loading?: boolean;
}

const DAY_COLORS: Record<string, string> = {
  Sunday: "#f59e0b",
  Wednesday: "#8b5cf6",
  Other: "#6b7280",
};

export function DayBreakdownChart({ data, loading = false }: DayBreakdownChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Day Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Day Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="day"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value, _name, props) => {
                  const payload = props.payload as DayBreakdownData;
                  return [`${value} check-ins (${payload.percentage}%)`, payload.day];
                }}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell key={entry.day} fill={DAY_COLORS[entry.day] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with percentages */}
        <div className="mt-4 flex flex-wrap gap-4">
          {data.map((entry) => (
            <div key={entry.day} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: DAY_COLORS[entry.day] }}
              />
              <span className="text-sm">
                {entry.day}:{" "}
                <span className="font-medium">{entry.count}</span>
                <span className="text-muted-foreground"> ({entry.percentage}%)</span>
              </span>
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs text-muted-foreground text-center">
          {total} total check-ins in selected period
        </p>
      </CardContent>
    </Card>
  );
}
