"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TodayCheckInsTab } from "@/components/attendance/TodayCheckInsTab";
import { StudentAttendanceTab } from "@/components/attendance/StudentAttendanceTab";
import { GroupAttendanceTab } from "@/components/attendance/GroupAttendanceTab";
import { StudentAttendanceModal } from "@/components/attendance/StudentAttendanceModal";
import { useOrganization } from "@/hooks/useOrganization";
import { CalendarCheck, Users, UsersRound } from "lucide-react";

export default function AttendancePage() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  // State for viewing student history from any tab
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentName, setSelectedStudentName] = useState<string | undefined>();

  const handleStudentClick = (studentId: string, name?: string) => {
    setSelectedStudentId(studentId);
    setSelectedStudentName(name);
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Attendance</h1>
        <p className="text-muted-foreground mt-1">
          Track check-ins, view student attendance, and monitor group performance
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
          <TabsTrigger value="today" className="gap-2">
            <CalendarCheck className="h-4 w-4 hidden sm:inline" />
            Today
          </TabsTrigger>
          <TabsTrigger value="students" className="gap-2">
            <Users className="h-4 w-4 hidden sm:inline" />
            Students
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <UsersRound className="h-4 w-4 hidden sm:inline" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-6">
          <TodayCheckInsTab
            organizationId={organizationId}
            onStudentClick={(id) => handleStudentClick(id)}
          />
        </TabsContent>

        <TabsContent value="students" className="mt-6">
          <StudentAttendanceTab organizationId={organizationId} />
        </TabsContent>

        <TabsContent value="groups" className="mt-6">
          <GroupAttendanceTab organizationId={organizationId} />
        </TabsContent>
      </Tabs>

      {/* Global Student History Modal (for today's tab clicks) */}
      <StudentAttendanceModal
        open={!!selectedStudentId}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStudentId(null);
            setSelectedStudentName(undefined);
          }
        }}
        studentId={selectedStudentId}
        studentName={selectedStudentName}
      />
    </div>
  );
}
