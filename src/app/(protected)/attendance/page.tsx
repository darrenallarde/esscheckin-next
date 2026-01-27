import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">
          View check-in analytics and attendance trends
        </p>
      </div>

      {/* Analytics Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Analytics</CardTitle>
          <CardDescription>
            Charts and statistics for check-in patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Attendance charts and analytics coming soon. This will display graphs showing check-in trends over time.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
