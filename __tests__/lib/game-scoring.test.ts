import { describe, expect, it } from "vitest";

import {
  calculateRoundScore,
  calculateTotalScore,
  type RoundResult,
} from "@/lib/game/scoring";

describe("calculateRoundScore", () => {
  describe("with default answerCount (400) — backward compatibility", () => {
    describe("Round 1 — HIGH direction, 1x multiplier", () => {
      it("awards max points (400) for rank 1", () => {
        expect(calculateRoundScore(1, 1, 400)).toBe(400);
      });

      it("awards 351 points for rank 50", () => {
        expect(calculateRoundScore(1, 50, 400)).toBe(351);
      });

      it("awards 1 point for rank 400", () => {
        expect(calculateRoundScore(1, 400, 400)).toBe(1);
      });

      it("awards 0 points when not on list (rank is null)", () => {
        expect(calculateRoundScore(1, null, 400)).toBe(0);
      });
    });

    describe("Round 2 — HIGH direction, 2x multiplier", () => {
      it("awards max points (800) for rank 1", () => {
        expect(calculateRoundScore(2, 1, 400)).toBe(800);
      });

      it("awards 702 points for rank 50", () => {
        expect(calculateRoundScore(2, 50, 400)).toBe(702);
      });

      it("awards 2 points for rank 400", () => {
        expect(calculateRoundScore(2, 400, 400)).toBe(2);
      });

      it("awards 0 points when not on list", () => {
        expect(calculateRoundScore(2, null, 400)).toBe(0);
      });
    });

    describe("Round 3 — LOW direction, 3x multiplier", () => {
      it("awards max points (1200) for rank 400", () => {
        expect(calculateRoundScore(3, 400, 400)).toBe(1200);
      });

      it("awards 450 points for rank 150", () => {
        expect(calculateRoundScore(3, 150, 400)).toBe(450);
      });

      it("awards 3 points for rank 1", () => {
        expect(calculateRoundScore(3, 1, 400)).toBe(3);
      });

      it("awards 0 points when not on list", () => {
        expect(calculateRoundScore(3, null, 400)).toBe(0);
      });
    });

    describe("Round 4 — LOW direction, 4x multiplier", () => {
      it("awards max points (1600) for rank 400", () => {
        expect(calculateRoundScore(4, 400, 400)).toBe(1600);
      });

      it("awards 600 points for rank 150", () => {
        expect(calculateRoundScore(4, 150, 400)).toBe(600);
      });

      it("awards 4 points for rank 1", () => {
        expect(calculateRoundScore(4, 1, 400)).toBe(4);
      });

      it("awards 0 points when not on list", () => {
        expect(calculateRoundScore(4, null, 400)).toBe(0);
      });
    });
  });

  describe("with answerCount = 120 (new default game size)", () => {
    const N = 120;

    describe("Round 1 — HIGH direction, 1x multiplier", () => {
      it("awards max points (120) for rank 1", () => {
        // (120 + 1 - 1) * 1 = 120
        expect(calculateRoundScore(1, 1, N)).toBe(120);
      });

      it("awards 71 points for rank 50", () => {
        // (120 + 1 - 50) * 1 = 71
        expect(calculateRoundScore(1, 50, N)).toBe(71);
      });

      it("awards 1 point for rank 120", () => {
        // (120 + 1 - 120) * 1 = 1
        expect(calculateRoundScore(1, 120, N)).toBe(1);
      });
    });

    describe("Round 2 — HIGH direction, 2x multiplier", () => {
      it("awards max points (240) for rank 1", () => {
        expect(calculateRoundScore(2, 1, N)).toBe(240);
      });
    });

    describe("Round 3 — LOW direction, 3x multiplier", () => {
      it("awards max points (360) for rank 120", () => {
        // 120 * 3 = 360
        expect(calculateRoundScore(3, 120, N)).toBe(360);
      });

      it("awards 3 points for rank 1", () => {
        expect(calculateRoundScore(3, 1, N)).toBe(3);
      });
    });

    describe("Round 4 — LOW direction, 4x multiplier", () => {
      it("awards max points (480) for rank 120", () => {
        // 120 * 4 = 480
        expect(calculateRoundScore(4, 120, N)).toBe(480);
      });
    });

    it("perfect game max = answerCount * 10 = 1200", () => {
      // R1: 120*1=120, R2: 120*2=240, R3: 120*3=360, R4: 120*4=480 = 1200
      const r1 = calculateRoundScore(1, 1, N);
      const r2 = calculateRoundScore(2, 1, N);
      const r3 = calculateRoundScore(3, N, N);
      const r4 = calculateRoundScore(4, N, N);
      expect(r1 + r2 + r3 + r4).toBe(N * 10);
    });
  });

  describe("with AI-judged answers (rank beyond seed count)", () => {
    const N = 120;

    it("scores rank 150 (AI-placed obscure answer) in HIGH round", () => {
      // (120 + 1 - 150) * 1 = -29 → should clamp to 0
      expect(calculateRoundScore(1, 150, N)).toBe(0);
    });

    it("scores rank 150 in LOW round normally", () => {
      // 150 * 3 = 450 — obscure answers are valuable in LOW rounds
      expect(calculateRoundScore(3, 150, N)).toBe(450);
    });
  });

  describe("edge cases", () => {
    it("throws for invalid round number 0", () => {
      expect(() => calculateRoundScore(0, 1, 400)).toThrow();
    });

    it("throws for invalid round number 5", () => {
      expect(() => calculateRoundScore(5, 1, 400)).toThrow();
    });

    it("throws for rank below 1", () => {
      expect(() => calculateRoundScore(1, 0, 400)).toThrow();
    });

    it("throws for non-integer rank", () => {
      expect(() => calculateRoundScore(1, 1.5, 400)).toThrow();
    });
  });
});

describe("calculateTotalScore", () => {
  it("sums scores from all 4 rounds (400-answer game)", () => {
    const rounds: RoundResult[] = [
      { round: 1, rank: 1, onList: true, score: 400 },
      { round: 2, rank: 1, onList: true, score: 800 },
      { round: 3, rank: 400, onList: true, score: 1200 },
      { round: 4, rank: 400, onList: true, score: 1600 },
    ];
    expect(calculateTotalScore(rounds)).toBe(4000);
  });

  it("returns 0 for empty rounds", () => {
    expect(calculateTotalScore([])).toBe(0);
  });

  it("handles mixed on-list and off-list rounds", () => {
    const rounds: RoundResult[] = [
      { round: 1, rank: 10, onList: true, score: 391 },
      { round: 2, rank: null, onList: false, score: 0 },
      { round: 3, rank: 180, onList: true, score: 540 },
      { round: 4, rank: null, onList: false, score: 0 },
    ];
    expect(calculateTotalScore(rounds)).toBe(931);
  });
});
