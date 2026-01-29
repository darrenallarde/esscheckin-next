"use client";

import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { orgPath } from "@/lib/navigation";
import AttendanceCleanupForm from "@/components/settings/AttendanceCleanup/AttendanceCleanupForm";

export default function AttendanceCleanupPage() {
  const { currentOrganization, userRole, isLoading } = useOrganization();
  const orgSlug = currentOrganization?.slug;
  const orgId = currentOrganization?.id;

  const canManageOrg = userRole === "owner" || userRole === "admin";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canManageOrg) {
    return (
      <div className="flex flex-col gap-6 p-6 md:p-8">
        <div className="flex items-center gap-4">
          <Link href={orgPath(orgSlug, "/settings")}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Attendance Cleanup</h1>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              You don&apos;t have permission to access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Header with back link */}
      <div className="flex items-center gap-4">
        <Link href={orgPath(orgSlug, "/settings")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Attendance Cleanup</h1>
          <p className="text-muted-foreground mt-1">
            Retroactively check in students who attended but weren&apos;t recorded
          </p>
        </div>
      </div>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Add Historical Check-ins
          </CardTitle>
          <CardDescription>
            Select a date and add students who attended. Points and achievements will be awarded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {orgId && <AttendanceCleanupForm organizationId={orgId} />}
        </CardContent>
      </Card>
    </div>
  );
}
