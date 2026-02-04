"use client";

import { useState } from "react";
import { MessageSquare, Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTrack } from "@/lib/amplitude/hooks";
import { EVENTS } from "@/lib/amplitude/events";
import type {
  OutputMode,
  PersonResult,
  ChartResults,
} from "@/lib/insights/types";

interface InsightsActionsProps {
  mode: OutputMode;
  profileIds: string[];
  queryText: string;
  resultCount: number;
  people?: PersonResult[];
  chartData?: ChartResults | null;
  organizationId: string | null;
  orgSlug?: string | null;
}

export function InsightsActions({
  mode,
  profileIds,
  queryText,
  resultCount,
  people,
  chartData,
  organizationId,
  orgSlug,
}: InsightsActionsProps) {
  const track = useTrack();
  const [isExporting, setIsExporting] = useState(false);

  const handleMessageAll = () => {
    track(EVENTS.INSIGHTS_MESSAGE_CLICKED, {
      query_text: queryText,
      result_count: resultCount,
      context: mode === "list" ? "list_view" : "chart_action",
    });

    // Navigate to broadcasts page with pre-selected profile IDs
    if (profileIds.length > 0 && orgSlug) {
      const params = new URLSearchParams({
        profileIds: profileIds.join(","),
        source: "insights",
      });
      window.location.href = `/${orgSlug}/broadcasts?${params}`;
    }
  };

  const handleExportCSV = () => {
    setIsExporting(true);

    track(EVENTS.INSIGHTS_EXPORT_CLICKED, {
      export_type: "csv",
      query_text: queryText,
      result_count: resultCount,
    });

    try {
      if (mode === "list" && people) {
        exportListToCSV(people, queryText);
      } else if (mode === "chart" && chartData) {
        exportChartToCSV(chartData, queryText);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveChart = async () => {
    if (!chartData) return;

    track(EVENTS.INSIGHTS_CHART_SAVED, {
      query_text: queryText,
      segment_count: chartData.segments.length,
    });

    // TODO: Implement chart export using html2canvas
    // For now, show a message
    alert("Chart export will be available soon!");
  };

  return (
    <div className="flex flex-wrap gap-2 pt-4 border-t">
      {/* Message All - only for list mode with results */}
      {mode === "list" && profileIds.length > 0 && (
        <Button variant="outline" onClick={handleMessageAll} className="gap-2">
          <MessageSquare className="h-4 w-4" />
          Message All ({profileIds.length})
        </Button>
      )}

      {/* Export CSV */}
      <Button
        variant="outline"
        onClick={handleExportCSV}
        disabled={isExporting}
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </Button>

      {/* Save Chart - only for chart mode */}
      {mode === "chart" && (
        <Button variant="outline" onClick={handleSaveChart} className="gap-2">
          <ImageIcon className="h-4 w-4" />
          Save Chart
        </Button>
      )}
    </div>
  );
}

/**
 * Export list results to CSV
 */
function exportListToCSV(people: PersonResult[], queryText: string) {
  const headers = [
    "First Name",
    "Last Name",
    "Grade",
    "Last Check-in",
    "Check-in Count",
    "Status",
    "Groups",
    "Phone",
    "Email",
  ];

  const rows = people.map((person) => [
    person.firstName,
    person.lastName,
    person.grade?.toString() || "",
    person.lastCheckIn || "Never",
    person.checkInCount?.toString() || "0",
    person.belongingLevel || "",
    person.groups?.map((g) => g.name).join("; ") || "",
    person.phone || "",
    person.email || "",
  ]);

  downloadCSV(headers, rows, `insights-${slugify(queryText)}.csv`);
}

/**
 * Export chart data to CSV
 */
function exportChartToCSV(chartData: ChartResults, queryText: string) {
  const segmentLabels = chartData.segments.map((s) => s.label);
  const headers = ["Period", "Start Date", "End Date", ...segmentLabels];

  const rows = chartData.dataPoints.map((dp) => [
    dp.period,
    dp.periodStart.split("T")[0],
    dp.periodEnd.split("T")[0],
    ...segmentLabels.map((label) => dp.values[label]?.toString() || "0"),
  ]);

  downloadCSV(headers, rows, `insights-chart-${slugify(queryText)}.csv`);
}

/**
 * Download data as CSV file
 */
function downloadCSV(headers: string[], rows: string[][], filename: string) {
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Convert string to URL-safe slug
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 30);
}
