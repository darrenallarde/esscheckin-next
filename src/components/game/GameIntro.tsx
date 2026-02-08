"use client";

import {
  BookOpen,
  Lightbulb,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Users,
} from "lucide-react";

interface GameIntroProps {
  game: {
    scripture_verses: string;
    historical_facts: { fact: string; source?: string }[];
    fun_facts: { fact: string }[];
    core_question: string;
  };
  orgName: string;
  playerCount: number;
  onStart: () => void;
}

export function GameIntro({
  game,
  orgName,
  playerCount,
  onStart,
}: GameIntroProps) {
  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-center space-y-2 opacity-0 animate-[fade-in-up_0.4s_ease-out_0s_forwards]">
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">
          Hi-Lo Game
        </h1>
        <p className="text-sm text-stone-500">
          Can you guess the most &mdash; and least &mdash; popular answers?
        </p>
      </div>

      {/* Scripture */}
      <section className="bg-blue-50/80 rounded-xl p-5 border border-blue-100 opacity-0 animate-[fade-in-up_0.4s_ease-out_0.1s_forwards]">
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
      <section className="bg-amber-50/80 rounded-xl p-5 border border-amber-100 opacity-0 animate-[fade-in-up_0.4s_ease-out_0.2s_forwards]">
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

      {/* The Question */}
      <section className="bg-violet-50/80 rounded-xl p-5 border border-violet-100 opacity-0 animate-[fade-in-up_0.4s_ease-out_0.3s_forwards]">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-violet-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            The Question
          </span>
        </div>
        <p className="text-lg font-semibold text-stone-900">
          {game.core_question}
        </p>
      </section>

      {/* How to play */}
      <section className="bg-stone-50 rounded-xl p-5 border border-stone-200 opacity-0 animate-[fade-in-up_0.4s_ease-out_0.4s_forwards]">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-3">
          How to play
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-stone-100">
            <ArrowUp className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="font-medium text-stone-800">Rounds 1-2: HIGH</p>
              <p className="text-xs text-stone-500">
                Guess the most popular answer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-stone-100">
            <ArrowDown className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium text-stone-800">Rounds 3-4: LOW</p>
              <p className="text-xs text-stone-500">
                Guess the least popular answer
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Player count + CTA */}
      <div className="opacity-0 animate-[fade-in-up_0.4s_ease-out_0.5s_forwards] space-y-3">
        {playerCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 text-sm text-stone-500">
            <Users className="h-4 w-4" />
            <span>
              {playerCount} player{playerCount !== 1 ? "s" : ""} so far
            </span>
          </div>
        )}
        <button
          onClick={onStart}
          className="w-full py-3.5 px-6 rounded-xl bg-stone-900 text-white text-base font-semibold hover:bg-stone-800 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all"
        >
          Play Now
        </button>
      </div>
    </div>
  );
}
