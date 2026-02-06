"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Lightbulb, Heart, PenLine, Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDevotionalEngagement } from "@/hooks/queries/use-devotional-engagement";

interface DevotionalEngagedViewProps {
  devotionalId: string;
  firstName: string;
  onSignOut: () => void;
}

export function DevotionalEngagedView({ devotionalId, firstName, onSignOut }: DevotionalEngagedViewProps) {
  const { engagement, isLoading, isSaving, toggleReflected, togglePrayed, saveJournal } = useDevotionalEngagement(devotionalId, true);
  const [journalText, setJournalText] = useState("");
  const [journalDirty, setJournalDirty] = useState(false);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync journal text from engagement data
  useEffect(() => {
    if (engagement?.journal_entry && !journalDirty) {
      setJournalText(engagement.journal_entry);
    }
  }, [engagement?.journal_entry, journalDirty]);

  // Auto-save journal with debounce
  const debouncedSave = useCallback((text: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveJournal(text);
      setJournalDirty(false);
    }, 2000);
  }, [saveJournal]);

  const handleJournalChange = (text: string) => {
    setJournalText(text);
    setJournalDirty(true);
    debouncedSave(text);
  };

  // Save on blur immediately
  const handleJournalBlur = () => {
    if (journalDirty) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveJournal(journalText);
      setJournalDirty(false);
    }
  };

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-stone-500">
          Welcome, <span className="font-medium text-stone-700">{firstName}</span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="text-stone-400 hover:text-stone-600 text-xs"
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Sign out
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={toggleReflected}
          disabled={isSaving}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
            engagement?.reflected
              ? "bg-amber-100 text-amber-800 border-2 border-amber-300"
              : "bg-stone-50 text-stone-600 border border-stone-200 hover:bg-amber-50 hover:border-amber-200"
          }`}
        >
          <Lightbulb className="h-4 w-4" />
          {engagement?.reflected ? "Reflected" : "I reflected"}
        </button>

        <button
          onClick={togglePrayed}
          disabled={isSaving}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
            engagement?.prayed
              ? "bg-rose-100 text-rose-800 border-2 border-rose-300"
              : "bg-stone-50 text-stone-600 border border-stone-200 hover:bg-rose-50 hover:border-rose-200"
          }`}
        >
          <Heart className="h-4 w-4" />
          {engagement?.prayed ? "Prayed" : "I prayed"}
        </button>
      </div>

      {/* Journal */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <PenLine className="h-4 w-4 text-stone-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Journal</span>
          {journalDirty && (
            <span className="text-xs text-stone-300">saving...</span>
          )}
          {!journalDirty && engagement?.journaled_at && (
            <span className="text-xs text-green-500">saved</span>
          )}
        </div>
        <textarea
          value={journalText}
          onChange={(e) => handleJournalChange(e.target.value)}
          onBlur={handleJournalBlur}
          placeholder="What stood out to you today?"
          rows={4}
          className="w-full resize-none rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-800 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
        />
      </div>
    </section>
  );
}
