"use client";

import { useState, useEffect, useRef } from "react";
import { PenLine, Heart, Check, Loader2, LogOut, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDevotionalEngagement } from "@/hooks/queries/use-devotional-engagement";
import ConfettiEffect from "@/components/checkin/ConfettiEffect";

interface DevotionalEngagedViewProps {
  devotionalId: string;
  firstName: string;
  onSignOut: () => void;
}

export function DevotionalEngagedView({
  devotionalId,
  firstName,
  onSignOut,
}: DevotionalEngagedViewProps) {
  const { engagement, isLoading, isSaving, saveJournal, savePrayerRequest } =
    useDevotionalEngagement(devotionalId, true);
  const [journalText, setJournalText] = useState("");
  const [prayerText, setPrayerText] = useState("");
  const [journalSubmitted, setJournalSubmitted] = useState(false);
  const [prayerSubmitted, setPrayerSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const journalWasPreloaded = useRef(false);
  const prayerWasPreloaded = useRef(false);

  // Sync from engagement data on load
  useEffect(() => {
    if (engagement?.journal_entry) {
      setJournalText(engagement.journal_entry);
      setJournalSubmitted(true);
      journalWasPreloaded.current = true;
    }
    if (engagement?.prayer_request) {
      setPrayerText(engagement.prayer_request);
      setPrayerSubmitted(true);
      prayerWasPreloaded.current = true;
    }
  }, [engagement?.journal_entry, engagement?.prayer_request]);

  const handleJournalSubmit = async () => {
    if (!journalText.trim()) return;
    await saveJournal(journalText.trim());
    setJournalSubmitted(true);
    if (!journalWasPreloaded.current) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }
    journalWasPreloaded.current = false;
  };

  const handlePrayerSubmit = async () => {
    if (!prayerText.trim()) return;
    await savePrayerRequest(prayerText.trim());
    setPrayerSubmitted(true);
    if (!prayerWasPreloaded.current) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 100);
    }
    prayerWasPreloaded.current = false;
  };

  if (isLoading) {
    return (
      <section className="bg-white rounded-xl p-6 border border-border shadow-sm">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
      <ConfettiEffect active={showConfetti} duration={2000} />
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <p className="text-sm text-muted-foreground">
          Welcome,{" "}
          <span className="font-medium text-foreground">{firstName}</span>
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSignOut}
          className="text-muted-foreground hover:text-foreground text-xs"
        >
          <LogOut className="h-3.5 w-3.5 mr-1" />
          Sign out
        </Button>
      </div>

      {/* Journal Section */}
      <div className="px-6 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <PenLine className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Journal
          </span>
        </div>

        {journalSubmitted ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 animate-pop-in">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">
              {journalText}
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-primary font-medium">
                Submitted
              </span>
            </div>
            <button
              onClick={() => setJournalSubmitted(false)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="What stood out to you today? What is God saying to you?"
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent"
            />
            <Button
              onClick={handleJournalSubmit}
              disabled={!journalText.trim() || isSaving}
              size="sm"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5" />
              )}
              Submit Journal
            </Button>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Prayer Request Section */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-4 w-4 text-accent-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prayer Request
          </span>
        </div>

        {prayerSubmitted ? (
          <div className="rounded-lg border border-accent/20 bg-accent/5 p-4 animate-pop-in">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">
              {prayerText}
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <Check className="h-3.5 w-3.5 text-accent-foreground" />
              <span className="text-xs text-accent-foreground font-medium">
                Submitted
              </span>
            </div>
            <button
              onClick={() => setPrayerSubmitted(false)}
              className="text-xs text-muted-foreground hover:text-foreground mt-1"
            >
              Edit
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={prayerText}
              onChange={(e) => setPrayerText(e.target.value)}
              placeholder="What would you like prayer for? Be specific — God cares about the details."
              rows={3}
              className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-transparent"
            />
            <Button
              onClick={handlePrayerSubmit}
              disabled={!prayerText.trim() || isSaving}
              size="sm"
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1.5" />
              )}
              Submit Prayer Request
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
