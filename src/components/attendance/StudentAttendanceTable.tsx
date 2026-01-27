"use client";

import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { StudentAttendanceListItem } from "@/hooks/queries/use-attendance";
import { cn } from "@/lib/utils";

interface StudentAttendanceTableProps {
  students: StudentAttendanceListItem[] | undefined;
  loading: boolean;
  onStudentClick?: (studentId: string) => void;
  sortField: "name" | "last_check_in" | "total_check_ins";
  sortDirection: "asc" | "desc";
  onSort: (field: "name" | "last_check_in" | "total_check_ins") => void;
}

export function StudentAttendanceTable({
  students,
  loading,
  onStudentClick,
  sortField,
  sortDirection,
  onSort,
}: StudentAttendanceTableProps) {
  // Sort students
  const sortedStudents = students ? [...students].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case "name":
        comparison = `${a.last_name} ${a.first_name}`.localeCompare(
          `${b.last_name} ${b.first_name}`
        );
        break;
      case "last_check_in":
        if (!a.last_check_in && !b.last_check_in) comparison = 0;
        else if (!a.last_check_in) comparison = 1;
        else if (!b.last_check_in) comparison = -1;
        else comparison = new Date(b.last_check_in).getTime() - new Date(a.last_check_in).getTime();
        break;
      case "total_check_ins":
        comparison = b.total_check_ins - a.total_check_ins;
        break;
    }

    return sortDirection === "asc" ? comparison : -comparison;
  }) : [];

  const SortableHeader = ({
    field,
    children,
  }: {
    field: "name" | "last_check_in" | "total_check_ins";
    children: React.ReactNode;
  }) => (
    <TableHead
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
        )}
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Groups</TableHead>
              <TableHead>Check-ins</TableHead>
              <TableHead>Last Seen</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-4" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!sortedStudents || sortedStudents.length === 0) {
    return (
      <div className="border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">No students found</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader field="name">Name</SortableHeader>
            <TableHead>Grade</TableHead>
            <TableHead>Groups</TableHead>
            <SortableHeader field="total_check_ins">Check-ins</SortableHeader>
            <SortableHeader field="last_check_in">Last Seen</SortableHeader>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStudents.map((student) => {
            const isAbsent = student.days_since_last_check_in !== null && student.days_since_last_check_in >= 7;
            const isLongAbsent = student.days_since_last_check_in !== null && student.days_since_last_check_in >= 30;
            const neverCheckedIn = student.last_check_in === null;

            return (
              <TableRow
                key={student.id}
                className={cn(
                  "cursor-pointer hover:bg-muted/50 transition-colors",
                  isLongAbsent && "bg-red-50/50",
                  isAbsent && !isLongAbsent && "bg-yellow-50/50"
                )}
                onClick={() => onStudentClick?.(student.id)}
              >
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {student.first_name} {student.last_name}
                    </span>
                    {isAbsent && (
                      <AlertTriangle
                        className={cn(
                          "h-4 w-4",
                          isLongAbsent ? "text-red-500" : "text-yellow-500"
                        )}
                      />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {student.grade ? `Grade ${student.grade}` : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {student.groups.length > 0 ? (
                      student.groups.slice(0, 2).map((group) => (
                        <Badge
                          key={group.id}
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: group.color ? `${group.color}20` : undefined,
                            borderColor: group.color || undefined,
                          }}
                        >
                          {group.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {student.groups.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{student.groups.length - 2}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium">{student.total_check_ins}</span>
                </TableCell>
                <TableCell>
                  {neverCheckedIn ? (
                    <span className="text-muted-foreground">Never</span>
                  ) : (
                    <div>
                      <span>{format(parseISO(student.last_check_in!), "MMM d, yyyy")}</span>
                      {student.days_since_last_check_in !== null && student.days_since_last_check_in > 0 && (
                        <span className={cn(
                          "block text-xs",
                          isLongAbsent ? "text-red-600" : isAbsent ? "text-yellow-600" : "text-muted-foreground"
                        )}>
                          {student.days_since_last_check_in}d ago
                        </span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
