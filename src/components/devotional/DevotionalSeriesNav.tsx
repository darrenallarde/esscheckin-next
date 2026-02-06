"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Sun, Cloud, Moon } from "lucide-react";
import type { SeriesDevotionalEntry } from "./DevotionalReadView";

interface DevotionalSeriesNavProps {
  currentId: string;
  devotionals: SeriesDevotionalEntry[];
}

const TIME_SLOT_ICONS: Record<string, React.ReactNode> = {
  morning: <Sun className="h-3 w-3" />,
  afternoon: <Cloud className="h-3 w-3" />,
  evening: <Moon className="h-3 w-3" />,
};

function formatShortDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function DevotionalSeriesNav({ currentId, devotionals }: DevotionalSeriesNavProps) {
  const currentIndex = devotionals.findIndex((d) => d.id === currentId);
  const prev = currentIndex > 0 ? devotionals[currentIndex - 1] : null;
  const next = currentIndex < devotionals.length - 1 ? devotionals[currentIndex + 1] : null;

  return (
    <section className="space-y-4">
      {/* Prev/Next navigation */}
      <div className="flex items-center justify-between gap-4">
        {prev ? (
          <Link
            href={`/d/${prev.id}`}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="truncate">Day {prev.day_number}</span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={`/d/${next.id}`}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-stone-900 transition-colors"
          >
            <span className="truncate">Day {next.day_number}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <div />
        )}
      </div>

      {/* Full series list */}
      <details className="group">
        <summary className="text-xs font-semibold uppercase tracking-wider text-stone-500 cursor-pointer hover:text-stone-700 transition-colors">
          All devotionals in this series
        </summary>
        <div className="mt-3 space-y-1">
          {devotionals.map((d) => {
            const isCurrent = d.id === currentId;
            return (
              <Link
                key={d.id}
                href={`/d/${d.id}`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isCurrent
                    ? "bg-emerald-50 text-emerald-800 font-medium"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                <span className="text-muted-foreground w-4 shrink-0">
                  {TIME_SLOT_ICONS[d.time_slot]}
                </span>
                <span className="truncate flex-1">{d.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatShortDate(d.scheduled_date)}
                </span>
              </Link>
            );
          })}
        </div>
      </details>
    </section>
  );
}
