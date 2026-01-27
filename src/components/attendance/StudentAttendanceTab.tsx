"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentAttendanceTable } from "./StudentAttendanceTable";
import { StudentAttendanceModal } from "./StudentAttendanceModal";
import { useStudentAttendanceList, exportStudentAttendanceCSV } from "@/hooks/queries/use-attendance";
import { useGroups } from "@/hooks/queries/use-groups";
import { Search, Download, Filter, Loader2 } from "lucide-react";

interface StudentAttendanceTabProps {
  organizationId: string | null;
}

export function StudentAttendanceTab({ organizationId }: StudentAttendanceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"name" | "last_check_in" | "total_check_ins">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: students, isLoading } = useStudentAttendanceList(
    organizationId,
    searchQuery,
    groupFilter
  );

  const { data: groups } = useGroups(organizationId);

  // Get selected student name for modal
  const selectedStudent = students?.find((s) => s.id === selectedStudentId);
  const selectedStudentName = selectedStudent
    ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
    : undefined;

  const handleSort = (field: "name" | "last_check_in" | "total_check_ins") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleExport = async () => {
    if (!organizationId) return;

    setIsExporting(true);
    try {
      const csvContent = await exportStudentAttendanceCSV(
        organizationId,
        searchQuery,
        groupFilter
      );

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `student-attendance-${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  // Count students needing attention (7+ days absent)
  const needingAttention = students?.filter(
    (s) => s.days_since_last_check_in !== null && s.days_since_last_check_in >= 7
  ).length ?? 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Student Attendance</CardTitle>
              <CardDescription>
                {students?.length ?? 0} students{" "}
                {needingAttention > 0 && (
                  <span className="text-yellow-600">
                    · {needingAttention} needing attention
                  </span>
                )}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting || !organizationId}
            >
              {isExporting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters Row */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={groupFilter ?? "all"}
              onValueChange={(value) => setGroupFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="All Groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {groups?.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    <div className="flex items-center gap-2">
                      {group.color && (
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: group.color }}
                        />
                      )}
                      {group.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <StudentAttendanceTable
            students={students}
            loading={isLoading}
            onStudentClick={setSelectedStudentId}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
          />
        </CardContent>
      </Card>

      {/* Student History Modal */}
      <StudentAttendanceModal
        open={!!selectedStudentId}
        onOpenChange={(open) => !open && setSelectedStudentId(null)}
        studentId={selectedStudentId}
        studentName={selectedStudentName}
      />
    </div>
  );
}
