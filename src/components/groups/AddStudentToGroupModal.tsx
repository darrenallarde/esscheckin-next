"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Check, Loader2 } from "lucide-react";
import { useSearchStudents } from "@/hooks/queries/use-students";
import { useAddStudentToGroup } from "@/hooks/queries/use-groups";
import { RANKS } from "@/utils/gamificationDB";

interface AddStudentToGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  groupName: string;
  existingMemberIds: string[];
}

export function AddStudentToGroupModal({
  open,
  onOpenChange,
  groupId,
  groupName,
  existingMemberIds,
}: AddStudentToGroupModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [addingId, setAddingId] = useState<string | null>(null);

  const { data: searchResults, isLoading } = useSearchStudents(searchQuery);
  const addStudent = useAddStudentToGroup();

  const handleAddStudent = async (studentId: string) => {
    setAddingId(studentId);
    try {
      await addStudent.mutateAsync({ groupId, studentId });
    } catch (error) {
      console.error("Failed to add student:", error);
    } finally {
      setAddingId(null);
    }
  };

  // Filter out students already in the group
  const availableStudents = searchResults?.filter(
    (s) => !existingMemberIds.includes(s.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Student to {groupName}</DialogTitle>
          <DialogDescription>
            Search for a student by name or phone number to add them to this group.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
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
          <div className="min-h-[200px] space-y-2">
            {searchQuery.length < 2 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                Type at least 2 characters to search
              </p>
            ) : isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : availableStudents && availableStudents.length > 0 ? (
              availableStudents.map((student) => {
                const rankInfo = RANKS.find((r) => r.title === student.current_rank) || RANKS[0];
                const isAdding = addingId === student.id;

                return (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {student.first_name} {student.last_name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: `${rankInfo.color}20`,
                            color: rankInfo.color,
                          }}
                        >
                          {rankInfo.emoji} {student.current_rank}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {student.grade ? `Grade ${student.grade}` : "No grade"}{" "}
                        {student.phone_number && `• ${student.phone_number}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddStudent(student.id)}
                      disabled={isAdding}
                    >
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })
            ) : searchQuery.length >= 2 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No students found matching &quot;{searchQuery}&quot;
              </p>
            ) : null}

            {/* Show already-in-group students */}
            {searchResults?.some((s) => existingMemberIds.includes(s.id)) && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Already in group:</p>
                {searchResults
                  .filter((s) => existingMemberIds.includes(s.id))
                  .map((student) => (
                    <div
                      key={student.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm text-muted-foreground">
                        {student.first_name} {student.last_name}
                      </span>
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
