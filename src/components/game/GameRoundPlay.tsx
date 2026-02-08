"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, Loader2, AlertCircle } from "lucide-react";
import { getRoundDirection } from "@/lib/game/utils";

interface GameRoundPlayProps {
  round: number;
  question: string;
  submitting: boolean;
  error: string | null;
  onSubmit: (answer: string) => void;
  onClearError: () => void;
}

const ROUND_MAX = { 1: 200, 2: 400, 3: 600, 4: 800 } as const;

export function GameRoundPlay({
  round,
  question,
  submitting,
  error,
  onSubmit,
  onClearError,
}: GameRoundPlayProps) {
  const [answer, setAnswer] = useState("");
  const direction = getRoundDirection(round);
  const isHigh = direction === "high";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = answer.trim();
    if (!trimmed || submitting) return;
    onSubmit(trimmed);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Round indicator */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-semibold uppercase tracking-wider text-stone-400">
            Round {round} of 4
          </span>
          <span className="text-xs text-stone-400">&middot;</span>
          <span className="text-sm font-medium text-stone-500">
            Up to {ROUND_MAX[round as keyof typeof ROUND_MAX]} pts
          </span>
        </div>

        {/* Direction badge */}
        <div
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold ${
            isHigh
              ? "bg-emerald-100 text-emerald-800"
              : "bg-orange-100 text-orange-800"
          }`}
        >
          {isHigh ? (
            <ArrowUp className="h-4 w-4" />
          ) : (
            <ArrowDown className="h-4 w-4" />
          )}
          {isHigh ? "HIGH — Most Popular" : "LOW — Least Popular"}
        </div>
      </div>

      {/* Question */}
      <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
        <p className="text-lg font-semibold text-stone-900 text-center">
          {question}
        </p>
        <p className="text-sm text-stone-500 text-center mt-2">
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
            disabled={submitting}
            autoFocus
            className="w-full px-4 py-3.5 rounded-xl border border-stone-200 bg-white text-base text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-400 disabled:opacity-50 transition-all"
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!answer.trim() || submitting}
          className="w-full py-3.5 px-6 rounded-xl bg-stone-900 text-white text-base font-semibold hover:bg-stone-800 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking...
            </>
          ) : (
            "Submit Answer"
          )}
        </button>
      </form>
    </div>
  );
}
