/**
 * Hi-Lo Game Scoring Engine
 *
 * Rounds 1-2: HIGH direction — guess the most popular answer
 * Rounds 3-4: LOW direction — guess the least popular answer
 *
 * Dynamic scoring based on answer_count (N):
 *
 * | Round | Direction | Formula              | Max (N=120) |
 * |-------|-----------|----------------------|-------------|
 * | 1     | high      | (N + 1 - rank) * 1   | 120         |
 * | 2     | high      | (N + 1 - rank) * 2   | 240         |
 * | 3     | low       | rank * 3             | 360         |
 * | 4     | low       | rank * 4             | 480         |
 *
 * Max possible: N * 10 points (perfect game)
 */

export interface RoundResult {
  round: number;
  rank: number | null;
  onList: boolean;
  score: number;
}

const ROUND_CONFIG = {
  1: { direction: "high" as const, multiplier: 1 },
  2: { direction: "high" as const, multiplier: 2 },
  3: { direction: "low" as const, multiplier: 3 },
  4: { direction: "low" as const, multiplier: 4 },
} as const;

/**
 * Calculate the score for a single round.
 * @param round - Round number (1-4)
 * @param rank - Answer rank (1-N+) or null if not on the list
 * @param answerCount - Number of seed answers in the game
 * @returns Score for the round (0 if not on list or negative result)
 */
export function calculateRoundScore(
  round: number,
  rank: number | null,
  answerCount: number,
): number {
  if (round < 1 || round > 4 || !Number.isInteger(round)) {
    throw new Error(`Invalid round number: ${round}. Must be 1-4.`);
  }

  if (rank === null) return 0;

  if (rank < 1 || !Number.isInteger(rank)) {
    throw new Error(`Invalid rank: ${rank}. Must be a positive integer.`);
  }

  const config = ROUND_CONFIG[round as keyof typeof ROUND_CONFIG];

  if (config.direction === "high") {
    const score = (answerCount + 1 - rank) * config.multiplier;
    return Math.max(0, score); // Clamp to 0 for AI-judged answers ranked beyond seed count
  } else {
    return rank * config.multiplier;
  }
}

/**
 * Calculate total score from all completed rounds.
 */
export function calculateTotalScore(rounds: RoundResult[]): number {
  return rounds.reduce((total, r) => total + r.score, 0);
}

/**
 * Get the maximum possible score for a game.
 */
export function getMaxScore(answerCount: number): number {
  return answerCount * 10;
}

/**
 * Get the maximum score for a specific round.
 */
export function getRoundMaxScore(round: number, answerCount: number): number {
  const config = ROUND_CONFIG[round as keyof typeof ROUND_CONFIG];
  return answerCount * config.multiplier;
}
