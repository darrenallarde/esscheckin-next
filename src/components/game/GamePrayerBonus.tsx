"use client";

import { useState } from "react";
import { Heart, Loader2, ArrowLeft, Sparkles } from "lucide-react";

const PRAYER_BONUS_POINTS = 500;

interface GamePrayerBonusProps {
  firstName: string;
  prayerBonusAwarded: boolean;
  onSubmit: (prayer: string) => void;
  onSkip: () => void;
  submitting: boolean;
}

export function GamePrayerBonus({
  firstName,
  prayerBonusAwarded,
  onSubmit,
  onSkip,
  submitting,
}: GamePrayerBonusProps) {
  const [prayer, setPrayer] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = prayer.trim();
    if (!trimmed || submitting) return;
    onSubmit(trimmed);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 text-purple-800">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-bold">
            {prayerBonusAwarded ? "Pray Again" : "Bonus Round"}
          </span>
        </div>
        <h2 className="text-xl font-bold text-stone-900">
          {prayerBonusAwarded
            ? `${firstName ? `${firstName}, share` : "Share"} another prayer`
            : `${firstName ? `${firstName}, one` : "One"} more thing...`}
        </h2>
        <p className="text-sm text-stone-500">
          {prayerBonusAwarded ? (
            "Your leaders will see this and pray for you"
          ) : (
            <>
              Share a prayer request and earn{" "}
              <span className="font-bold text-purple-700">
                +{PRAYER_BONUS_POINTS} bonus points
              </span>
            </>
          )}
        </p>
      </div>

      {/* Prayer form */}
      <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Heart className="h-4 w-4 text-rose-400" />
          <span>Your leaders will see this and pray for you</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <textarea
            value={prayer}
            onChange={(e) => setPrayer(e.target.value)}
            placeholder="What's on your heart? Share a prayer request..."
            disabled={submitting}
            rows={3}
            autoFocus
            className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300 disabled:opacity-50 transition-all resize-none"
          />

          <button
            type="submit"
            disabled={!prayer.trim() || submitting}
            className="w-full py-3.5 px-6 rounded-xl bg-purple-600 text-white text-base font-semibold hover:bg-purple-700 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Heart className="h-5 w-5" />
                {prayerBonusAwarded
                  ? "Submit Prayer"
                  : `Submit Prayer (+${PRAYER_BONUS_POINTS} pts)`}
              </>
            )}
          </button>
        </form>
      </div>

      {/* Back to results */}
      <button
        onClick={onSkip}
        disabled={submitting}
        className="w-full py-3 text-sm text-stone-400 hover:text-stone-600 transition-colors flex items-center justify-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to results
      </button>
    </div>
  );
}

export { PRAYER_BONUS_POINTS };
