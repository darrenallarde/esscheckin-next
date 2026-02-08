/**
 * Hi-Lo Game Utilities
 *
 * Pure functions for game state, answer normalization, and round logic.
 */

export interface GameRecord {
  id: string;
  organization_id: string;
  devotional_id: string;
  scripture_verses: string;
  historical_facts: { fact: string; source?: string }[];
  fun_facts: { fact: string }[];
  core_question: string;
  status: "generating" | "ready" | "active" | "completed";
  opens_at: string | null;
  closes_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type GameStatus =
  | "generating"
  | "ready"
  | "active"
  | "expired"
  | "completed";

export type RoundDirection = "high" | "low";

/**
 * Normalize a player's answer for comparison.
 * Lowercases, trims, and collapses internal whitespace.
 */
export function normalizeAnswer(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Get the direction for a given round number.
 * Rounds 1-2: high (guess most popular)
 * Rounds 3-4: low (guess least popular)
 */
export function getRoundDirection(round: number): RoundDirection {
  if (round < 1 || round > 4 || !Number.isInteger(round)) {
    throw new Error(`Invalid round number: ${round}. Must be 1-4.`);
  }
  return round <= 2 ? "high" : "low";
}

/**
 * Check if a game is currently open for play.
 * Must be status 'active' and within the opens_at/closes_at window.
 */
export function isGameOpen(
  game: Pick<GameRecord, "opens_at" | "closes_at" | "status">,
  now: Date = new Date(),
): boolean {
  if (game.status !== "active") return false;
  if (!game.opens_at || !game.closes_at) return false;

  const opens = new Date(game.opens_at);
  const closes = new Date(game.closes_at);
  return now >= opens && now < closes;
}

/**
 * Get the effective status of a game, accounting for time expiry.
 * An 'active' game past its closes_at is reported as 'expired'.
 */
export function getGameStatus(
  game: Pick<GameRecord, "status" | "closes_at">,
  now: Date = new Date(),
): GameStatus {
  if (game.status === "completed") return "completed";
  if (game.status === "generating") return "generating";
  if (game.status === "ready") return "ready";

  // status is 'active' — check if expired
  if (game.closes_at && now >= new Date(game.closes_at)) {
    return "expired";
  }

  return "active";
}
