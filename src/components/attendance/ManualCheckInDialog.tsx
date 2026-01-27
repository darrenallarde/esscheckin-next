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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSearchStudents, useManualCheckIn, SearchStudentResult } from "@/hooks/queries/use-attendance";
import { Search, Check, Loader2, UserPlus } from "lucide-react";

interface ManualCheckInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualCheckInDialog({ open, onOpenChange }: ManualCheckInDialogProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<SearchStudentResult | null>(null);

  const { data: searchResults, isLoading: isSearching } = useSearchStudents(searchTerm);
  const { mutate: checkIn, isPending: isCheckingIn } = useManualCheckIn();

  const handleCheckIn = () => {
    if (!selectedStudent) return;

    checkIn(
      { studentId: selectedStudent.student_id },
      {
        onSuccess: (result) => {
          toast({
            title: "Check-in successful!",
            description: `${result.first_name} has been checked in.`,
          });
          handleClose();
        },
        onError: (error) => {
          toast({
            title: "Check-in failed",
            description: error instanceof Error ? error.message : "An error occurred",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleClose = () => {
    setSearchTerm("");
    setSelectedStudent(null);
    onOpenChange(false);
  };

  const handleSelectStudent = (student: SearchStudentResult) => {
    setSelectedStudent(student);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Manual Check-In
          </DialogTitle>
          <DialogDescription>
            Search for a student by name or phone number to check them in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedStudent(null);
              }}
              className="pl-9"
              autoFocus
            />
          </div>

          {/* Search Results */}
          {searchTerm.length >= 2 && !selectedStudent && (
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {isSearching ? (
                <div className="p-3 space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : searchResults && searchResults.length > 0 ? (
                <div className="divide-y">
                  {searchResults.map((student) => (
                    <button
                      key={student.student_id}
                      onClick={() => handleSelectStudent(student)}
                      className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <p className="font-medium">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {student.user_type === "student_leader"
                          ? "Student Leader"
                          : student.grade
                            ? `Grade ${student.grade}`
                            : "Student"}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  No students found
                </div>
              )}
            </div>
          )}

          {/* Selected Student */}
          {selectedStudent && (
            <div className="border rounded-lg p-4 bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {selectedStudent.first_name.charAt(0)}
                  {selectedStudent.last_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-lg">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStudent.user_type === "student_leader"
                      ? "Student Leader"
                      : selectedStudent.grade
                        ? `Grade ${selectedStudent.grade}`
                        : "Student"}
                  </p>
                </div>
                <Check className="h-5 w-5 text-primary" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={!selectedStudent || isCheckingIn}
              className="flex-1"
            >
              {isCheckingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking in...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Check In
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
