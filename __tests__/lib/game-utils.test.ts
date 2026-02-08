import { describe, expect, it } from "vitest";

import {
  normalizeAnswer,
  getRoundDirection,
  isGameOpen,
  getGameStatus,
  type GameRecord,
} from "@/lib/game/utils";

describe("normalizeAnswer", () => {
  it("lowercases input", () => {
    expect(normalizeAnswer("BREAD")).toBe("bread");
  });

  it("trims whitespace", () => {
    expect(normalizeAnswer("  fish  ")).toBe("fish");
  });

  it("handles mixed case and whitespace", () => {
    expect(normalizeAnswer("  WiNe  ")).toBe("wine");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeAnswer("")).toBe("");
  });

  it("returns empty string for whitespace-only input", () => {
    expect(normalizeAnswer("   ")).toBe("");
  });

  it("handles single character", () => {
    expect(normalizeAnswer("A")).toBe("a");
  });

  it("collapses internal whitespace to single space", () => {
    expect(normalizeAnswer("olive  oil")).toBe("olive oil");
  });
});

describe("getRoundDirection", () => {
  it("returns 'high' for round 1", () => {
    expect(getRoundDirection(1)).toBe("high");
  });

  it("returns 'high' for round 2", () => {
    expect(getRoundDirection(2)).toBe("high");
  });

  it("returns 'low' for round 3", () => {
    expect(getRoundDirection(3)).toBe("low");
  });

  it("returns 'low' for round 4", () => {
    expect(getRoundDirection(4)).toBe("low");
  });

  it("throws for invalid round 0", () => {
    expect(() => getRoundDirection(0)).toThrow();
  });

  it("throws for invalid round 5", () => {
    expect(() => getRoundDirection(5)).toThrow();
  });
});

describe("isGameOpen", () => {
  const now = new Date("2026-02-07T12:00:00Z");

  it("returns true when current time is between opens_at and closes_at", () => {
    const game: Pick<GameRecord, "opens_at" | "closes_at" | "status"> = {
      opens_at: "2026-02-07T00:00:00Z",
      closes_at: "2026-02-08T00:00:00Z",
      status: "active",
    };
    expect(isGameOpen(game, now)).toBe(true);
  });

  it("returns false when current time is before opens_at", () => {
    const game: Pick<GameRecord, "opens_at" | "closes_at" | "status"> = {
      opens_at: "2026-02-07T14:00:00Z",
      closes_at: "2026-02-08T14:00:00Z",
      status: "active",
    };
    expect(isGameOpen(game, now)).toBe(false);
  });

  it("returns false when current time is after closes_at", () => {
    const game: Pick<GameRecord, "opens_at" | "closes_at" | "status"> = {
      opens_at: "2026-02-06T00:00:00Z",
      closes_at: "2026-02-07T00:00:00Z",
      status: "active",
    };
    expect(isGameOpen(game, now)).toBe(false);
  });

  it("returns false when opens_at is null", () => {
    const game: Pick<GameRecord, "opens_at" | "closes_at" | "status"> = {
      opens_at: null,
      closes_at: null,
      status: "ready",
    };
    expect(isGameOpen(game, now)).toBe(false);
  });

  it("returns false when status is not active", () => {
    const game: Pick<GameRecord, "opens_at" | "closes_at" | "status"> = {
      opens_at: "2026-02-07T00:00:00Z",
      closes_at: "2026-02-08T00:00:00Z",
      status: "completed",
    };
    expect(isGameOpen(game, now)).toBe(false);
  });
});

describe("getGameStatus", () => {
  const now = new Date("2026-02-07T12:00:00Z");

  it("returns 'generating' when status is generating", () => {
    const game = makeGame({ status: "generating" });
    expect(getGameStatus(game, now)).toBe("generating");
  });

  it("returns 'ready' when status is ready", () => {
    const game = makeGame({ status: "ready" });
    expect(getGameStatus(game, now)).toBe("ready");
  });

  it("returns 'active' when status is active and within time window", () => {
    const game = makeGame({
      status: "active",
      opens_at: "2026-02-07T00:00:00Z",
      closes_at: "2026-02-08T00:00:00Z",
    });
    expect(getGameStatus(game, now)).toBe("active");
  });

  it("returns 'expired' when status is active but past closes_at", () => {
    const game = makeGame({
      status: "active",
      opens_at: "2026-02-06T00:00:00Z",
      closes_at: "2026-02-07T00:00:00Z",
    });
    expect(getGameStatus(game, now)).toBe("expired");
  });

  it("returns 'completed' when status is completed", () => {
    const game = makeGame({ status: "completed" });
    expect(getGameStatus(game, now)).toBe("completed");
  });
});

// Helper to make a game record for tests
function makeGame(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    id: "test-game-id",
    organization_id: "test-org-id",
    devotional_id: "test-devo-id",
    scripture_verses: "Test verse",
    historical_facts: [],
    fun_facts: [],
    core_question: "Test question?",
    status: "ready",
    opens_at: null,
    closes_at: null,
    created_by: "test-user-id",
    created_at: "2026-02-07T00:00:00Z",
    updated_at: "2026-02-07T00:00:00Z",
    ...overrides,
  };
}
