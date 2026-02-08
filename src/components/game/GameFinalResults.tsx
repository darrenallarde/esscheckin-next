"use client";

import { useRef, useState } from "react";
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
import { getRoundMaxScore } from "@/lib/game/scoring";
import { PRAYER_BONUS_POINTS } from "./GamePrayerBonus";
import type { RoundData } from "@/lib/game/state-machine";

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
  const greeting = firstName ? `Great game, ${firstName}!` : "Great game!";

  // All rounds share the same answer list
  const allAnswers = rounds[0]?.allAnswers ?? [];

  // Collect all player answers across rounds for highlighting
  const playerAnswers = rounds
    .filter((r) => r.onList && r.rank)
    .map((r) => r.submittedAnswer);

  const handleViewAnswers = () => {
    setShowAnswers(true);
    // Scroll after a tick so the section is rendered
    setTimeout(() => {
      answersRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center animate-pop-in">
            <Trophy className="h-7 w-7 text-amber-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-stone-900">{greeting}</h2>
      </div>

      {/* Score breakdown card */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        {/* Round rows */}
        <div className="divide-y divide-stone-100">
          {rounds.map((round) => {
            const isHigh = round.direction === "high";
            const maxScore = getRoundMaxScore(round.roundNumber, answerCount);
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
                    {round.rank && (
                      <span className="text-xs text-stone-400 ml-1">
                        #{round.rank} of {answerCount}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-stone-900">
                    {round.roundScore.toLocaleString()}
                  </span>
                  <span className="text-xs text-stone-400">
                    /{maxScore.toLocaleString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subtotal: Game Score */}
        <div className="px-5 py-2.5 border-t border-stone-200 flex items-center justify-between bg-stone-50">
          <span className="text-sm font-medium text-stone-600">Game Score</span>
          <span className="text-sm font-bold text-stone-800">
            {gameScore.toLocaleString()} pts
          </span>
        </div>

        {/* Prayer bonus line */}
        <div
          className={`px-5 py-2.5 flex items-center justify-between ${
            prayerBonusAwarded
              ? "bg-emerald-50 border-t border-emerald-200"
              : "bg-stone-50 border-t border-dashed border-stone-200"
          }`}
        >
          <span className="flex items-center gap-2 text-sm">
            <Heart
              className={`h-4 w-4 ${prayerBonusAwarded ? "text-emerald-600 fill-emerald-600" : "text-stone-400"}`}
            />
            <span
              className={
                prayerBonusAwarded
                  ? "font-medium text-emerald-700"
                  : "text-stone-400"
              }
            >
              Prayer Bonus
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            {prayerBonusAwarded ? (
              <>
                <span className="text-sm font-bold text-emerald-700">
                  +{PRAYER_BONUS_POINTS.toLocaleString()} pts
                </span>
                <Check className="h-4 w-4 text-emerald-600" />
              </>
            ) : (
              <span className="text-sm text-stone-400">&mdash;</span>
            )}
          </span>
        </div>

        {/* Total */}
        <div className="px-5 py-3.5 border-t-2 border-stone-900 bg-stone-900 flex items-center justify-between">
          <span className="text-sm font-bold text-stone-200 uppercase tracking-wider">
            Total
          </span>
          <span className="text-xl font-bold text-white">
            {totalScore.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* Action buttons — 2×2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pray */}
        <button
          onClick={onGoToPrayer}
          className={`py-3.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            prayerBonusAwarded
              ? "bg-stone-100 text-stone-700 hover:bg-stone-200"
              : "bg-purple-600 text-white hover:bg-purple-700 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
          }`}
        >
          <Heart className="h-4 w-4" />
          {prayerBonusAwarded ? "Pray Again" : "Pray +500"}
        </button>

        {/* Message Leader */}
        {leaderContact ? (
          <a
            href={`sms:${leaderContact.phone}?body=Hi ${leaderContact.name}! `}
            className="py-3.5 px-4 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="truncate">Text {leaderContact.name}</span>
          </a>
        ) : (
          <div />
        )}

        {/* Leaderboard */}
        <button
          onClick={onViewLeaderboard}
          className="py-3.5 px-4 rounded-xl bg-amber-100 text-amber-800 text-sm font-semibold hover:bg-amber-200 transition-all flex items-center justify-center gap-2"
        >
          <Trophy className="h-4 w-4" />
          Leaderboard
        </button>

        {/* Your Answers */}
        {allAnswers.length > 0 && (
          <button
            onClick={handleViewAnswers}
            className="py-3.5 px-4 rounded-xl bg-stone-100 text-stone-700 text-sm font-semibold hover:bg-stone-200 transition-all flex items-center justify-center gap-2"
          >
            <List className="h-4 w-4" />
            Your Answers
          </button>
        )}
      </div>

      {/* Scripture */}
      <section className="bg-blue-50/80 rounded-xl p-5 border border-blue-100">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-600">
            Scripture
          </span>
        </div>
        <blockquote className="text-base italic text-blue-900 leading-relaxed border-l-3 border-blue-300 pl-4">
          {game.scripture_verses}
        </blockquote>
      </section>

      {/* Fun Facts */}
      <section className="bg-amber-50/80 rounded-xl p-5 border border-amber-100">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
            Did you know?
          </span>
        </div>
        <ul className="space-y-2 text-sm text-stone-700">
          {game.fun_facts.map((f, i) => (
            <li key={i} className="flex gap-2">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>{f.fact}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Devotional actions */}
      <div className="flex flex-col items-center gap-3">
        {leaderContact && (
          <a
            href={`sms:${leaderContact.phone}?body=Hey ${leaderContact.name}! I have a question about today's devotional: `}
            className="w-full py-3.5 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Text Pastor {leaderContact.name}
          </a>
        )}
        <a
          href={`/d/${game.devotional_id}`}
          className="text-sm font-medium text-primary hover:underline"
        >
          Read today&apos;s devotional &rarr;
        </a>
      </div>

      {/* Full answer reveal (toggled by "Your Answers" button) */}
      {allAnswers.length > 0 && showAnswers && (
        <div
          ref={answersRef}
          className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setShowAnswers(false)}
            className="w-full px-5 py-3 flex items-center gap-2 hover:bg-stone-50 transition-colors"
          >
            <List className="h-4 w-4 text-stone-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              All Answers
            </span>
            <ChevronDown className="h-4 w-4 text-stone-400 ml-auto rotate-180 transition-transform" />
          </button>
          <div className="px-4 pb-4">
            <div className="max-h-96 overflow-y-auto rounded-lg border border-stone-100 bg-stone-50/50 p-3">
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
