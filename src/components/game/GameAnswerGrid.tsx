"use client";

import { normalizeAnswer } from "@/lib/game/utils";

interface GameAnswerGridProps {
  answers: { answer: string; rank: number }[];
  /** Single player answer (round result) or array (final reveal) */
  playerAnswers?: string | string[];
  playerRank?: number | null;
  mode: "condensed" | "full";
  hideWords?: boolean;
}

export function GameAnswerGrid({
  answers,
  playerAnswers,
  playerRank,
  mode,
  hideWords = false,
}: GameAnswerGridProps) {
  // Normalize to array
  const playerList = !playerAnswers
    ? []
    : Array.isArray(playerAnswers)
      ? playerAnswers
      : [playerAnswers];
  const normalizedPlayers = new Set(playerList.map((a) => normalizeAnswer(a)));

  // Deduplicate by rank (AI-judged entries can share ranks with seeds)
  const deduped = deduplicateByRank(answers);
  const sorted = [...deduped].sort((a, b) => a.rank - b.rank);

  const visible =
    mode === "full" ? sorted : getCondensedAnswers(sorted, playerRank);

  if (hideWords) {
    return (
      <RankTable
        visible={visible}
        playerRank={playerRank ?? null}
        playerAnswer={playerList[0]}
      />
    );
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

        const isPlayer = normalizedPlayers.has(normalizeAnswer(item.answer));

        return (
          <div
            key={item.rank}
            className={`flex items-center gap-2 px-3 rounded-lg text-sm transition-colors ${
              isPlayer
                ? "py-2 bg-emerald-100 border-2 border-emerald-400 text-emerald-900 shadow-sm"
                : "py-1.5 bg-white border border-stone-100 text-stone-600"
            }`}
          >
            <span
              className={`w-8 shrink-0 text-right font-mono text-xs ${
                isPlayer ? "text-emerald-600 font-bold" : "text-stone-400"
              }`}
            >
              {item.rank}
            </span>
            <span className={`flex-1 truncate ${isPlayer ? "font-bold" : ""}`}>
              {item.answer}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Vertical rank table — numbers only, player's row highlighted with their word */
function RankTable({
  visible,
  playerRank,
  playerAnswer,
}: {
  visible: VisibleItem[];
  playerRank: number | null;
  playerAnswer?: string;
}) {
  return (
    <div className="space-y-0.5">
      {visible.map((item, i) => {
        if ("gap" in item) {
          return (
            <div
              key={`gap-${i}`}
              className="flex items-center justify-center py-1"
            >
              <span className="text-xs text-stone-300 tracking-widest">
                &bull; &bull; &bull;
              </span>
            </div>
          );
        }

        const isPlayer = playerRank === item.rank;

        if (isPlayer) {
          return (
            <div
              key={item.rank}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-emerald-100 border-2 border-emerald-400 shadow-sm"
            >
              <span className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-emerald-600 text-white text-xs font-bold">
                {item.rank}
              </span>
              <span className="font-bold text-emerald-900 text-base">
                {playerAnswer || item.answer}
              </span>
            </div>
          );
        }

        return (
          <div
            key={item.rank}
            className="flex items-center px-3 py-1 rounded text-sm"
          >
            <span className="w-7 text-right font-mono text-xs text-stone-300">
              {item.rank}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Remove duplicate ranks — keep the first (seed) entry at each rank */
function deduplicateByRank(
  answers: { answer: string; rank: number }[],
): { answer: string; rank: number }[] {
  const seen = new Set<number>();
  const result: { answer: string; rank: number }[] = [];
  const sorted = [...answers].sort((a, b) => a.rank - b.rank);
  for (const a of sorted) {
    if (!seen.has(a.rank)) {
      seen.add(a.rank);
      result.push(a);
    }
  }
  return result;
}

type VisibleItem = { answer: string; rank: number } | { gap: true };

function getCondensedAnswers(
  sorted: { answer: string; rank: number }[],
  playerRank: number | null | undefined,
): VisibleItem[] {
  if (sorted.length <= 15) return sorted;

  const top5 = sorted.slice(0, 5);
  const bottom5 = sorted.slice(-5);

  if (!playerRank || playerRank <= 7 || playerRank >= sorted.length - 6) {
    return [...top5, { gap: true }, ...bottom5];
  }

  const neighborStart = Math.max(0, playerRank - 3);
  const neighborEnd = Math.min(sorted.length, playerRank + 2);
  const neighborhood = sorted.slice(neighborStart, neighborEnd);

  return [...top5, { gap: true }, ...neighborhood, { gap: true }, ...bottom5];
}
