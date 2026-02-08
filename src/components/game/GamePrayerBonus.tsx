"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { tapScale } from "@/lib/game/timing";

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
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{
            background: "hsla(258, 90%, 66%, 0.15)",
            color: "var(--game-accent)",
            boxShadow: "0 0 16px hsla(258, 90%, 66%, 0.2)",
          }}
        >
          <Sparkles className="h-4 w-4" />
          <span className="text-sm font-bold">
            {prayerBonusAwarded ? "Pray Again" : "Bonus Round"}
          </span>
        </div>
        <h2 className="text-xl font-bold">
          {prayerBonusAwarded
            ? `${firstName ? `${firstName}, share` : "Share"} another prayer`
            : `${firstName ? `${firstName}, one` : "One"} more thing...`}
        </h2>
        <p className="text-sm" style={{ color: "var(--game-muted)" }}>
          {prayerBonusAwarded ? (
            "Your leaders will see this and pray for you"
          ) : (
            <>
              Share a prayer request and earn{" "}
              <span
                className="font-bold"
                style={{ color: "var(--game-accent)" }}
              >
                +{PRAYER_BONUS_POINTS} bonus points
              </span>
            </>
          )}
        </p>
      </div>

      {/* Prayer form */}
      <div
        className="rounded-xl p-5 border space-y-4"
        style={{
          background: "var(--game-surface)",
          borderColor: "var(--game-border)",
        }}
      >
        <div
          className="flex items-center gap-2 text-sm"
          style={{ color: "var(--game-muted)" }}
        >
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
            className="w-full px-4 py-3 rounded-xl border text-base placeholder:text-white/30 focus:outline-none focus:ring-2 disabled:opacity-50 transition-all resize-none"
            style={{
              background: "var(--game-surface)",
              borderColor: "var(--game-border)",
              color: "var(--game-text)",
            }}
          />

          <motion.button
            type="submit"
            disabled={!prayer.trim() || submitting}
            whileTap={!prayer.trim() || submitting ? undefined : tapScale}
            className="w-full py-3.5 px-6 rounded-xl text-base font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{
              background: "var(--game-accent)",
              color: "#fff",
              boxShadow: "0 0 16px hsla(258, 90%, 66%, 0.3)",
            }}
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
          </motion.button>
        </form>
      </div>

      {/* Back to results */}
      <button
        onClick={onSkip}
        disabled={submitting}
        className="w-full py-3 text-sm transition-colors flex items-center justify-center gap-1 hover:opacity-80"
        style={{ color: "var(--game-muted)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to results
      </button>
    </div>
  );
}

export { PRAYER_BONUS_POINTS };
