"use client";

import {
  ArrowUp,
  ArrowDown,
  Check,
  X,
  ChevronRight,
  Trophy,
} from "lucide-react";
import { GameAnswerGrid } from "./GameAnswerGrid";
import { GameScoreBar } from "./GameScoreBar";
import type { RoundData } from "@/lib/game/state-machine";

const ROUND_MAX = { 1: 400, 2: 800, 3: 1200, 4: 1600 } as const;

interface GameRoundResultProps {
  round: RoundData;
  currentRound: number;
  totalScore: number;
  onNext: () => void;
}

export function GameRoundResult({
  round,
  currentRound,
  totalScore,
  onNext,
}: GameRoundResultProps) {
  const isHigh = round.direction === "high";
  const maxRoundScore = ROUND_MAX[round.roundNumber as keyof typeof ROUND_MAX];
  const isLastRound = currentRound >= 4;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Result header */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
          <span>Round {round.roundNumber} of 4</span>
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
            {isHigh ? "HIGH" : "LOW"}
          </span>
        </div>

        {/* On list or not */}
        <div className="animate-rank-reveal">
          {round.onList ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-800">
              <Check className="h-5 w-5" />
              <span className="font-bold">On the list! Rank #{round.rank}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-800">
              <X className="h-5 w-5" />
              <span className="font-bold">Not on the list</span>
            </div>
          )}
        </div>

        {/* Player's answer */}
        <p className="text-sm text-stone-500">
          You answered:{" "}
          <span className="font-semibold text-stone-700">
            &quot;{round.submittedAnswer}&quot;
          </span>
        </p>
      </div>

      {/* Score */}
      <div className="bg-white rounded-xl p-5 border border-stone-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-stone-500">Round Score</span>
          <span className="text-2xl font-bold text-stone-900 animate-count-up">
            +{round.roundScore}
          </span>
        </div>
        <GameScoreBar
          score={round.roundScore}
          maxScore={maxRoundScore}
          color={
            round.roundScore > maxRoundScore / 2
              ? "bg-emerald-500"
              : "bg-amber-500"
          }
        />
        <div className="flex items-center justify-between pt-2 border-t border-stone-100">
          <span className="text-sm text-stone-500">Total Score</span>
          <span className="text-lg font-bold text-stone-900">
            {totalScore.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Answer grid */}
      {round.allAnswers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Answer Rankings
          </p>
          <div className="max-h-80 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50/50 p-3">
            <GameAnswerGrid
              answers={round.allAnswers}
              playerAnswer={round.submittedAnswer}
              playerRank={round.rank}
              mode="condensed"
            />
          </div>
        </div>
      )}

      {/* Next button */}
      <button
        onClick={onNext}
        className="w-full py-3.5 px-6 rounded-xl bg-stone-900 text-white text-base font-semibold hover:bg-stone-800 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        {isLastRound ? (
          <>
            <Trophy className="h-5 w-5" />
            See Final Results
          </>
        ) : (
          <>
            Next Round
            <ChevronRight className="h-5 w-5" />
          </>
        )}
      </button>
    </div>
  );
}
