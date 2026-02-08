import { describe, expect, it } from "vitest";

import {
  calculateRoundScore,
  calculateTotalScore,
  type RoundResult,
} from "@/lib/game/scoring";

describe("calculateRoundScore", () => {
  describe("Round 1 — HIGH direction, 1x multiplier", () => {
    it("awards max points (200) for rank 1", () => {
      expect(calculateRoundScore(1, 1)).toBe(200);
    });

    it("awards 151 points for rank 50", () => {
      expect(calculateRoundScore(1, 50)).toBe(151);
    });

    it("awards 1 point for rank 200", () => {
      expect(calculateRoundScore(1, 200)).toBe(1);
    });

    it("awards 0 points when not on list (rank is null)", () => {
      expect(calculateRoundScore(1, null)).toBe(0);
    });
  });

  describe("Round 2 — HIGH direction, 2x multiplier", () => {
    it("awards max points (400) for rank 1", () => {
      expect(calculateRoundScore(2, 1)).toBe(400);
    });

    it("awards 302 points for rank 50", () => {
      expect(calculateRoundScore(2, 50)).toBe(302);
    });

    it("awards 2 points for rank 200", () => {
      expect(calculateRoundScore(2, 200)).toBe(2);
    });

    it("awards 0 points when not on list", () => {
      expect(calculateRoundScore(2, null)).toBe(0);
    });
  });

  describe("Round 3 — LOW direction, 3x multiplier", () => {
    it("awards max points (600) for rank 200", () => {
      expect(calculateRoundScore(3, 200)).toBe(600);
    });

    it("awards 450 points for rank 150", () => {
      expect(calculateRoundScore(3, 150)).toBe(450);
    });

    it("awards 3 points for rank 1", () => {
      expect(calculateRoundScore(3, 1)).toBe(3);
    });

    it("awards 0 points when not on list", () => {
      expect(calculateRoundScore(3, null)).toBe(0);
    });
  });

  describe("Round 4 — LOW direction, 4x multiplier", () => {
    it("awards max points (800) for rank 200", () => {
      expect(calculateRoundScore(4, 200)).toBe(800);
    });

    it("awards 600 points for rank 150", () => {
      expect(calculateRoundScore(4, 150)).toBe(600);
    });

    it("awards 4 points for rank 1", () => {
      expect(calculateRoundScore(4, 1)).toBe(4);
    });

    it("awards 0 points when not on list", () => {
      expect(calculateRoundScore(4, null)).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("throws for invalid round number 0", () => {
      expect(() => calculateRoundScore(0, 1)).toThrow();
    });

    it("throws for invalid round number 5", () => {
      expect(() => calculateRoundScore(5, 1)).toThrow();
    });

    it("throws for rank below 1", () => {
      expect(() => calculateRoundScore(1, 0)).toThrow();
    });

    it("throws for rank above 200", () => {
      expect(() => calculateRoundScore(1, 201)).toThrow();
    });
  });
});

describe("calculateTotalScore", () => {
  it("sums scores from all 4 rounds", () => {
    const rounds: RoundResult[] = [
      { round: 1, rank: 1, onList: true, score: 200 },
      { round: 2, rank: 1, onList: true, score: 400 },
      { round: 3, rank: 200, onList: true, score: 600 },
      { round: 4, rank: 200, onList: true, score: 800 },
    ];
    expect(calculateTotalScore(rounds)).toBe(2000);
  });

  it("returns 0 for empty rounds", () => {
    expect(calculateTotalScore([])).toBe(0);
  });

  it("handles mixed on-list and off-list rounds", () => {
    const rounds: RoundResult[] = [
      { round: 1, rank: 10, onList: true, score: 191 },
      { round: 2, rank: null, onList: false, score: 0 },
      { round: 3, rank: 180, onList: true, score: 540 },
      { round: 4, rank: null, onList: false, score: 0 },
    ];
    expect(calculateTotalScore(rounds)).toBe(731);
  });
});
