/**
 * Hi-Lo Game Scoring Engine
 *
 * Rounds 1-2: HIGH direction — guess the most popular answer
 * Rounds 3-4: LOW direction — guess the least popular answer
 *
 * | Round | Direction | Formula          | Max   |
 * |-------|-----------|------------------|-------|
 * | 1     | high      | (401 - rank) * 1 | 400   |
 * | 2     | high      | (401 - rank) * 2 | 800   |
 * | 3     | low       | rank * 3         | 1,200 |
 * | 4     | low       | rank * 4         | 1,600 |
 *
 * Max possible: 4,000 points (perfect game)
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
 * @param rank - Answer rank (1-400) or null if not on the list
 * @returns Score for the round (0 if not on list)
 */
export function calculateRoundScore(
  round: number,
  rank: number | null,
): number {
  if (round < 1 || round > 4 || !Number.isInteger(round)) {
    throw new Error(`Invalid round number: ${round}. Must be 1-4.`);
  }

  if (rank === null) return 0;

  if (rank < 1 || rank > 400 || !Number.isInteger(rank)) {
    throw new Error(`Invalid rank: ${rank}. Must be 1-400.`);
  }

  const config = ROUND_CONFIG[round as keyof typeof ROUND_CONFIG];

  if (config.direction === "high") {
    return (401 - rank) * config.multiplier;
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
