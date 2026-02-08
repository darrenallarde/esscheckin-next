"use client";

import { normalizeAnswer } from "@/lib/game/utils";

interface GameAnswerGridProps {
  answers: { answer: string; rank: number }[];
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
  const playerList = !playerAnswers
    ? []
    : Array.isArray(playerAnswers)
      ? playerAnswers
      : [playerAnswers];
  const normalizedPlayers = new Set(playerList.map((a) => normalizeAnswer(a)));

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
              className="text-center text-xs py-1"
              style={{ color: "var(--game-muted)" }}
            >
              &middot;&middot;&middot;
            </div>
          );
        }

        const isPlayer = normalizedPlayers.has(normalizeAnswer(item.answer));

        return (
          <div
            key={item.rank}
            className="flex items-center gap-2 px-3 rounded-lg text-sm transition-colors"
            style={{
              padding: isPlayer ? "0.5rem 0.75rem" : "0.375rem 0.75rem",
              background: isPlayer
                ? "hsla(142, 71%, 45%, 0.12)"
                : "transparent",
              border: isPlayer
                ? "2px solid hsla(142, 71%, 45%, 0.4)"
                : "1px solid var(--game-border)",
              boxShadow: isPlayer
                ? "0 0 8px hsla(142, 71%, 45%, 0.15)"
                : "none",
            }}
          >
            <span
              className="w-8 shrink-0 text-right font-mono text-xs"
              style={{
                color: isPlayer ? "var(--game-correct)" : "var(--game-muted)",
                fontWeight: isPlayer ? "bold" : "normal",
              }}
            >
              {item.rank}
            </span>
            <span
              className="flex-1 truncate"
              style={{ fontWeight: isPlayer ? "bold" : "normal" }}
            >
              {item.answer}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
              <span
                className="text-xs tracking-widest"
                style={{ color: "var(--game-muted)" }}
              >
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
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: "hsla(142, 71%, 45%, 0.12)",
                border: "2px solid hsla(142, 71%, 45%, 0.4)",
                boxShadow: "0 0 8px hsla(142, 71%, 45%, 0.15)",
              }}
            >
              <span
                className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold"
                style={{
                  background: "var(--game-correct)",
                  color: "#000",
                }}
              >
                {item.rank}
              </span>
              <span className="font-bold text-base">
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
            <span
              className="w-7 text-right font-mono text-xs"
              style={{ color: "var(--game-muted)" }}
            >
              {item.rank}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
