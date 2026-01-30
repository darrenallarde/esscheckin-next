"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useOrganization } from "@/hooks/useOrganization";
import { orgPath } from "@/lib/navigation";
import CSVImporter from "@/components/settings/CSVImporter";

export default function ImportSettingsPage() {
  const router = useRouter();
  const { currentOrganization, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <p className="text-muted-foreground">No organization selected</p>
      </div>
    );
  }

  const handleImportComplete = () => {
    router.push(orgPath(currentOrganization.slug, "/students"));
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Header with back link */}
      <div className="flex items-center gap-4">
        <Link href={orgPath(currentOrganization.slug, "/settings/org-tools")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Import Students</h1>
          <p className="text-muted-foreground mt-1">
            Bulk import students from a CSV file
          </p>
        </div>
      </div>

      {/* CSV Importer */}
      <CSVImporter
        organizationId={currentOrganization.id}
        onComplete={handleImportComplete}
      />

      {/* Historical Check-in Import (Coming Soon) */}
      <Card>
        <CardHeader>
          <CardTitle>Import Historical Check-ins</CardTitle>
          <CardDescription>
            Upload historical attendance data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Historical check-in import coming soon. Import past attendance records from CSV.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
