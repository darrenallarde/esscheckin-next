"use client";

import { normalizeAnswer } from "@/lib/game/utils";

interface GameAnswerGridProps {
  answers: { answer: string; rank: number }[];
  playerAnswer?: string;
  playerRank?: number | null;
  mode: "condensed" | "full";
  hideWords?: boolean;
}

export function GameAnswerGrid({
  answers,
  playerAnswer,
  playerRank,
  mode,
  hideWords = false,
}: GameAnswerGridProps) {
  const sorted = [...answers].sort((a, b) => a.rank - b.rank);
  const normalizedPlayer = playerAnswer ? normalizeAnswer(playerAnswer) : null;

  const visible =
    mode === "full" ? sorted : getCondensedAnswers(sorted, playerRank);

  if (hideWords) {
    return <RankPillGrid visible={visible} playerRank={playerRank ?? null} />;
  }

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
            className={`flex items-center gap-3 px-3 rounded-lg text-sm transition-colors ${
              isPlayer
                ? "py-2.5 bg-emerald-100 border-2 border-emerald-400 text-emerald-900 shadow-sm"
                : "py-1.5 bg-white border border-stone-100 text-stone-500"
            }`}
          >
            {isPlayer ? (
              <>
                <span className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-600 text-white text-xs font-bold">
                  {item.rank}
                </span>
                <span className="flex-1 truncate font-bold text-base">
                  {item.answer}
                </span>
              </>
            ) : (
              <>
                <span className="w-6 shrink-0" />
                <span className="flex-1 truncate">{item.answer}</span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Compact number-only grid — shows rank pills, highlights the player's rank */
function RankPillGrid({
  visible,
  playerRank,
}: {
  visible: VisibleItem[];
  playerRank: number | null;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {visible.map((item, i) => {
        if ("gap" in item) {
          return (
            <span
              key={`gap-${i}`}
              className="text-stone-300 text-xs px-1 select-none"
            >
              &middot;&middot;&middot;
            </span>
          );
        }

        const isPlayer = playerRank === item.rank;

        return (
          <span
            key={item.rank}
            className={`inline-flex items-center justify-center rounded-md text-xs font-medium transition-colors ${
              isPlayer
                ? "h-8 min-w-[2rem] px-1.5 bg-emerald-600 text-white font-bold shadow-sm ring-2 ring-emerald-300"
                : "h-6 min-w-[1.5rem] px-1 bg-stone-100 text-stone-400"
            }`}
          >
            {item.rank}
          </span>
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
