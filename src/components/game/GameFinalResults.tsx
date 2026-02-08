"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  ArrowUp,
  ArrowDown,
  Heart,
  ChevronDown,
  List,
  MessageCircle,
  Check,
  BookOpen,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { GameAnswerGrid } from "./GameAnswerGrid";
import { AnimatedNumber } from "./AnimatedNumber";
import { getRoundMaxScore } from "@/lib/game/scoring";
import { PRAYER_BONUS_POINTS } from "./GamePrayerBonus";
import { tapScale } from "@/lib/game/timing";
import type { RoundData } from "@/lib/game/state-machine";

function getPerformanceTier(gameScore: number, maxScore: number) {
  const pct = maxScore > 0 ? gameScore / maxScore : 0;
  if (pct > 0.9)
    return {
      label: "Legendary",
      copy: "Prophet-level intuition",
      color: "#f59e0b",
    };
  if (pct > 0.75)
    return { label: "Epic", copy: "You've got the gift!", color: "#8b5cf6" };
  if (pct > 0.5)
    return { label: "Great", copy: "Not bad, not bad", color: "#22c55e" };
  if (pct > 0.25)
    return { label: "Good", copy: "Room to grow", color: "#3b82f6" };
  return {
    label: "Rookie",
    copy: "Bold guesses, we respect it",
    color: "#6b7280",
  };
}

interface LeaderContact {
  name: string;
  phone: string;
}

interface GameFinalResultsProps {
  rounds: RoundData[];
  totalScore: number;
  gameScore: number;
  firstName: string;
  answerCount: number;
  prayerBonusAwarded: boolean;
  prayerCount: number;
  leaderContact: LeaderContact | null;
  game: {
    devotional_id: string;
    scripture_verses: string;
    fun_facts: { fact: string }[];
    core_question: string;
  };
  onGoToPrayer: () => void;
  onViewLeaderboard: () => void;
}

