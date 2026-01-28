import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CurriculumPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Curriculum</h1>
        <p className="text-muted-foreground">
          Manage weekly teaching topics and sermon content
        </p>
      </div>

      {/* Curriculum Management */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Curriculum</CardTitle>
          <CardDescription>
            Set the current week&apos;s teaching topic for AI recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Curriculum management coming soon. This will allow you to set weekly topics, scripture, and key principles for AI-generated pastoral recommendations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
