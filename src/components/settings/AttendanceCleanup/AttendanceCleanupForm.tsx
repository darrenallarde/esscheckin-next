"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Search, X, Users, Check, SkipForward, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSearchStudents } from "@/hooks/queries/use-students";
import { useGroups, useGroupMembers, type Group } from "@/hooks/queries/use-groups";
import { useBulkHistoricalCheckin, type CheckinResult } from "@/hooks/queries/use-attendance-cleanup";
import { useToast } from "@/hooks/use-toast";

interface SelectedStudent {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
  current_rank: string;
}

type FormView = "selection" | "submitting" | "results";

const TIME_OPTIONS = [
  { value: "17:00", label: "5:00 PM" },
  { value: "17:30", label: "5:30 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "18:30", label: "6:30 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "19:30", label: "7:30 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "20:30", label: "8:30 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "21:30", label: "9:30 PM" },
  { value: "22:00", label: "10:00 PM" },
];

interface AttendanceCleanupFormProps {
  organizationId: string;
}

export default function AttendanceCleanupForm({ organizationId }: AttendanceCleanupFormProps) {
  const { toast } = useToast();
  const bulkCheckinMutation = useBulkHistoricalCheckin();

  // Form state
  const [view, setView] = useState<FormView>("selection");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("18:30");
  const [selectedStudents, setSelectedStudents] = useState<Map<string, SelectedStudent>>(new Map());
  const [results, setResults] = useState<CheckinResult[] | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const { data: searchResults, isLoading: isSearching } = useSearchStudents(
    organizationId,
    searchQuery
  );

  // Groups state
  const { data: groups } = useGroups(organizationId);
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const { data: groupMembers, isLoading: isLoadingMembers } = useGroupMembers(activeGroupId);

  // Clear all confirmation
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Add student to selection
  const addStudent = (student: SelectedStudent) => {
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      if (!next.has(student.id)) {
        next.set(student.id, student);
      }
      return next;
    });
  };

  // Remove student from selection
  const removeStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      const next = new Map(prev);
      next.delete(studentId);
      return next;
    });
  };

  // Add all group members
  const addGroupMembers = async (group: Group) => {
    setLoadingGroupId(group.id);
    setActiveGroupId(group.id);
  };

  // Effect: When group members load, add them
  useMemo(() => {
    if (activeGroupId && groupMembers && !isLoadingMembers) {
      let addedCount = 0;
      setSelectedStudents((prev) => {
        const next = new Map(prev);
        groupMembers.forEach((member) => {
          if (!next.has(member.student_id)) {
            next.set(member.student_id, {
              id: member.student_id,
              first_name: member.first_name,
              last_name: member.last_name,
              grade: member.grade,
              current_rank: member.current_rank,
            });
            addedCount++;
          }
        });
        return next;
      });

      if (addedCount > 0) {
        const groupName = groups?.find((g) => g.id === activeGroupId)?.name || "group";
        toast({
          title: "Students added",
          description: `Added ${addedCount} student${addedCount === 1 ? "" : "s"} from ${groupName}`,
        });
      }

      setLoadingGroupId(null);
      setActiveGroupId(null);
    }
  }, [activeGroupId, groupMembers, isLoadingMembers, groups, toast]);

  // Clear all students
  const clearAll = () => {
    setSelectedStudents(new Map());
    setShowClearConfirm(false);
  };

  // Submit check-ins
  const handleSubmit = async () => {
    if (!selectedDate || selectedStudents.size === 0) return;

    setView("submitting");

    // Build timestamp with selected date and time
    const [hours, minutes] = selectedTime.split(":").map(Number);
    const timestamp = new Date(selectedDate);
    timestamp.setHours(hours, minutes, 0, 0);

    const students = Array.from(selectedStudents.values());

    try {
      const results = await bulkCheckinMutation.mutateAsync({
        students,
        checkinTimestamp: timestamp.toISOString(),
        organizationId,
      });

      setResults(results);
      setView("results");
    } catch {
      toast({
        title: "Error",
        description: "Failed to process check-ins. Please try again.",
        variant: "destructive",
      });
      setView("selection");
    }
  };

  // Reset form
  const handleReset = () => {
    setView("selection");
    setSelectedStudents(new Map());
    setSelectedDate(undefined);
    setSelectedTime("18:30");
    setSearchQuery("");
    setResults(null);
  };

  // Calculate results summary
  const resultsSummary = useMemo(() => {
    if (!results) return { created: 0, skipped: 0, failed: 0 };
    return {
      created: results.filter((r) => r.success && !r.skipped).length,
      skipped: results.filter((r) => r.skipped).length,
      failed: results.filter((r) => !r.success && !r.skipped).length,
    };
  }, [results]);

  // Disable dates in the future or more than 90 days ago
  const disabledDays = (date: Date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    ninetyDaysAgo.setHours(0, 0, 0, 0);
    return date > today || date < ninetyDaysAgo;
  };

  // Submitting view
  if (view === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          Checking in {selectedStudents.size} student{selectedStudents.size === 1 ? "" : "s"}...
        </p>
      </div>
    );
  }

  // Results view
  if (view === "results" && results) {
    return (
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col items-center p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
            <Check className="h-6 w-6 text-green-600 mb-2" />
            <span className="text-2xl font-bold text-green-600">{resultsSummary.created}</span>
            <span className="text-sm text-green-600/80">Checked In</span>
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30">
            <SkipForward className="h-6 w-6 text-blue-600 mb-2" />
            <span className="text-2xl font-bold text-blue-600">{resultsSummary.skipped}</span>
            <span className="text-sm text-blue-600/80">Already Checked In</span>
          </div>
          {resultsSummary.failed > 0 && (
            <div className="flex flex-col items-center p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
              <AlertCircle className="h-6 w-6 text-red-600 mb-2" />
              <span className="text-2xl font-bold text-red-600">{resultsSummary.failed}</span>
              <span className="text-sm text-red-600/80">Failed</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="max-h-[300px] overflow-y-auto border rounded-lg">
          <div className="divide-y">
            {results.map((result) => (
              <div
                key={result.studentId}
                className="flex items-center justify-between p-3"
              >
                <span className="font-medium">{result.studentName}</span>
                <span
                  className={cn(
                    "text-sm",
                    result.success && !result.skipped && "text-green-600",
                    result.skipped && "text-blue-600",
                    !result.success && !result.skipped && "text-red-600"
                  )}
                >
                  {result.success && !result.skipped && "Checked in"}
                  {result.skipped && "Already checked in"}
                  {!result.success && !result.skipped && result.message}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-center">
          <Button onClick={handleReset}>Check in more students</Button>
        </div>
      </div>
    );
  }

  // Selection view (default)
  return (
    <div className="space-y-6">
      {/* Date & Time Selection */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium mb-2 block">Date</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={disabledDays}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="w-full sm:w-[140px]">
          <label className="text-sm font-medium mb-2 block">Time</label>
          <Select value={selectedTime} onValueChange={setSelectedTime}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Add by Group */}
      {groups && groups.length > 0 && (
        <div>
          <label className="text-sm font-medium mb-2 block">Quick Add by Group</label>
          <div className="flex flex-wrap gap-2">
            {groups.map((group) => (
              <Button
                key={group.id}
                variant="outline"
                size="sm"
                onClick={() => addGroupMembers(group)}
                disabled={loadingGroupId === group.id}
                className="gap-2"
                style={{
                  borderColor: group.color || undefined,
                  color: group.color || undefined,
                }}
              >
                {loadingGroupId === group.id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Users className="h-3 w-3" />
                )}
                {group.name}
                <span className="text-muted-foreground">({group.member_count})</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Student Search */}
      <div>
        <label className="text-sm font-medium mb-2 block">Search Students</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="mt-2 border rounded-lg max-h-[200px] overflow-y-auto">
            {isSearching ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="divide-y">
                {searchResults.map((student) => {
                  const isSelected = selectedStudents.has(student.id);
                  return (
                    <button
                      key={student.id}
                      onClick={() =>
                        addStudent({
                          id: student.id,
                          first_name: student.first_name,
                          last_name: student.last_name,
                          grade: student.grade,
                          current_rank: student.current_rank,
                        })
                      }
                      disabled={isSelected}
                      className={cn(
                        "w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors",
                        isSelected && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div>
                        <span className="font-medium">
                          {student.first_name} {student.last_name}
                        </span>
                        {student.grade && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            Grade {student.grade}
                          </span>
                        )}
                      </div>
                      {isSelected ? (
                        <Badge variant="secondary">Added</Badge>
                      ) : (
                        <Badge variant="outline">+ Add</Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                No students found
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected Students */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">
            Selected Students ({selectedStudents.size})
          </label>
          {selectedStudents.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClearConfirm(true)}
              className="text-destructive hover:text-destructive"
            >
              Clear All
            </Button>
          )}
        </div>

        {selectedStudents.size === 0 ? (
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No students selected yet</p>
            <p className="text-sm">Use the search or group buttons above to add students</p>
          </div>
        ) : (
          <div className="border rounded-lg p-3 max-h-[250px] overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedStudents.values()).map((student) => (
                <Badge
                  key={student.id}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 gap-1"
                >
                  {student.grade && (
                    <span className="text-muted-foreground">[{student.grade}]</span>
                  )}
                  {student.first_name} {student.last_name}
                  <button
                    onClick={() => removeStudent(student.id)}
                    className="ml-1 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!selectedDate || selectedStudents.size === 0}
          size="lg"
        >
          Check In {selectedStudents.size} Student{selectedStudents.size === 1 ? "" : "s"}
        </Button>
      </div>

      {/* Clear All Confirmation */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all selected students?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {selectedStudents.size} selected students from the list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={clearAll}>Clear All</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
