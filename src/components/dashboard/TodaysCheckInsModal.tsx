"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, GraduationCap, Users } from "lucide-react";
import { TodayCheckIn } from "@/hooks/queries/use-todays-checkins";
import { PersonProfileModal } from "@/components/people/PersonProfileModal";
import { Student } from "@/hooks/queries/use-students";

interface TodaysCheckInsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkIns: TodayCheckIn[];
  loading?: boolean;
}

export function TodaysCheckInsModal({
  open,
  onOpenChange,
  checkIns,
  loading = false,
}: TodaysCheckInsModalProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleStudentClick = (checkIn: TodayCheckIn) => {
    // Create a minimal Student object for the profile modal
    const studentForModal: Student = {
      id: checkIn.student.id,
      first_name: checkIn.student.first_name,
      last_name: checkIn.student.last_name,
      phone_number: checkIn.student.phone_number,
      email: null,
      grade: checkIn.student.grade,
      high_school: null,
      user_type: null,
      total_points: 0,
      current_rank: "Newcomer",
      last_check_in: checkIn.checked_in_at,
      days_since_last_check_in: 0,
      total_check_ins: 0,
      groups: [],
    };
    setSelectedStudent(studentForModal);
    setProfileOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              <span>Checked In Today</span>
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {checkIns.length} student{checkIns.length !== 1 ? "s" : ""}
              </span>
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : checkIns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium">No check-ins yet today</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your students are on their way!
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-2 pb-4">
                {checkIns.map((checkIn) => (
                  <button
                    key={checkIn.id}
                    onClick={() => handleStudentClick(checkIn)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold">
                      {checkIn.student.first_name.charAt(0)}
                      {checkIn.student.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {checkIn.student.first_name} {checkIn.student.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(checkIn.checked_in_at)}
                        </span>
                        {checkIn.student.grade && (
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3 w-3" />
                            {checkIn.student.grade}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Nested profile modal */}
      <PersonProfileModal
        person={selectedStudent}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </>
  );
}
