"use client";

import { BookOpen, Lightbulb, Sparkles, ArrowDown } from "lucide-react";

interface GameHalftimeProps {
  game: {
    scripture_verses: string;
    fun_facts: { fact: string }[];
    core_question: string;
  };
  totalScore: number;
  onContinue: () => void;
}

export function GameHalftime({
  game,
  totalScore,
  onContinue,
}: GameHalftimeProps) {
  return (
    <div className="space-y-6">
      {/* Halftime header */}
      <div className="text-center space-y-2 opacity-0 animate-[fade-in-up_0.4s_ease-out_0s_forwards]">
        <p className="text-sm font-semibold text-stone-500 uppercase tracking-wider">
          Halftime
        </p>
        <h2 className="text-2xl font-bold text-stone-900">Time to flip it!</h2>
        <p className="text-sm text-stone-500">
          You scored{" "}
          <span className="font-semibold text-stone-700">
            {totalScore.toLocaleString()} pts
          </span>{" "}
          in the HIGH rounds. Now guess the{" "}
          <span className="font-semibold text-orange-600">least popular</span>{" "}
          answers.
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

      {/* LOW rounds reminder */}
      <section className="bg-orange-50/80 rounded-xl p-5 border border-orange-100 opacity-0 animate-[fade-in-up_0.4s_ease-out_0.3s_forwards]">
        <div className="flex items-center gap-2 mb-3">
          <ArrowDown className="h-4 w-4 text-orange-600" />
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
            Rounds 3-4: LOW
          </span>
        </div>
        <p className="text-sm text-stone-700">
          Now guess the answer you think{" "}
          <span className="font-semibold text-orange-700">
            the fewest people
          </span>{" "}
          said. The more obscure your answer, the higher you score!
        </p>
      </section>

      {/* Continue CTA */}
      <div className="opacity-0 animate-[fade-in-up_0.4s_ease-out_0.4s_forwards]">
        <button
          onClick={onContinue}
          className="w-full py-3.5 px-6 rounded-xl bg-stone-900 text-white text-base font-semibold hover:bg-stone-800 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all"
        >
          Continue to LOW Rounds
        </button>
      </div>
    </div>
  );
}
