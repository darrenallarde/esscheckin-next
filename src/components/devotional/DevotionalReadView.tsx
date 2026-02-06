"use client";

import { BookOpen, Lightbulb, Heart, MessageCircle, Sun, Cloud, Moon } from "lucide-react";

export interface PublicDevotional {
  id: string;
  series_id: string;
  day_number: number;
  scheduled_date: string;
  time_slot: "morning" | "afternoon" | "evening";
  title: string;
  scripture_reference: string | null;
  scripture_text: string | null;
  reflection: string;
  prayer_prompt: string | null;
  discussion_question: string | null;
}

export interface PublicSeries {
  id: string;
  sermon_title: string | null;
  frequency: string;
  start_date: string;
  status: string;
}

export interface PublicOrganization {
  id: string;
  name: string;
  display_name: string | null;
  slug: string;
  theme_id: string | null;
}

export interface SeriesDevotionalEntry {
  id: string;
  day_number: number;
  scheduled_date: string;
  time_slot: string;
  title: string;
}

interface DevotionalReadViewProps {
  devotional: PublicDevotional;
  series: PublicSeries;
  organization: PublicOrganization;
  seriesDevotionals: SeriesDevotionalEntry[] | null;
  children?: React.ReactNode;
}

const TIME_SLOT_ICONS = {
  morning: <Sun className="h-4 w-4 text-amber-500" />,
  afternoon: <Cloud className="h-4 w-4 text-sky-500" />,
  evening: <Moon className="h-4 w-4 text-indigo-400" />,
} as const;

const TIME_SLOT_LABELS = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
} as const;

function formatDate(dateStr: string) {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function DevotionalReadView({
  devotional,
  series,
  organization,
  seriesDevotionals,
  children,
}: DevotionalReadViewProps) {
  const orgDisplayName = organization.display_name || organization.name;
  const seriesTitle = series.sermon_title || "Devotional";
  const totalDays = seriesDevotionals
    ? new Set(seriesDevotionals.map((d) => d.scheduled_date)).size
    : devotional.day_number;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              {orgDisplayName}
            </p>
            <p className="text-sm text-muted-foreground">
              Day {devotional.day_number} of {totalDays} &middot; {seriesTitle}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {TIME_SLOT_ICONS[devotional.time_slot]}
            <span>{TIME_SLOT_LABELS[devotional.time_slot]}</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Title & Date */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-semibold text-stone-900 tracking-tight">
            {devotional.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(devotional.scheduled_date)}
          </p>
        </div>

        {/* Scripture */}
        {devotional.scripture_text && (
          <section className="bg-blue-50/80 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Scripture
              </span>
            </div>
            {devotional.scripture_reference && (
              <p className="text-sm font-medium text-blue-800 mb-2">
                {devotional.scripture_reference}
              </p>
            )}
            <blockquote className="text-base italic text-blue-900 leading-relaxed border-l-3 border-blue-300 pl-4">
              {devotional.scripture_text}
            </blockquote>
          </section>
        )}

        {/* Reflection */}
        <section className="bg-amber-50/80 rounded-xl p-5 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Reflection
            </span>
          </div>
          <div className="text-base text-stone-800 leading-relaxed whitespace-pre-line">
            {devotional.reflection}
          </div>
        </section>

        {/* Prayer Prompt */}
        {devotional.prayer_prompt && (
          <section className="bg-rose-50/80 rounded-xl p-5 border border-rose-100">
            <div className="flex items-center gap-2 mb-3">
              <Heart className="h-4 w-4 text-rose-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                Prayer Prompt
              </span>
            </div>
            <p className="text-base text-stone-800 leading-relaxed">
              {devotional.prayer_prompt}
            </p>
          </section>
        )}

        {/* Discussion Question */}
        {devotional.discussion_question && (
          <section className="bg-emerald-50/80 rounded-xl p-5 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                Discussion
              </span>
            </div>
            <p className="text-base text-stone-800 leading-relaxed">
              {devotional.discussion_question}
            </p>
          </section>
        )}

        {/* Extensible slot for auth gate, series nav, etc. */}
        {children}
      </main>
    </div>
  );
}
