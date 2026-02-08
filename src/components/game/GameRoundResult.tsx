"use client";

import { motion } from "framer-motion";
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
import { AnimatedNumber } from "./AnimatedNumber";
import { getRoundMaxScore } from "@/lib/game/scoring";
import { tapScale } from "@/lib/game/timing";
import type { RoundData } from "@/lib/game/state-machine";

interface GameRoundResultProps {
  round: RoundData;
  currentRound: number;
  totalScore: number;
  answerCount: number;
  streakCount?: number;
  onNext: () => void;
}

export function GameRoundResult({
  round,
  currentRound,
  totalScore,
  answerCount,
  streakCount = 0,
  onNext,
}: GameRoundResultProps) {
  const isHigh = round.direction === "high";
  const maxRoundScore = getRoundMaxScore(round.roundNumber, answerCount);
  const isLastRound = currentRound >= 4;

  const matchedSeed =
    round.onList && round.rank
      ? round.allAnswers.find((a) => a.rank === round.rank)
      : null;
  const isExactMatch =
    matchedSeed &&
    matchedSeed.answer.toLowerCase() === round.submittedAnswer.toLowerCase();

  return (
    <div className="space-y-6">
      {/* Result header */}
      <div className="text-center space-y-3">
        <div
          className="flex items-center justify-center gap-2 text-sm"
          style={{ color: "var(--game-muted)" }}
        >
          <span>Round {round.roundNumber} of 4</span>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: isHigh
                ? "hsla(142, 71%, 45%, 0.15)"
                : "hsla(25, 95%, 53%, 0.15)",
              color: isHigh ? "var(--game-correct)" : "#f97316",
            }}
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
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
            delay: 0.1,
          }}
        >
          {round.onList ? (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: "hsla(142, 71%, 45%, 0.15)",
                color: "var(--game-correct)",
                boxShadow: "0 0 20px hsla(142, 71%, 45%, 0.25)",
              }}
            >
              <Check className="h-5 w-5" />
              <span className="font-bold">On the list!</span>
            </div>
          ) : (
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: "hsla(0, 84%, 60%, 0.15)",
                color: "var(--game-wrong)",
              }}
            >
              <X className="h-5 w-5" />
              <span className="font-bold">Not on the list</span>
            </div>
          )}
        </motion.div>

        {/* Streak indicator */}
        {streakCount >= 2 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.3,
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
            style={{
              background: "hsla(38, 92%, 50%, 0.15)",
              color: "var(--game-gold)",
              boxShadow: "0 0 12px hsla(38, 92%, 50%, 0.2)",
            }}
          >
            <span className="text-base">🔥</span>
            {streakCount}x Streak!
          </motion.div>
        )}

        {/* Player's answer + matched seed */}
        <div className="space-y-1">
          <p className="text-lg font-bold">
            &quot;{round.submittedAnswer}&quot;
          </p>
          {matchedSeed && (
            <p className="text-sm" style={{ color: "var(--game-muted)" }}>
              Matched{" "}
              <span
                className="font-semibold"
                style={{ color: "var(--game-correct)" }}
              >
                #{matchedSeed.rank}
              </span>
              {!isExactMatch && (
                <>
                  {" "}
                  &mdash;{" "}
                  <span style={{ color: "var(--game-text)" }}>
                    &quot;{matchedSeed.answer}&quot;
                  </span>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Score */}
      <div
        className="rounded-xl p-5 border space-y-3"
        style={{
          background: "var(--game-surface)",
          borderColor: "var(--game-border)",
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: "var(--game-muted)" }}>
            Round Score
          </span>
          <AnimatedNumber
            value={round.roundScore}
            className="text-2xl font-bold"
            prefix="+"
          />
        </div>
        <GameScoreBar
          score={round.roundScore}
          maxScore={maxRoundScore}
          color={
            round.roundScore > maxRoundScore / 2
              ? "var(--game-correct)"
              : "var(--game-gold)"
          }
        />
        <div
          className="flex items-center justify-between pt-2 border-t"
          style={{ borderColor: "var(--game-border)" }}
        >
          <span className="text-sm" style={{ color: "var(--game-muted)" }}>
            Total Score
          </span>
          <AnimatedNumber value={totalScore} className="text-lg font-bold" />
        </div>
      </div>

      {/* Rank grid */}
      {round.allAnswers.length > 0 && (
        <div className="space-y-2">
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--game-muted)" }}
          >
            Where you ranked
          </p>
          <div
            className="rounded-xl border p-3"
            style={{
              background: "var(--game-surface)",
              borderColor: "var(--game-border)",
            }}
          >
            <GameAnswerGrid
              answers={round.allAnswers}
              playerAnswers={round.submittedAnswer}
              playerRank={round.rank}
              mode="condensed"
              hideWords
            />
          </div>
        </div>
      )}

      {/* Next button */}
      <motion.button
        onClick={onNext}
        whileTap={tapScale}
        className="w-full py-3.5 px-6 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2"
        style={{
          background: "var(--game-accent)",
          color: "#fff",
        }}
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
      </motion.button>
    </div>
  );
}
