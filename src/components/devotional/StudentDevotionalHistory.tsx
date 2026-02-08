"use client";

import { BookOpen, Heart, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import {
  useMyDevotionalHistory,
  type MyDevotionalEntry,
} from "@/hooks/queries/use-my-devotional-history";

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function StudentDevotionalHistory() {
  const { data: devotionals, isLoading } = useMyDevotionalHistory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
      </div>
    );
  }

  if (!devotionals || devotionals.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-8 w-8 text-stone-300 mx-auto mb-2" />
        <p className="text-sm text-stone-500">
          No devotionals yet. Open a devotional to start your journey.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {devotionals.map((entry: MyDevotionalEntry) => (
        <Link
          key={entry.devotional_id}
          href={`/d/${entry.devotional_id}`}
          className="flex items-center gap-3 bg-white rounded-lg border border-stone-200 px-4 py-3 hover:bg-stone-50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-stone-800 truncate">
              {entry.title}
            </p>
            <p className="text-xs text-stone-400">
              {formatDate(entry.scheduled_date)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {entry.reflected && (
              <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
            )}
            {entry.prayed && <Heart className="h-3.5 w-3.5 text-rose-500" />}
            {entry.has_prayer_request && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600">
                PR
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
