"use client";

import { useState, useEffect, useRef } from "react";
import { Heart, Check, Loader2, LogOut, Send, User } from "lucide-react";
import Link from "next/link";
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
  const { engagement, isLoading, isSaving, savePrayerRequest } =
    useDevotionalEngagement(devotionalId, true);
  const [prayerText, setPrayerText] = useState("");
  const [prayerSubmitted, setPrayerSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const prayerWasPreloaded = useRef(false);

  // Sync from engagement data on load
  useEffect(() => {
    if (engagement?.prayer_request) {
      setPrayerText(engagement.prayer_request);
      setPrayerSubmitted(true);
      prayerWasPreloaded.current = true;
    }
  }, [engagement?.prayer_request]);

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
        <div className="flex items-center gap-1">
          <Link
            href="/d/me"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
          >
            <User className="h-3.5 w-3.5" />
            My Hub
          </Link>
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
      </div>

      {/* Prayer Request Section */}
      <div className="px-6 py-5">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Prayer Request
          </span>
        </div>

        {prayerSubmitted ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 animate-pop-in">
            <p className="text-sm text-foreground/80 whitespace-pre-wrap">
              {prayerText}
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <Check className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-primary font-medium">
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
              className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-transparent"
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
