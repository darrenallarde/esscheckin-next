// Pure logic functions for the Hi-Lo AI Game Manager
// Tested in __tests__/lib/game-judge-logic.test.ts
// Mirrored in supabase/functions/judge-game-answer/index.ts

export interface AiJudgment {
  valid: boolean;
  rank: number | null;
  matched_to?: string;
  reason: string;
}

/** Normalize player input for matching: trim, lowercase, collapse whitespace */
export function normalizeAnswer(answer: string): string {
  return answer.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parse AI judge response — handles code fences, bad JSON, type coercion */
export function parseAiJudgment(aiText: string): AiJudgment {
  let cleanText = aiText.trim();
  const codeMatch = cleanText.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (codeMatch) cleanText = codeMatch[1].trim();

  try {
    const parsed = JSON.parse(cleanText);
    return {
      valid: Boolean(parsed.valid),
      rank: typeof parsed.rank === "number" ? parsed.rank : null,
      matched_to: parsed.matched_to || undefined,
      reason: String(parsed.reason || ""),
    };
  } catch {
    return { valid: false, rank: null, reason: "parse error" };
  }
}

/** Clamp AI-assigned rank to valid range */
export function clampRank(rank: number, maxRank: number = 500): number {
  return Math.max(1, Math.min(maxRank, Math.round(rank)));
}

/** Find exact match (case-insensitive) in seed answers */
export function findExactMatch(
  normalized: string,
  answers: { answer: string; rank: number }[],
): { answer: string; rank: number } | undefined {
  return answers.find((a) => a.answer.toLowerCase().trim() === normalized);
}

/** Build RPC params — always uses the player's actual answer, never a placeholder */
export function buildSubmitParams(
  gameId: string,
  roundNumber: number,
  playerAnswer: string,
) {
  return {
    p_game_id: gameId,
    p_round_number: roundNumber,
    p_answer: playerAnswer,
  };
}
