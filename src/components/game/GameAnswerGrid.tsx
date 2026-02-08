"use client";

import { normalizeAnswer } from "@/lib/game/utils";

interface GameAnswerGridProps {
  answers: { answer: string; rank: number }[];
  playerAnswer?: string;
  mode: "condensed" | "full";
  playerRank?: number | null;
}

export function GameAnswerGrid({
  answers,
  playerAnswer,
  mode,
  playerRank,
}: GameAnswerGridProps) {
  const sorted = [...answers].sort((a, b) => a.rank - b.rank);
  const normalizedPlayer = playerAnswer ? normalizeAnswer(playerAnswer) : null;

  // Condensed: top 5 + player neighborhood + bottom 5
  const visible =
    mode === "full" ? sorted : getCondensedAnswers(sorted, playerRank);

  return (
    <div className="space-y-1">
      {visible.map((item, i) => {
        if ("gap" in item) {
          return (
            <div
              key={`gap-${i}`}
              className="text-center text-xs text-stone-400 py-1"
            >
              &middot;&middot;&middot;
            </div>
          );
        }

        const isPlayer =
          normalizedPlayer && normalizeAnswer(item.answer) === normalizedPlayer;

        return (
          <div
            key={item.rank}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isPlayer
                ? "bg-emerald-100 border border-emerald-300 font-semibold text-emerald-900"
                : "bg-white border border-stone-100 text-stone-700"
            }`}
          >
            <span className="w-8 text-right font-mono text-xs text-stone-400">
              #{item.rank}
            </span>
            <span className="flex-1 truncate">{item.answer}</span>
          </div>
        );
      })}
    </div>
  );
}

type VisibleItem = { answer: string; rank: number } | { gap: true };

function getCondensedAnswers(
  sorted: { answer: string; rank: number }[],
  playerRank: number | null | undefined,
): VisibleItem[] {
  if (sorted.length <= 15) return sorted;

  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5);

  // If player is in top 5 or bottom 5, just show those regions
  if (!playerRank || playerRank <= 7 || playerRank >= sorted.length - 6) {
    return [...top5, { gap: true }, ...bottom5];
  }

  // Player neighborhood: rank-2 to rank+2
  const neighborStart = Math.max(0, playerRank - 3); // 0-indexed
  const neighborEnd = Math.min(sorted.length, playerRank + 2);
  const neighborhood = sorted.slice(neighborStart, neighborEnd);

  return [...top5, { gap: true }, ...neighborhood, { gap: true }, ...bottom5];
}
