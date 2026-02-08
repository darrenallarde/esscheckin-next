import { describe, expect, it } from "vitest";

import {
  calculateRoundScore,
  calculateTotalScore,
  getMaxScore,
  getRoundMaxScore,
  type RoundResult,
} from "@/lib/game/scoring";

describe("calculateRoundScore", () => {
  describe("balanced multipliers (2, 3, 2, 3)", () => {
    const N = 150;

    describe("Round 1 — HIGH direction, 2x multiplier", () => {
      it("awards max (300) for rank 1", () => {
        expect(calculateRoundScore(1, 1, N)).toBe(300);
      });

      it("awards 202 points for rank 50", () => {
        // (150 + 1 - 50) * 2 = 202
        expect(calculateRoundScore(1, 50, N)).toBe(202);
      });

      it("awards 2 points for rank 150", () => {
        expect(calculateRoundScore(1, 150, N)).toBe(2);
      });

      it("awards 0 points when not on list", () => {
        expect(calculateRoundScore(1, null, N)).toBe(0);
      });
    });

    describe("Round 2 — HIGH direction, 3x multiplier", () => {
      it("awards max (450) for rank 1", () => {
        expect(calculateRoundScore(2, 1, N)).toBe(450);
      });

      it("awards 303 points for rank 50", () => {
        // (150 + 1 - 50) * 3 = 303
        expect(calculateRoundScore(2, 50, N)).toBe(303);
      });

      it("awards 3 points for rank 150", () => {
        expect(calculateRoundScore(2, 150, N)).toBe(3);
      });
    });

    describe("Round 3 — LOW direction, 2x multiplier", () => {
      it("awards max (300) for rank 150", () => {
        expect(calculateRoundScore(3, 150, N)).toBe(300);
      });

      it("awards 100 points for rank 50", () => {
        expect(calculateRoundScore(3, 50, N)).toBe(100);
      });

      it("awards 2 points for rank 1", () => {
        expect(calculateRoundScore(3, 1, N)).toBe(2);
      });

      it("awards 0 points when not on list", () => {
        expect(calculateRoundScore(3, null, N)).toBe(0);
      });
    });

    describe("Round 4 — LOW direction, 3x multiplier", () => {
      it("awards max (450) for rank 150", () => {
        expect(calculateRoundScore(4, 150, N)).toBe(450);
      });

      it("awards 150 points for rank 50", () => {
        expect(calculateRoundScore(4, 50, N)).toBe(150);
      });

      it("awards 3 points for rank 1", () => {
        expect(calculateRoundScore(4, 1, N)).toBe(3);
      });
    });
  });

  describe("scoring balance", () => {
    const N = 150;

    it("HIGH and LOW halves are worth equal total points", () => {
      const highMax = getRoundMaxScore(1, N) + getRoundMaxScore(2, N);
      const lowMax = getRoundMaxScore(3, N) + getRoundMaxScore(4, N);
      expect(highMax).toBe(lowMax);
    });

    it("perfect game = N * 10", () => {
      const r1 = calculateRoundScore(1, 1, N);
      const r2 = calculateRoundScore(2, 1, N);
      const r3 = calculateRoundScore(3, N, N);
      const r4 = calculateRoundScore(4, N, N);
      expect(r1 + r2 + r3 + r4).toBe(N * 10);
    });

    it("getMaxScore returns N * 10", () => {
      expect(getMaxScore(N)).toBe(1500);
    });
  });

  describe("AI-judged answers beyond seed count", () => {
    const N = 120;

    it("HIGH round: rank beyond seed count → 0 points", () => {
      expect(calculateRoundScore(1, 150, N)).toBe(0);
    });

    it("LOW round: rank beyond seed count → capped at N", () => {
      // min(150, 120) * 2 = 240, not 150 * 2 = 300
      expect(calculateRoundScore(3, 150, N)).toBe(240);
      expect(calculateRoundScore(3, 150, N)).toBe(calculateRoundScore(3, N, N));
    });

    it("LOW round: rank at seed count → same as cap", () => {
      expect(calculateRoundScore(4, 120, N)).toBe(360);
      expect(calculateRoundScore(4, 200, N)).toBe(360);
    });
  });

  describe("backward compatibility (N=400)", () => {
    const N = 400;

    it("perfect game = 4000 points", () => {
      const r1 = calculateRoundScore(1, 1, N);
      const r2 = calculateRoundScore(2, 1, N);
      const r3 = calculateRoundScore(3, N, N);
      const r4 = calculateRoundScore(4, N, N);
      expect(r1 + r2 + r3 + r4).toBe(4000);
    });
  });

  describe("edge cases", () => {
    it("throws for invalid round number 0", () => {
      expect(() => calculateRoundScore(0, 1, 150)).toThrow();
    });

    it("throws for invalid round number 5", () => {
      expect(() => calculateRoundScore(5, 1, 150)).toThrow();
    });

    it("throws for rank below 1", () => {
      expect(() => calculateRoundScore(1, 0, 150)).toThrow();
    });

    it("throws for non-integer rank", () => {
      expect(() => calculateRoundScore(1, 1.5, 150)).toThrow();
    });
  });
});

describe("calculateTotalScore", () => {
  it("sums scores from all 4 rounds", () => {
    const rounds: RoundResult[] = [
      { round: 1, rank: 1, onList: true, score: 300 },
      { round: 2, rank: 1, onList: true, score: 450 },
      { round: 3, rank: 150, onList: true, score: 300 },
      { round: 4, rank: 150, onList: true, score: 450 },
    ];
    expect(calculateTotalScore(rounds)).toBe(1500);
  });

  it("returns 0 for empty rounds", () => {
    expect(calculateTotalScore([])).toBe(0);
  });
});