export function GameFinalResults({
  rounds,
  totalScore,
  gameScore,
  firstName,
  answerCount,
  prayerBonusAwarded,
  leaderContact,
  game,
  onGoToPrayer,
  onViewLeaderboard,
}: GameFinalResultsProps) {
  const [showAnswers, setShowAnswers] = useState(false);
  const answersRef = useRef<HTMLDivElement>(null);
  const maxGameScore = rounds.reduce(
    (sum, r) => sum + getRoundMaxScore(r.roundNumber, answerCount),
    0,
  );
  const tier = getPerformanceTier(gameScore, maxGameScore);
  const greeting = firstName ? `Great game, ${firstName}!` : "Great game!";

  const allAnswers = rounds[0]?.allAnswers ?? [];
  const playerAnswers = rounds
    .filter((r) => r.onList && r.rank)
    .map((r) => r.submittedAnswer);

  const handleViewAnswers = () => {
    setShowAnswers(true);
    setTimeout(() => {
      answersRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="flex items-center justify-center"
        >
          <div
            className="h-14 w-14 rounded-full flex items-center justify-center"
            style={{
              background: "hsla(38, 92%, 50%, 0.15)",
              boxShadow: "0 0 24px hsla(38, 92%, 50%, 0.3)",
            }}
          >
            <Trophy className="h-7 w-7" style={{ color: "var(--game-gold)" }} />
          </div>
        </motion.div>
        <h2 className="text-2xl font-bold">{greeting}</h2>
        <AnimatedNumber
          value={totalScore}
          className="text-4xl font-black block"
          style={{ color: "var(--game-gold)" }}
          suffix=" pts"
          duration={1200}
        />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold"
          style={{
            background: `${tier.color}20`,
            color: tier.color,
            boxShadow: `0 0 16px ${tier.color}30`,
          }}
        >
          {tier.label} &mdash; {tier.copy}
        </motion.div>
      </div>

      {/* Score breakdown card */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: "var(--game-surface)",
          borderColor: "var(--game-border)",
        }}
      >
        {/* Round rows */}
        <div>
          {rounds.map((round) => {
            const isHigh = round.direction === "high";
            const maxScore = getRoundMaxScore(round.roundNumber, answerCount);
            return (
              <div
                key={round.roundNumber}
                className="px-5 py-3 flex items-center gap-3 border-b"
                style={{ borderColor: "var(--game-border)" }}
              >
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
                  R{round.roundNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    &quot;{round.submittedAnswer}&quot;
                    {round.rank && (
                      <span className="text-xs text-stone-400 ml-1">
                        #{round.rank} of {answerCount}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">
                    {round.roundScore.toLocaleString()}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--game-muted)" }}
                  >
                    /{maxScore.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtotal: Game Score */}
        <div
          className="px-5 py-2.5 border-b flex items-center justify-between"
          style={{
            background: "hsla(230, 15%, 15%, 0.5)",
            borderColor: "var(--game-border)",
          }}
        >
          <span
            className="text-sm font-medium"
            style={{ color: "var(--game-muted)" }}
          >
            Game Score
          </span>
          <span className="text-sm font-bold">
            {gameScore.toLocaleString()} pts
          </span>
        </div>

        {/* Prayer bonus line */}
        <div
          className="px-5 py-2.5 flex items-center justify-between border-b"
          style={{
            background: prayerBonusAwarded
              ? "hsla(142, 71%, 45%, 0.08)"
              : "transparent",
            borderColor: prayerBonusAwarded
              ? "hsla(142, 71%, 45%, 0.2)"
              : "var(--game-border)",
          }}
        >
          <span className="flex items-center gap-2 text-sm">
            <Heart
              className="h-4 w-4"
              style={{
                color: prayerBonusAwarded
                  ? "var(--game-correct)"
                  : "var(--game-muted)",
                fill: prayerBonusAwarded
                  ? "var(--game-correct)"
                  : "transparent",
              }}
            />
            <span
              style={{
                color: prayerBonusAwarded
                  ? "var(--game-correct)"
                  : "var(--game-muted)",
              }}
            >
              Prayer Bonus
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            {prayerBonusAwarded ? (
              <>
                <span
                  className="text-sm font-bold"
                  style={{ color: "var(--game-correct)" }}
                >
                  +{PRAYER_BONUS_POINTS.toLocaleString()} pts
                </span>
                <Check
                  className="h-4 w-4"
                  style={{ color: "var(--game-correct)" }}
                />
              </>
            ) : (
              <span className="text-sm" style={{ color: "var(--game-muted)" }}>
                &mdash;
              </span>
            )}
          </span>
        </div>

        {/* Total */}
        <div
          className="px-5 py-3.5 flex items-center justify-between"
          style={{
            background: "hsla(38, 92%, 50%, 0.1)",
            borderTop: "2px solid var(--game-gold)",
          }}
        >
          <span
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color: "var(--game-gold)" }}
          >
            Total
          </span>
          <span
            className="text-xl font-bold"
            style={{ color: "var(--game-gold)" }}
          >
            {totalScore.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* Primary CTA — Pray button (prominent, full-width) */}
      <motion.button
        onClick={onGoToPrayer}
        whileTap={tapScale}
        animate={
          prayerBonusAwarded
            ? {}
            : {
                scale: [1, 1.04, 1],
                boxShadow: [
                  "0 0 16px hsla(258, 90%, 66%, 0.3)",
                  "0 0 28px hsla(258, 90%, 66%, 0.5)",
                  "0 0 16px hsla(258, 90%, 66%, 0.3)",
                ],
              }
        }
        transition={
          prayerBonusAwarded
            ? {}
            : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
        }
        className="w-full py-5 px-6 rounded-2xl text-lg font-bold transition-all flex items-center justify-center gap-3"
        style={{
          background: prayerBonusAwarded
            ? "var(--game-surface-light)"
            : "var(--game-accent)",
          color: prayerBonusAwarded ? "var(--game-text)" : "#fff",
          boxShadow: prayerBonusAwarded
            ? "none"
            : "0 0 16px hsla(258, 90%, 66%, 0.3)",
        }}
      >
        <Heart className="h-6 w-6" />
        {prayerBonusAwarded ? "Pray Again" : "Pray for +500 pts"}
      </motion.button>

      {/* Secondary action buttons — row */}
      <div className="grid grid-cols-2 gap-3">
        {/* Message Leader */}
        {leaderContact ? (
          <a
            href={`sms:${leaderContact.phone}?body=Hi ${leaderContact.name}! `}
            className="py-3.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: "var(--game-surface-light)",
              color: "var(--game-text)",
            }}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="truncate">Text {leaderContact.name}</span>
          </a>
        ) : (
          <div />
        )}

        {/* Leaderboard */}
        <motion.button
          onClick={onViewLeaderboard}
          whileTap={tapScale}
          className="py-3.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
          style={{
            background: "hsla(38, 92%, 50%, 0.15)",
            color: "var(--game-gold)",
          }}
        >
          <Trophy className="h-4 w-4" />
          Leaderboard
        </motion.button>

        {/* Your Answers */}
        {allAnswers.length > 0 && (
          <motion.button
            onClick={handleViewAnswers}
            whileTap={tapScale}
            className="py-3.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: "var(--game-surface-light)",
              color: "var(--game-text)",
            }}
          >
            <List className="h-4 w-4" />
            Your Answers
          </motion.button>
        )}
      </div>

      {/* Scripture — dark themed */}
      <section
        className="rounded-xl p-5 border"
        style={{
          background: "hsla(217, 60%, 50%, 0.08)",
          borderColor: "hsla(217, 60%, 50%, 0.2)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BookOpen
            className="h-4 w-4"
            style={{ color: "hsla(217, 80%, 65%, 1)" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "hsla(217, 80%, 65%, 1)" }}
          >
            Scripture
          </span>
        </div>
        <blockquote
          className="text-base italic leading-relaxed pl-4"
          style={{
            color: "hsla(217, 40%, 80%, 1)",
            borderLeft: "3px solid hsla(217, 60%, 50%, 0.4)",
          }}
        >
          {game.scripture_verses}
        </blockquote>
      </section>

      {/* Fun Facts — dark themed */}
      <section
        className="rounded-xl p-5 border"
        style={{
          background: "hsla(38, 92%, 50%, 0.06)",
          borderColor: "hsla(38, 92%, 50%, 0.15)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb
            className="h-4 w-4"
            style={{ color: "hsla(38, 80%, 60%, 1)" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "hsla(38, 80%, 60%, 1)" }}
          >
            Did you know?
          </span>
        </div>
        <ul className="space-y-2 text-sm" style={{ color: "var(--game-text)" }}>
          {game.fun_facts.map((f, i) => (
            <li key={i} className="flex gap-2">
              <Sparkles
                className="h-4 w-4 shrink-0 mt-0.5"
                style={{ color: "hsla(38, 80%, 55%, 0.7)" }}
              />
              <span>{f.fact}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Devotional actions — dark themed */}
      <div className="flex flex-col items-center gap-3">
        {leaderContact && (
          <a
            href={`sms:${leaderContact.phone}?body=Hey ${leaderContact.name}! I have a question about today's devotional: `}
            className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
            style={{
              background: "var(--game-accent)",
              color: "#fff",
              boxShadow: "0 0 16px hsla(258, 90%, 66%, 0.3)",
            }}
          >
            <MessageCircle className="h-4 w-4" />
            Text Pastor {leaderContact.name}
          </a>
        )}
        <a
          href={`/d/${game.devotional_id}`}
          className="text-sm font-medium hover:underline"
          style={{ color: "var(--game-accent)" }}
        >
          Read today&apos;s devotional &rarr;
        </a>
      </div>

      {/* Question + Full answer reveal */}
      {allAnswers.length > 0 && showAnswers && (
        <div
          className="rounded-xl p-5 border text-center"
          style={{
            background: "hsla(258, 60%, 50%, 0.08)",
            borderColor: "hsla(258, 60%, 50%, 0.2)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "hsla(258, 80%, 70%, 1)" }}
          >
            The Question
          </p>
          <p
            className="text-lg font-bold"
            style={{ color: "var(--game-text)" }}
          >
            {game.core_question}
          </p>
        </div>
      )}
      {allAnswers.length > 0 && showAnswers && (
        <div
          ref={answersRef}
          className="rounded-xl border overflow-hidden"
          style={{
            background: "var(--game-surface)",
            borderColor: "var(--game-border)",
          }}
        >
          <button
            onClick={() => setShowAnswers(false)}
            className="w-full px-5 py-3 flex items-center gap-2 transition-colors hover:opacity-80"
          >
            <List className="h-4 w-4" style={{ color: "var(--game-muted)" }} />
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--game-muted)" }}
            >
              All Answers
            </span>
            <ChevronDown
              className="h-4 w-4 ml-auto rotate-180 transition-transform"
              style={{ color: "var(--game-muted)" }}
            />
          </button>
          <div className="px-4 pb-4">
            <div
              className="max-h-96 overflow-y-auto rounded-lg border p-3"
              style={{
                background: "var(--game-surface)",
                borderColor: "var(--game-border)",
              }}
            >
              <GameAnswerGrid
                answers={allAnswers}
                playerAnswers={playerAnswers}
                playerRank={null}
                mode="full"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
