"use client";

import { useState, useCallback, useMemo } from "react";
import { User, Download, MessageSquare } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import type { SqlListResults } from "@/lib/insights/types-v2";

interface InsightsSqlResultsProps {
  results: SqlListResults;
  organizationId: string | null;
  orgSlug?: string | null;
  onPersonClick?: (profileId: string) => void;
}

/**
 * Format a cell value for display based on its type and column name.
 */
function formatCellValue(value: unknown, column: string): string {
  if (value === null || value === undefined) return "-";

  // Date columns (exact match to avoid treating count columns like total_check_ins as dates)
  if (
    column === "last_check_in" ||
    column === "membership_created_at" ||
    column.endsWith("_at") ||
    column === "last_text_date"
  ) {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return String(value);
    return formatRelativeDate(date);
  }

  // Date of birth
  if (column === "date_of_birth") {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Boolean columns
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  // Array columns (group_names, group_roles, etc.)
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    return value.join(", ");
  }

  return String(value);
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function InsightsSqlResults({
  results,
  orgSlug,
  onPersonClick,
}: InsightsSqlResultsProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Check if profile_id is available for selection
  const hasProfileId = results.data.length > 0 && "profile_id" in results.data[0];

  const allProfileIds = useMemo(() => {
    if (!hasProfileId) return [];
    return results.data
      .map((row) => String(row.profile_id))
      .filter(Boolean);
  }, [results.data, hasProfileId]);

  // Auto-select all on mount
  useMemo(() => {
    if (allProfileIds.length > 0 && selectedIds.size === 0) {
      setSelectedIds(new Set(allProfileIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProfileIds]);

  const toggleSelection = useCallback((profileId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) {
        next.delete(profileId);
      } else {
        next.add(profileId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === allProfileIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allProfileIds));
    }
  }, [selectedIds.size, allProfileIds]);

  const displayedData = showAll ? results.data : results.data.slice(0, 10);
  const hasMore = results.data.length > 10;

  // Filter out profile_id and organization_id from display columns (shown internally, not in table)
  const visibleColumns = results.displayColumns.filter(
    (col) => col !== "profile_id" && col !== "organization_id"
  );
  const visibleLabels = results.displayColumns.reduce<string[]>(
    (acc, col, idx) => {
      if (col !== "profile_id" && col !== "organization_id") {
        acc.push(results.displayLabels[idx] || col);
      }
      return acc;
    },
    []
  );

  const handleMessageAll = () => {
    const profileIds = Array.from(selectedIds);
    if (profileIds.length > 0 && orgSlug) {
      const params = new URLSearchParams({
        profileIds: profileIds.join(","),
        source: "insights",
      });
      window.location.href = `/${orgSlug}/broadcasts?${params}`;
    }
  };

  const handleExportCSV = () => {
    const headers = visibleLabels;
    const rows = results.data.map((row) =>
      visibleColumns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        if (Array.isArray(val)) return val.join("; ");
        return String(val);
      })
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const slug = results.rawQuery
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 30);

    link.setAttribute("href", url);
    link.setAttribute("download", `insights-${slug}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mobile card: show first 3-4 visible columns
  const mobileColumns = visibleColumns.slice(0, 4);
  const mobileLabels = visibleLabels.slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-3">
          {hasProfileId && allProfileIds.length > 0 && (
            <Checkbox
              checked={selectedIds.size === allProfileIds.length}
              onCheckedChange={toggleSelectAll}
              aria-label="Select all"
            />
          )}
          <div>
            <CardTitle className="text-lg">
              {hasProfileId
                ? selectedIds.size === allProfileIds.length
                  ? `Found ${results.totalCount} result${results.totalCount === 1 ? "" : "s"}`
                  : `${selectedIds.size} of ${results.totalCount} selected`
                : `Found ${results.totalCount} result${results.totalCount === 1 ? "" : "s"}`}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {results.summary}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Desktop Table View */}
        {results.data.length > 0 ? (
          <>
            <div className="hidden md:block">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {hasProfileId && <TableHead className="w-10"></TableHead>}
                      {visibleLabels.map((label, idx) => (
                        <TableHead key={visibleColumns[idx]}>{label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedData.map((row, rowIdx) => {
                      const profileId = hasProfileId
                        ? String(row.profile_id)
                        : null;
                      return (
                        <TableRow
                          key={profileId || rowIdx}
                          className={
                            profileId && onPersonClick
                              ? "cursor-pointer hover:bg-accent"
                              : ""
                          }
                          onClick={() => {
                            if (profileId && onPersonClick) {
                              onPersonClick(profileId);
                            }
                          }}
                        >
                          {hasProfileId && (
                            <TableCell>
                              <Checkbox
                                checked={selectedIds.has(profileId!)}
                                onCheckedChange={() =>
                                  toggleSelection(profileId!)
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </TableCell>
                          )}
                          {visibleColumns.map((col) => (
                            <TableCell key={col}>
                              {col === "status" ? (
                                <Badge variant="secondary" className="text-xs">
                                  {formatCellValue(row[col], col)}
                                </Badge>
                              ) : (
                                formatCellValue(row[col], col)
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="grid gap-3 md:hidden">
              {displayedData.map((row, rowIdx) => {
                const profileId = hasProfileId
                  ? String(row.profile_id)
                  : null;
                return (
                  <Card
                    key={profileId || rowIdx}
                    className={
                      profileId && onPersonClick
                        ? "cursor-pointer hover:bg-accent"
                        : ""
                    }
                    onClick={() => {
                      if (profileId && onPersonClick) {
                        onPersonClick(profileId);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {hasProfileId && profileId && (
                          <Checkbox
                            checked={selectedIds.has(profileId)}
                            onCheckedChange={() => toggleSelection(profileId)}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                        )}
                        <div className="flex-1 space-y-1">
                          {mobileColumns.map((col, idx) => (
                            <div key={col} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground min-w-[60px]">
                                {mobileLabels[idx]}:
                              </span>
                              <span
                                className={
                                  idx === 0 ? "font-medium" : "text-sm"
                                }
                              >
                                {formatCellValue(row[col], col)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Show More Button */}
            {hasMore && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="w-full md:w-auto"
                >
                  {showAll
                    ? "Show less"
                    : `Show all ${results.totalCount} results`}
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">No results found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try adjusting your search criteria
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          {hasProfileId && selectedIds.size > 0 && (
            <Button
              variant="outline"
              onClick={handleMessageAll}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Message All ({selectedIds.size})
            </Button>
          )}

          {results.data.length > 0 && (
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
