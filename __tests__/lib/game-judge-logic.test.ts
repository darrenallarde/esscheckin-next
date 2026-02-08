import { describe, it, expect } from "vitest";
import {
  normalizeAnswer,
  parseAiJudgment,
  clampRank,
  findExactMatch,
  buildSubmitParams,
} from "@/lib/game/judge-logic";

describe("normalizeAnswer", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeAnswer("  Think  ")).toBe("think");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeAnswer("olive   oil")).toBe("olive oil");
  });

  it("handles already-normalized input", () => {
    expect(normalizeAnswer("love")).toBe("love");
  });

  it("handles mixed case", () => {
    expect(normalizeAnswer("FORGIVES")).toBe("forgives");
  });
});

describe("parseAiJudgment", () => {
  it("parses valid JSON with all fields", () => {
    const result = parseAiJudgment(
      '{"valid": true, "rank": 42, "matched_to": "helps", "reason": "synonym of helps"}',
    );
    expect(result).toEqual({
      valid: true,
      rank: 42,
      matched_to: "helps",
      reason: "synonym of helps",
    });
  });

  it("parses minimal valid response", () => {
    const result = parseAiJudgment(
      '{"valid": true, "rank": 15, "reason": "word form"}',
    );
    expect(result).toEqual({
      valid: true,
      rank: 15,
      matched_to: undefined,
      reason: "word form",
    });
  });

  it("parses rejection", () => {
    const result = parseAiJudgment(
      '{"valid": false, "rank": null, "reason": "profanity"}',
    );
    expect(result.valid).toBe(false);
    expect(result.rank).toBeNull();
    expect(result.reason).toBe("profanity");
  });

  it("strips code fences", () => {
    const result = parseAiJudgment(
      '```json\n{"valid": true, "rank": 5, "reason": "exact match"}\n```',
    );
    expect(result.valid).toBe(true);
    expect(result.rank).toBe(5);
  });

  it("strips code fences without json label", () => {
    const result = parseAiJudgment(
      '```\n{"valid": true, "rank": 10, "reason": "new answer"}\n```',
    );
    expect(result.valid).toBe(true);
    expect(result.rank).toBe(10);
  });

  it("returns parse error on garbage input", () => {
    const result = parseAiJudgment("I think this answer is valid!");
    expect(result.valid).toBe(false);
    expect(result.rank).toBeNull();
    expect(result.reason).toBe("parse error");
  });

  it("returns parse error on empty string", () => {
    const result = parseAiJudgment("");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("parse error");
  });

  it("coerces rank string to null", () => {
    const result = parseAiJudgment(
      '{"valid": true, "rank": "five", "reason": "bad rank type"}',
    );
    expect(result.rank).toBeNull();
  });

  it("coerces valid to boolean", () => {
    const result = parseAiJudgment(
      '{"valid": 1, "rank": 10, "reason": "truthy"}',
    );
    expect(result.valid).toBe(true);

    const result2 = parseAiJudgment(
      '{"valid": 0, "rank": null, "reason": "falsy"}',
    );
    expect(result2.valid).toBe(false);
  });
});

describe("clampRank", () => {
  it("passes through valid ranks", () => {
    expect(clampRank(42)).toBe(42);
    expect(clampRank(1)).toBe(1);
    expect(clampRank(500)).toBe(500);
  });

  it("clamps to 1 minimum", () => {
    expect(clampRank(0)).toBe(1);
    expect(clampRank(-5)).toBe(1);
  });

  it("clamps to 500 by default", () => {
    expect(clampRank(999)).toBe(500);
  });

  it("clamps to custom max", () => {
    expect(clampRank(200, 150)).toBe(150);
  });

  it("rounds to nearest integer", () => {
    expect(clampRank(42.7)).toBe(43);
    expect(clampRank(42.3)).toBe(42);
  });
});

describe("findExactMatch", () => {
  const seedAnswers = [
    { answer: "saves", rank: 1 },
    { answer: "forgives", rank: 4 },
    { answer: "loves", rank: 5 },
    { answer: "olive oil", rank: 98 },
  ];

  it("finds case-insensitive match", () => {
    const match = findExactMatch("saves", seedAnswers);
    expect(match).toEqual({ answer: "saves", rank: 1 });
  });

  it("matches with different casing in seed", () => {
    const answers = [{ answer: "Saves", rank: 1 }];
    const match = findExactMatch("saves", answers);
    expect(match).toEqual({ answer: "Saves", rank: 1 });
  });

  it("returns undefined when no match", () => {
    expect(findExactMatch("think", seedAnswers)).toBeUndefined();
  });

  it("matches multi-word answers", () => {
    const match = findExactMatch("olive oil", seedAnswers);
    expect(match).toEqual({ answer: "olive oil", rank: 98 });
  });
});

describe("buildSubmitParams", () => {
  it("always uses the player's actual answer", () => {
    const params = buildSubmitParams("game-123", 1, "think");
    expect(params.p_answer).toBe("think");
    expect(params.p_game_id).toBe("game-123");
    expect(params.p_round_number).toBe(1);
  });

  it("never produces placeholder strings", () => {
    const params = buildSubmitParams("game-123", 2, "love");
    expect(params.p_answer).not.toContain("__ai_miss");
    expect(params.p_answer).not.toContain("__");
    expect(params.p_answer).toBe("love");
  });

  it("works for miss answers the same as hit answers", () => {
    // The key bug: miss path and hit path both use the player's real answer
    const missParams = buildSubmitParams("game-123", 1, "xylophone");
    const hitParams = buildSubmitParams("game-123", 1, "saves");
    expect(missParams.p_answer).toBe("xylophone");
    expect(hitParams.p_answer).toBe("saves");
  });
});
