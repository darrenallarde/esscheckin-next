"use client";

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InsightsListView } from "./InsightsListView";
import { InsightsActions } from "./InsightsActions";
import type { PersonResult, DrillDownContext } from "@/lib/insights/types";

interface InsightsDrillDownProps {
  context: DrillDownContext;
  people: PersonResult[];
  queryText: string;
  organizationId: string | null;
  onBack: () => void;
}

export function InsightsDrillDown({
  context,
  people,
  queryText,
  organizationId,
  onBack,
}: InsightsDrillDownProps) {
  const profileIds = people.map((p) => p.profileId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4 space-y-0">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Back to chart</span>
        </Button>
        <div>
          <CardTitle className="text-lg">
            {context.segmentLabel} - {context.period}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {people.length} student{people.length === 1 ? "" : "s"} checked in
            during this period
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <InsightsListView
          people={people}
          organizationId={organizationId}
        />

        <InsightsActions
          mode="list"
          profileIds={profileIds}
          queryText={`${queryText} (${context.segmentLabel} - ${context.period})`}
          resultCount={people.length}
          people={people}
          organizationId={organizationId}
        />
      </CardContent>
    </Card>
  );
}
