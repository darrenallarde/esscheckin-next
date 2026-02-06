"use client";

import { DevotionalReadView } from "@/components/devotional/DevotionalReadView";
import { DevotionalAuthGate } from "@/components/devotional/DevotionalAuthGate";
import { DevotionalSeriesNav } from "@/components/devotional/DevotionalSeriesNav";
import type {
  PublicDevotional,
  PublicSeries,
  PublicOrganization,
  SeriesDevotionalEntry,
} from "@/components/devotional/DevotionalReadView";

interface DevotionalPageProps {
  devotional: PublicDevotional;
  series: PublicSeries;
  organization: PublicOrganization;
  seriesDevotionals: SeriesDevotionalEntry[] | null;
}

export function DevotionalPage({
  devotional,
  series,
  organization,
  seriesDevotionals,
}: DevotionalPageProps) {
  return (
    <DevotionalReadView
      devotional={devotional}
      series={series}
      organization={organization}
      seriesDevotionals={seriesDevotionals}
    >
      {/* Auth gate - sign in CTA */}
      <DevotionalAuthGate />

      {/* Series navigation */}
      {seriesDevotionals && seriesDevotionals.length > 1 && (
        <DevotionalSeriesNav
          currentId={devotional.id}
          devotionals={seriesDevotionals}
        />
      )}
    </DevotionalReadView>
  );
}
