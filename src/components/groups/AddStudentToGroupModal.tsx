"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Check, Loader2, Users, GraduationCap } from "lucide-react";
import { useAllStudentsForAssignment } from "@/hooks/queries/use-students";
import { useBulkAddStudentsToGroup } from "@/hooks/queries/use-groups";
import { RANKS } from "@/utils/gamificationDB";
import { cn } from "@/lib/utils";

const GRADE_OPTIONS = ["All Grades", "6", "7", "8", "9", "10", "11", "12"] as const;

interface AddStudentToGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
  organizationId: string;
}

export function AddStudentToGroupModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  existingMemberIds,
  organizationId,
}: AddStudentToGroupModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>("All Grades");

  const { data: allStudents, isLoading } = useAllStudentsForAssignment(organizationId);
  const bulkAddStudents = useBulkAddStudentsToGroup();

  // Filter and sort students based on search, existing membership, unassigned toggle, and grade
  const filteredStudents = useMemo(() => {
    if (!allStudents) return [];

    const filtered = allStudents.filter((student) => {
      // Exclude students already in this group
      if (existingMemberIds.includes(student.id)) return false;

      // Filter by unassigned only (not in ANY group)
      if (showUnassignedOnly && student.groups.length > 0) return false;

      // Filter by grade
      if (gradeFilter !== "All Grades" && student.grade !== gradeFilter) return false;

      // Filter by search query
      if (searchQuery.length >= 2) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          student.first_name.toLowerCase().includes(query) ||
          student.last_name.toLowerCase().includes(query) ||
          (student.phone_number && student.phone_number.includes(query));
        if (!matchesSearch) return false;
      }

      return true;
    });

    // Sort by grade (ascending), then by name
    return filtered.sort((a, b) => {
      const gradeA = parseInt(a.grade || "99", 10);
      const gradeB = parseInt(b.grade || "99", 10);
      if (gradeA !== gradeB) return gradeA - gradeB;
      return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
    });
  }, [allStudents, existingMemberIds, showUnassignedOnly, searchQuery, gradeFilter]);

  // Count unassigned students (not in any group and not already in this group)
  const unassignedCount = useMemo(() => {
    if (!allStudents) return 0;
    return allStudents.filter(
      (s) => !existingMemberIds.includes(s.id) && s.groups.length === 0
    ).length;
  }, [allStudents, existingMemberIds]);

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      // Deselect all
      setSelectedStudents(new Set());
    } else {
      // Select all filtered students
      setSelectedStudents(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleBulkAdd = async () => {
    if (selectedStudents.size === 0) return;

    try {
      await bulkAddStudents.mutateAsync({
        groupId,
        studentIds: Array.from(selectedStudents),
        organizationId,
      });
      setSelectedStudents(new Set());
      // Don't close modal so user can continue adding
    } catch (error) {
      console.error("Failed to add students:", error);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setSelectedStudents(new Set());
      setSearchQuery("");
      setShowUnassignedOnly(false);
      setGradeFilter("All Grades");
    }
    onOpenChange(open);
  };

  const allSelected = filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length;

  // Count total available (not in this group)
  const totalAvailable = useMemo(() => {
    if (!allStudents) return 0;
    return allStudents.filter((s) => !existingMemberIds.includes(s.id)).length;
  }, [allStudents, existingMemberIds]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>Add Students to {groupName}</DialogTitle>
          <DialogDescription>
            {totalAvailable} students available to add
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 gap-3">
          {/* Compact Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 py-2 border-b">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type to filter..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-[120px] h-9">
                <GraduationCap className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((grade) => (
                  <SelectItem key={grade} value={grade}>
                    {grade === "All Grades" ? "All" : `Grade ${grade}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch
                id="unassigned-only"
                checked={showUnassignedOnly}
                onCheckedChange={setShowUnassignedOnly}
              />
              <Label htmlFor="unassigned-only" className="text-sm whitespace-nowrap">
                Unassigned ({unassignedCount})
              </Label>
            </div>
            {filteredStudents.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs h-9 ml-auto"
              >
                {allSelected ? "Clear all" : `Select all ${filteredStudents.length}`}
              </Button>
            )}
          </div>

          {/* Student List - Primary Focus */}
          <div className="flex-1 overflow-auto border rounded-md min-h-[350px]">
            {isLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="divide-y">
                {filteredStudents.map((student) => {
                  const rankInfo = RANKS.find((r) => r.title === student.current_rank) || RANKS[0];
                  const isSelected = selectedStudents.has(student.id);

                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors cursor-pointer",
                        isSelected && "bg-accent"
                      )}
                      onClick={() => handleToggleStudent(student.id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleStudent(student.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {/* Prominent grade badge */}
                      <Badge
                        variant="outline"
                        className="shrink-0 font-bold text-sm min-w-[42px] justify-center"
                      >
                        {student.grade || "?"}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {student.first_name} {student.last_name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                            style={{
                              backgroundColor: `${rankInfo.color}20`,
                              color: rankInfo.color,
                            }}
                          >
                            {rankInfo.emoji} {student.current_rank}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {student.groups.length > 0 ? (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {student.groups.map((g) => g.name).join(", ")}
                            </span>
                          ) : (
                            <span className="text-amber-600">Not in any group</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                {showUnassignedOnly && unassignedCount === 0 ? (
                  <>
                    <Check className="h-12 w-12 opacity-30 mb-4" />
                    <p>All students are assigned to groups!</p>
                  </>
                ) : searchQuery.length >= 2 ? (
                  <>
                    <Search className="h-12 w-12 opacity-30 mb-4" />
                    <p>No students found matching &quot;{searchQuery}&quot;</p>
                  </>
                ) : (
                  <>
                    <Users className="h-12 w-12 opacity-30 mb-4" />
                    <p>No available students</p>
                    <p className="text-xs mt-1">All students may already be in this group</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            {selectedStudents.size > 0 && (
              <span>{selectedStudents.size} student{selectedStudents.size !== 1 ? "s" : ""} selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleClose(false)}>
              Done
            </Button>
            <Button
              onClick={handleBulkAdd}
              disabled={selectedStudents.size === 0 || bulkAddStudents.isPending}
            >
              {bulkAddStudents.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Add {selectedStudents.size > 0 ? `(${selectedStudents.size})` : "Selected"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
