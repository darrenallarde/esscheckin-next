"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Area,
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RetentionDataPoint } from "@/hooks/queries/use-attendance-data";

interface RetentionChartProps {
  data: RetentionDataPoint[];
  loading?: boolean;
}

export function RetentionChart({
  data,
  loading = false,
}: RetentionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Retention</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Calculate average retention rate
  const validRates = data.filter(d => d.retentionRate > 0);
  const avgRetention = validRates.length > 0
    ? Math.round(validRates.reduce((sum, d) => sum + d.retentionRate, 0) / validRates.length)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Weekly Retention</CardTitle>
        <CardDescription>
          Students returning week-over-week | Avg: {avgRetention}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                width={35}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value, name) => {
                  if (name === "Retention Rate") return [`${value}%`, name];
                  return [value, name];
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="uniqueStudents"
                name="Unique Students"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="returningStudents"
                name="Returning"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="retentionRate"
                name="Retention Rate"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#colorRetention)"
              />
              <Legend />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
