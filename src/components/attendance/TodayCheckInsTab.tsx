"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckInFeed } from "./CheckInFeed";
import { ManualCheckInDialog } from "./ManualCheckInDialog";
import { useTodayCheckIns, useTodayStats } from "@/hooks/queries/use-attendance";
import { UserPlus, Users, CheckCircle2, Clock } from "lucide-react";

interface TodayCheckInsTabProps {
  organizationId: string | null;
  onStudentClick?: (studentId: string) => void;
}

export function TodayCheckInsTab({ organizationId, onStudentClick }: TodayCheckInsTabProps) {
  const [isManualCheckInOpen, setIsManualCheckInOpen] = useState(false);

  const { data: checkIns, isLoading } = useTodayCheckIns(organizationId);
  const stats = useTodayStats(checkIns);

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Check-ins</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.totalCheckIns}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Students</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.uniqueStudents}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Peak Time</p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{stats.peakHour || "—"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feed Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Live Check-in Feed</CardTitle>
            <CardDescription>
              Real-time updates as students check in
            </CardDescription>
          </div>
          <Button onClick={() => setIsManualCheckInOpen(true)} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Manual Check-in
          </Button>
        </CardHeader>
        <CardContent>
          <CheckInFeed
            checkIns={checkIns}
            loading={isLoading}
            organizationId={organizationId}
            onStudentClick={onStudentClick}
          />
        </CardContent>
      </Card>

      {/* Manual Check-in Dialog */}
      <ManualCheckInDialog
        open={isManualCheckInOpen}
        onOpenChange={setIsManualCheckInOpen}
      />
    </div>
  );
}
