import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ImportSettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-muted-foreground">
          Bulk import students and historical check-ins
        </p>
      </div>

      {/* Student Import */}
      <Card>
        <CardHeader>
          <CardTitle>Import Students</CardTitle>
          <CardDescription>
            Upload a CSV file to bulk import student records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Student import functionality coming soon. You&apos;ll be able to upload CSV files with student data.
          </p>
        </CardContent>
      </Card>

      {/* Check-in Import */}
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
