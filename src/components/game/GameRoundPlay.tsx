"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Loader2, AlertCircle, X } from "lucide-react";
import { getRoundDirection } from "@/lib/game/utils";
import { tapScale } from "@/lib/game/timing";
import type { RevealPhase } from "@/hooks/game/use-reveal-sequence";

interface GameRoundPlayProps {
  round: number;
  question: string;
  submitting: boolean;
  error: string | null;
  lastMiss: string | null;
  revealPhase?: RevealPhase;
  onSubmit: (answer: string) => void;
  onClearError: () => void;
}

const ROUND_MAX = { 1: 400, 2: 800, 3: 1200, 4: 1600 } as const;

export function GameRoundPlay({
  round,
  question,
  submitting,
  error,
  lastMiss,
  revealPhase = "idle",
  onSubmit,
  onClearError,
}: GameRoundPlayProps) {
  const [answer, setAnswer] = useState("");
  const direction = getRoundDirection(round);
  const isHigh = direction === "high";
  const lockedIn = revealPhase === "lock_in" || revealPhase === "buildup";

  useEffect(() => {
    if (lastMiss) {
      setAnswer("");
    }
  }, [lastMiss]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || submitting) return;
    onSubmit(trimmed);
  };

  return (
    <div className="space-y-6">
      {/* Round indicator */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ color: "var(--game-muted)" }}
          >
            Round {round} of 4
          </span>
          <span style={{ color: "var(--game-muted)" }}>&middot;</span>
          <span
            className="text-sm font-medium"
            style={{ color: "var(--game-muted)" }}
          >
            Up to {ROUND_MAX[round as keyof typeof ROUND_MAX]} pts
          </span>
        </div>

        {/* Direction badge */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold"
          style={{
            background: isHigh
              ? "hsla(142, 71%, 45%, 0.15)"
              : "hsla(25, 95%, 53%, 0.15)",
            color: isHigh ? "var(--game-correct)" : "#f97316",
            boxShadow: isHigh
              ? "0 0 16px hsla(142, 71%, 45%, 0.2)"
              : "0 0 16px hsla(25, 95%, 53%, 0.2)",
          }}
        >
          {isHigh ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          {isHigh ? "HIGH — Most Popular" : "LOW — Least Popular"}
        </motion.div>
      </div>

      {/* Question */}
      <div
        className="rounded-xl p-5 border"
        style={{
          background: "var(--game-surface)",
          borderColor: "var(--game-border)",
        }}
      >
        <p className="text-lg font-semibold text-center">{question}</p>
        <p
          className="text-sm text-center mt-2"
          style={{ color: "var(--game-muted)" }}
        >
          {isHigh
            ? "Name the answer you think MOST people would say"
            : "Name an answer you think FEWEST people would say"}
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <input
            type="text"
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value);
              if (error) onClearError();
            }}
            placeholder="Type your answer..."
            disabled={submitting || lockedIn}
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl border text-base placeholder:text-white/30 focus:outline-none focus:ring-2 disabled:opacity-50 transition-all"
            style={{
              background: "var(--game-surface)",
              borderColor: "var(--game-border)",
              color: "var(--game-text)",
              // @ts-expect-error CSS custom properties
              "--tw-ring-color": "var(--game-accent)",
            }}
          />
        </div>

        {/* Miss feedback */}
        {lastMiss && (
          <motion.div
            initial={{ x: -8, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border"
            style={{
              background: "hsla(0, 84%, 60%, 0.1)",
              borderColor: "hsla(0, 84%, 60%, 0.3)",
              color: "#fca5a5",
            }}
          >
            <X className="h-4 w-4 shrink-0 text-red-400" />
            <span>
              <span className="font-semibold">&quot;{lastMiss}&quot;</span> is
              not on the list — try again!
            </span>
          </motion.div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <motion.button
          type="submit"
          disabled={!answer.trim() || submitting || lockedIn}
          whileTap={
            !answer.trim() || submitting || lockedIn ? undefined : tapScale
          }
          animate={
            lockedIn
              ? { scale: [1, 1.05, 1], transition: { duration: 0.2 } }
              : {}
          }
          className="w-full py-3.5 px-6 rounded-xl text-base font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{
            background: lockedIn
              ? "var(--game-accent)"
              : !answer.trim() || submitting
                ? "var(--game-surface-light)"
                : "var(--game-accent)",
            color: lockedIn
              ? "#fff"
              : !answer.trim() || submitting
                ? "var(--game-muted)"
                : "#fff",
            opacity: lockedIn ? 0.8 : undefined,
          }}
        >
          {lockedIn ? (
            "Locked in!"
          ) : submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking...
            </>
          ) : (
            "Submit Answer"
          )}
        </motion.button>
      </form>
    </div>
  );
}
