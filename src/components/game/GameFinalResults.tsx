"use client";

import { Trophy, ArrowUp, ArrowDown, BarChart3 } from "lucide-react";
import { GameScoreBar } from "./GameScoreBar";
import type { RoundData } from "@/lib/game/state-machine";

const ROUND_MAX = { 1: 200, 2: 400, 3: 600, 4: 800 } as const;
const MAX_TOTAL = 2000;

interface GameFinalResultsProps {
  rounds: RoundData[];
  totalScore: number;
  firstName: string;
  onViewLeaderboard: () => void;
}

export function GameFinalResults({
  rounds,
  totalScore,
  firstName,
  onViewLeaderboard,
}: GameFinalResultsProps) {
  const pct = Math.round((totalScore / MAX_TOTAL) * 100);
  const greeting = firstName ? `Great game, ${firstName}!` : "Great game!";

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center animate-pop-in">
            <Trophy className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-stone-900">{greeting}</h2>
        <div className="animate-count-up">
          <p className="text-4xl font-bold text-stone-900">
            {totalScore.toLocaleString()}
          </p>
          <p className="text-sm text-stone-500">
            out of {MAX_TOTAL.toLocaleString()} possible points ({pct}%)
          </p>
        </div>
      </div>

      {/* Total score bar */}
      <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm">
        <GameScoreBar
          score={totalScore}
          maxScore={MAX_TOTAL}
          label="Total Score"
          color="bg-amber-500"
        />
      </div>

      {/* Round breakdown */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-stone-100 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-stone-500" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Round Breakdown
          </span>
        </div>
        <div className="divide-y divide-stone-100">
          {rounds.map((round) => {
            const isHigh = round.direction === "high";
            const maxScore =
              ROUND_MAX[round.roundNumber as keyof typeof ROUND_MAX];
            return (
              <div
                key={round.roundNumber}
                className="px-5 py-3 flex items-center gap-3"
              >
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    isHigh
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {isHigh ? (
                    <ArrowUp className="h-3 w-3" />
                  ) : (
                    <ArrowDown className="h-3 w-3" />
                  )}
                  R{round.roundNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 truncate">
                    &quot;{round.submittedAnswer}&quot;
                    {round.onList && round.rank && (
                      <span className="text-stone-400 ml-1">#{round.rank}</span>
                    )}
                    {!round.onList && (
                      <span className="text-red-400 ml-1">Not on list</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-stone-900">
                    {round.roundScore}
                  </span>
                  <span className="text-xs text-stone-400">/{maxScore}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard CTA */}
      <button
        onClick={onViewLeaderboard}
        className="w-full py-3.5 px-6 rounded-xl bg-stone-900 text-white text-base font-semibold hover:bg-stone-800 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Trophy className="h-5 w-5" />
        View Leaderboard
      </button>
    </div>
  );
}
