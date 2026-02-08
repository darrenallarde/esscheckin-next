import { describe, it, expect } from "vitest";
import {
  gameReducer,
  initialState,
  type GameState,
  type GameAction,
  type GameScreen,
} from "@/lib/game/state-machine";

// Helper to create a state at a specific screen
function stateAt(
  screen: GameScreen,
  overrides: Partial<GameState> = {},
): GameState {
  return { ...initialState(), ...overrides, screen };
}

// Helper: fake submit result
function fakeSubmitResult(
  round: number,
  overrides: Partial<
    GameState["rounds"][number] & { totalScore: number; sessionId: string }
  > = {},
) {
  return {
    sessionId: "sess-1",
    roundNumber: round,
    submittedAnswer: "love",
    onList: true,
    rank: 5,
    roundScore: 196,
    totalScore: 196,
    direction: round <= 2 ? "high" : "low",
    allAnswers: [
      { answer: "love", rank: 1 },
      { answer: "grace", rank: 2 },
    ],
    ...overrides,
  };
}

describe("gameReducer", () => {
  // ============================================================
  // Initial state
  // ============================================================
  describe("initialState", () => {
    it("starts at loading screen", () => {
      const state = initialState();
      expect(state.screen).toBe("loading");
      expect(state.currentRound).toBe(1);
      expect(state.rounds).toEqual([]);
      expect(state.totalScore).toBe(0);
      expect(state.authenticated).toBe(false);
      expect(state.profileId).toBeNull();
      expect(state.firstName).toBe("");
      expect(state.sessionId).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  // ============================================================
  // GAME_LOADED
  // ============================================================
  describe("GAME_LOADED", () => {
    it("transitions from loading to intro when game is active", () => {
      const state = stateAt("loading");
      const next = gameReducer(state, {
        type: "GAME_LOADED",
        gameStatus: "active",
      });
      expect(next.screen).toBe("intro");
    });

    it("transitions from loading to expired when game is expired", () => {
      const state = stateAt("loading");
      const next = gameReducer(state, {
        type: "GAME_LOADED",
        gameStatus: "expired",
      });
      expect(next.screen).toBe("expired");
    });

    it("transitions from loading to expired when game is completed", () => {
      const state = stateAt("loading");
      const next = gameReducer(state, {
        type: "GAME_LOADED",
        gameStatus: "completed",
      });
      expect(next.screen).toBe("expired");
    });

    it("transitions to expired for generating status", () => {
      const state = stateAt("loading");
      const next = gameReducer(state, {
        type: "GAME_LOADED",
        gameStatus: "generating",
      });
      expect(next.screen).toBe("expired");
    });

    it("transitions to expired for ready status", () => {
      const state = stateAt("loading");
      const next = gameReducer(state, {
        type: "GAME_LOADED",
        gameStatus: "ready",
      });
      expect(next.screen).toBe("expired");
    });
  });

  // ============================================================
  // START_GAME
  // ============================================================
  describe("START_GAME", () => {
    it("transitions from intro to auth when not authenticated", () => {
      const state = stateAt("intro", { authenticated: false });
      const next = gameReducer(state, { type: "START_GAME" });
      expect(next.screen).toBe("auth");
    });

    it("transitions from intro to round_play when authenticated", () => {
      const state = stateAt("intro", { authenticated: true });
      const next = gameReducer(state, { type: "START_GAME" });
      expect(next.screen).toBe("round_play");
      expect(next.currentRound).toBe(1);
    });
  });

  // ============================================================
  // AUTH_SUCCESS
  // ============================================================
  describe("AUTH_SUCCESS", () => {
    it("transitions from auth to round_play", () => {
      const state = stateAt("auth");
      const next = gameReducer(state, {
        type: "AUTH_SUCCESS",
        profileId: "prof-1",
        firstName: "Alice",
      });
      expect(next.screen).toBe("round_play");
      expect(next.authenticated).toBe(true);
      expect(next.profileId).toBe("prof-1");
      expect(next.firstName).toBe("Alice");
    });
  });

  // ============================================================
  // AUTH_RESTORED
  // ============================================================
  describe("AUTH_RESTORED", () => {
    it("sets auth state without changing screen", () => {
      const state = stateAt("loading");
      const next = gameReducer(state, {
        type: "AUTH_RESTORED",
        profileId: "prof-1",
        firstName: "Bob",
      });
      expect(next.screen).toBe("loading"); // screen unchanged
      expect(next.authenticated).toBe(true);
      expect(next.profileId).toBe("prof-1");
      expect(next.firstName).toBe("Bob");
    });
  });

  // ============================================================
  // SUBMIT_ANSWER
  // ============================================================
  describe("SUBMIT_ANSWER", () => {
    it("sets submitting flag", () => {
      const state = stateAt("round_play", { currentRound: 1 });
      const next = gameReducer(state, {
        type: "SUBMIT_ANSWER",
        answer: "love",
      });
      expect(next.submitting).toBe(true);
      expect(next.error).toBeNull();
    });
  });

  // ============================================================
  // ANSWER_RESULT
  // ============================================================
  describe("ANSWER_RESULT", () => {
    it("transitions to round_result and stores the result", () => {
      const state = stateAt("round_play", {
        currentRound: 1,
        submitting: true,
      });
      const result = fakeSubmitResult(1);
      const next = gameReducer(state, { type: "ANSWER_RESULT", result });
      expect(next.screen).toBe("round_result");
      expect(next.submitting).toBe(false);
      expect(next.rounds).toHaveLength(1);
      expect(next.rounds[0].roundNumber).toBe(1);
      expect(next.rounds[0].roundScore).toBe(196);
      expect(next.totalScore).toBe(196);
      expect(next.sessionId).toBe("sess-1");
    });

    it("accumulates rounds correctly", () => {
      const state = stateAt("round_play", {
        currentRound: 2,
        submitting: true,
        rounds: [
          {
            roundNumber: 1,
            submittedAnswer: "faith",
            onList: true,
            rank: 3,
            roundScore: 198,
            direction: "high",
            allAnswers: [],
          },
        ],
        totalScore: 198,
        sessionId: "sess-1",
      });
      const result = fakeSubmitResult(2, {
        roundScore: 380,
        totalScore: 578,
      });
      const next = gameReducer(state, { type: "ANSWER_RESULT", result });
      expect(next.rounds).toHaveLength(2);
      expect(next.totalScore).toBe(578);
    });

    it("sets answer grid from result", () => {
      const state = stateAt("round_play", {
        currentRound: 1,
        submitting: true,
      });
      const result = fakeSubmitResult(1);
      const next = gameReducer(state, { type: "ANSWER_RESULT", result });
      expect(next.rounds[0].allAnswers).toEqual(result.allAnswers);
    });

    it("stays on round_play when answer is NOT on list", () => {
      const state = stateAt("round_play", {
        currentRound: 1,
        submitting: true,
      });
      const result = fakeSubmitResult(1, {
        onList: false,
        rank: null,
        roundScore: 0,
        totalScore: 0,
      });
      const next = gameReducer(state, { type: "ANSWER_RESULT", result });
      expect(next.screen).toBe("round_play");
      expect(next.submitting).toBe(false);
      expect(next.rounds).toHaveLength(0);
      expect(next.lastMiss).toBe("love");
    });

    it("clears lastMiss when answer IS on list", () => {
      const state = stateAt("round_play", {
        currentRound: 1,
        submitting: true,
        lastMiss: "previous miss",
      });
      const result = fakeSubmitResult(1);
      const next = gameReducer(state, { type: "ANSWER_RESULT", result });
      expect(next.screen).toBe("round_result");
      expect(next.lastMiss).toBeNull();
    });

    it("allows retry after miss — same round, no round data stored", () => {
      let state = stateAt("round_play", {
        currentRound: 1,
        submitting: false,
      });

      // First attempt: miss
      state = gameReducer(state, { type: "SUBMIT_ANSWER", answer: "banana" });
      const missResult = fakeSubmitResult(1, {
        submittedAnswer: "banana",
        onList: false,
        rank: null,
        roundScore: 0,
        totalScore: 0,
      });
      state = gameReducer(state, { type: "ANSWER_RESULT", result: missResult });
      expect(state.screen).toBe("round_play");
      expect(state.currentRound).toBe(1);
      expect(state.rounds).toHaveLength(0);
      expect(state.lastMiss).toBe("banana");

      // Second attempt: hit
      state = gameReducer(state, { type: "SUBMIT_ANSWER", answer: "love" });
      expect(state.lastMiss).toBeNull();
      const hitResult = fakeSubmitResult(1);
      state = gameReducer(state, { type: "ANSWER_RESULT", result: hitResult });
      expect(state.screen).toBe("round_result");
      expect(state.rounds).toHaveLength(1);
      expect(state.rounds[0].onList).toBe(true);
    });
  });

  // ============================================================
  // NEXT_ROUND
  // ============================================================
  describe("NEXT_ROUND", () => {
    it("transitions from round_result to round_play and increments round", () => {
      const state = stateAt("round_result", { currentRound: 1 });
      const next = gameReducer(state, { type: "NEXT_ROUND" });
      expect(next.screen).toBe("round_play");
      expect(next.currentRound).toBe(2);
    });

    it("transitions from round_result to final_results after round 4", () => {
      const state = stateAt("round_result", { currentRound: 4 });
      const next = gameReducer(state, { type: "NEXT_ROUND" });
      expect(next.screen).toBe("final_results");
    });

    it("increments through all 4 rounds", () => {
      let state = stateAt("round_result", { currentRound: 1 });
      state = gameReducer(state, { type: "NEXT_ROUND" });
      expect(state.currentRound).toBe(2);
      expect(state.screen).toBe("round_play");

      state = { ...state, screen: "round_result" as const };
      state = gameReducer(state, { type: "NEXT_ROUND" });
      expect(state.currentRound).toBe(3);

      state = { ...state, screen: "round_result" as const };
      state = gameReducer(state, { type: "NEXT_ROUND" });
      expect(state.currentRound).toBe(4);

      state = { ...state, screen: "round_result" as const };
      state = gameReducer(state, { type: "NEXT_ROUND" });
      expect(state.screen).toBe("final_results");
    });
  });

  // ============================================================
  // VIEW_LEADERBOARD
  // ============================================================
  describe("VIEW_LEADERBOARD", () => {
    it("transitions from final_results to leaderboard", () => {
      const state = stateAt("final_results");
      const next = gameReducer(state, { type: "VIEW_LEADERBOARD" });
      expect(next.screen).toBe("leaderboard");
    });

    it("transitions from expired to leaderboard", () => {
      const state = stateAt("expired");
      const next = gameReducer(state, { type: "VIEW_LEADERBOARD" });
      expect(next.screen).toBe("leaderboard");
    });
  });

  // ============================================================
  // BACK_TO_RESULTS
  // ============================================================
  describe("BACK_TO_RESULTS", () => {
    it("transitions from leaderboard to final_results", () => {
      const state = stateAt("leaderboard");
      const next = gameReducer(state, { type: "BACK_TO_RESULTS" });
      expect(next.screen).toBe("final_results");
    });
  });

  // ============================================================
  // SET_ERROR
  // ============================================================
  describe("SET_ERROR", () => {
    it("sets error message and clears submitting", () => {
      const state = stateAt("round_play", { submitting: true });
      const next = gameReducer(state, {
        type: "SET_ERROR",
        error: "Game has closed",
      });
      expect(next.error).toBe("Game has closed");
      expect(next.submitting).toBe(false);
    });
  });

  // ============================================================
  // CLEAR_ERROR
  // ============================================================
  describe("CLEAR_ERROR", () => {
    it("clears the error", () => {
      const state = stateAt("round_play", { error: "Something broke" });
      const next = gameReducer(state, { type: "CLEAR_ERROR" });
      expect(next.error).toBeNull();
    });
  });

  // ============================================================
  // RESUME_SESSION
  // ============================================================
  describe("RESUME_SESSION", () => {
    it("resumes at the correct round", () => {
      const state = stateAt("loading", {
        authenticated: true,
        profileId: "prof-1",
      });
      const next = gameReducer(state, {
        type: "RESUME_SESSION",
        sessionId: "sess-1",
        completedRounds: [
          {
            roundNumber: 1,
            submittedAnswer: "love",
            onList: true,
            rank: 5,
            roundScore: 196,
            direction: "high",
            allAnswers: [],
          },
          {
            roundNumber: 2,
            submittedAnswer: "grace",
            onList: true,
            rank: 10,
            roundScore: 382,
            direction: "high",
            allAnswers: [],
          },
        ],
        totalScore: 578,
      });
      expect(next.sessionId).toBe("sess-1");
      expect(next.rounds).toHaveLength(2);
      expect(next.totalScore).toBe(578);
      expect(next.currentRound).toBe(3);
      expect(next.screen).toBe("round_play");
    });

    it("resumes to final_results when all 4 rounds complete", () => {
      const state = stateAt("loading", {
        authenticated: true,
        profileId: "prof-1",
      });
      const rounds = [1, 2, 3, 4].map((r) => ({
        roundNumber: r,
        submittedAnswer: "answer",
        onList: true,
        rank: 1,
        roundScore: 100,
        direction: r <= 2 ? "high" : "low",
        allAnswers: [],
      }));
      const next = gameReducer(state, {
        type: "RESUME_SESSION",
        sessionId: "sess-1",
        completedRounds: rounds,
        totalScore: 400,
      });
      expect(next.screen).toBe("final_results");
      expect(next.currentRound).toBe(4);
    });

    it("resumes with no rounds goes to round_play round 1", () => {
      const state = stateAt("loading", {
        authenticated: true,
        profileId: "prof-1",
      });
      const next = gameReducer(state, {
        type: "RESUME_SESSION",
        sessionId: "sess-1",
        completedRounds: [],
        totalScore: 0,
      });
      expect(next.screen).toBe("round_play");
      expect(next.currentRound).toBe(1);
    });
  });

  // ============================================================
  // GAME_EXPIRED
  // ============================================================
  describe("GAME_EXPIRED", () => {
    it("transitions any screen to expired", () => {
      const screens: GameScreen[] = [
        "intro",
        "auth",
        "round_play",
        "round_result",
      ];
      for (const screen of screens) {
        const state = stateAt(screen);
        const next = gameReducer(state, { type: "GAME_EXPIRED" });
        expect(next.screen).toBe("expired");
      }
    });
  });

  // ============================================================
  // Edge cases: invalid transitions are no-ops
  // ============================================================
  describe("invalid transitions", () => {
    it("ignores START_GAME from non-intro screen", () => {
      const state = stateAt("round_play");
      const next = gameReducer(state, { type: "START_GAME" });
      expect(next).toEqual(state);
    });

    it("ignores NEXT_ROUND from non-round_result screen", () => {
      const state = stateAt("round_play");
      const next = gameReducer(state, { type: "NEXT_ROUND" });
      expect(next).toEqual(state);
    });

    it("ignores AUTH_SUCCESS from non-auth screen", () => {
      const state = stateAt("round_play");
      const next = gameReducer(state, {
        type: "AUTH_SUCCESS",
        profileId: "prof-1",
        firstName: "Test",
      });
      expect(next).toEqual(state);
    });

    it("ignores VIEW_LEADERBOARD from round_play", () => {
      const state = stateAt("round_play");
      const next = gameReducer(state, { type: "VIEW_LEADERBOARD" });
      expect(next).toEqual(state);
    });

    it("ignores BACK_TO_RESULTS from round_play", () => {
      const state = stateAt("round_play");
      const next = gameReducer(state, { type: "BACK_TO_RESULTS" });
      expect(next).toEqual(state);
    });

    it("ignores GAME_LOADED from non-loading screen", () => {
      const state = stateAt("intro");
      const next = gameReducer(state, {
        type: "GAME_LOADED",
        gameStatus: "active",
      });
      expect(next).toEqual(state);
    });
  });

  // ============================================================
  // GAME_EXPIRED from late-game screens
  // ============================================================
  describe("GAME_EXPIRED (additional screens)", () => {
    it("transitions from final_results to expired", () => {
      const state = stateAt("final_results");
      const next = gameReducer(state, { type: "GAME_EXPIRED" });
      expect(next.screen).toBe("expired");
    });

    it("transitions from leaderboard to expired", () => {
      const state = stateAt("leaderboard");
      const next = gameReducer(state, { type: "GAME_EXPIRED" });
      expect(next.screen).toBe("expired");
    });
  });

  // ============================================================
  // SUBMIT_ANSWER clears previous error
  // ============================================================
  describe("SUBMIT_ANSWER error clearing", () => {
    it("clears previous error when submitting", () => {
      const state = stateAt("round_play", {
        currentRound: 1,
        error: "Previous error",
      });
      const next = gameReducer(state, {
        type: "SUBMIT_ANSWER",
        answer: "love",
      });
      expect(next.submitting).toBe(true);
      expect(next.error).toBeNull();
    });
  });

  // ============================================================
  // RESUME_SESSION edge cases
  // ============================================================
  describe("RESUME_SESSION (edge cases)", () => {
    it("resumes with 1 completed round to currentRound=2, round_play", () => {
      const state = stateAt("loading", {
        authenticated: true,
        profileId: "prof-1",
      });
      const next = gameReducer(state, {
        type: "RESUME_SESSION",
        sessionId: "sess-1",
        completedRounds: [
          {
            roundNumber: 1,
            submittedAnswer: "love",
            onList: true,
            rank: 5,
            roundScore: 196,
            direction: "high",
            allAnswers: [],
          },
        ],
        totalScore: 196,
      });
      expect(next.currentRound).toBe(2);
      expect(next.screen).toBe("round_play");
      expect(next.rounds).toHaveLength(1);
    });

    it("resumes with 3 completed rounds to currentRound=4, round_play", () => {
      const state = stateAt("loading", {
        authenticated: true,
        profileId: "prof-1",
      });
      const rounds = [1, 2, 3].map((r) => ({
        roundNumber: r,
        submittedAnswer: "answer",
        onList: true,
        rank: 10,
        roundScore: 100,
        direction: r <= 2 ? "high" : "low",
        allAnswers: [],
      }));
      const next = gameReducer(state, {
        type: "RESUME_SESSION",
        sessionId: "sess-1",
        completedRounds: rounds,
        totalScore: 300,
      });
      expect(next.currentRound).toBe(4);
      expect(next.screen).toBe("round_play");
      expect(next.rounds).toHaveLength(3);
    });
  });

  // ============================================================
  // AUTH_RESTORED then START_GAME skips auth screen
  // ============================================================
  describe("AUTH_RESTORED + START_GAME flow", () => {
    it("skips auth screen when auth was restored before starting", () => {
      let state = stateAt("loading");

      // Auth restored during loading
      state = gameReducer(state, {
        type: "AUTH_RESTORED",
        profileId: "prof-1",
        firstName: "Alice",
      });
      expect(state.screen).toBe("loading");
      expect(state.authenticated).toBe(true);

      // Game loads
      state = gameReducer(state, {
        type: "GAME_LOADED",
        gameStatus: "active",
      });
      expect(state.screen).toBe("intro");

      // Start game — should skip auth since already authenticated
      state = gameReducer(state, { type: "START_GAME" });
      expect(state.screen).toBe("round_play");
    });
  });

  // ============================================================
  // Full happy path: loading → intro → auth → 4×(play→result) → final → leaderboard
  // ============================================================
  describe("full happy path", () => {
    it("completes entire game flow from loading to leaderboard", () => {
      let state = initialState();
      expect(state.screen).toBe("loading");

      // Game loads
      state = gameReducer(state, {
        type: "GAME_LOADED",
        gameStatus: "active",
      });
      expect(state.screen).toBe("intro");

      // Start game (not authenticated)
      state = gameReducer(state, { type: "START_GAME" });
      expect(state.screen).toBe("auth");

      // Authenticate
      state = gameReducer(state, {
        type: "AUTH_SUCCESS",
        profileId: "prof-1",
        firstName: "Alice",
      });
      expect(state.screen).toBe("round_play");
      expect(state.currentRound).toBe(1);

      // Play 4 rounds
      for (let round = 1; round <= 4; round++) {
        // Submit answer
        state = gameReducer(state, {
          type: "SUBMIT_ANSWER",
          answer: `answer${round}`,
        });
        expect(state.submitting).toBe(true);

        // Get result
        state = gameReducer(state, {
          type: "ANSWER_RESULT",
          result: fakeSubmitResult(round, {
            totalScore: round * 196,
          }),
        });
        expect(state.screen).toBe("round_result");
        expect(state.rounds).toHaveLength(round);

        // Next round
        state = gameReducer(state, { type: "NEXT_ROUND" });
        if (round < 4) {
          expect(state.screen).toBe("round_play");
          expect(state.currentRound).toBe(round + 1);
        } else {
          expect(state.screen).toBe("final_results");
        }
      }

      // View leaderboard
      state = gameReducer(state, { type: "VIEW_LEADERBOARD" });
      expect(state.screen).toBe("leaderboard");

      // Back to results
      state = gameReducer(state, { type: "BACK_TO_RESULTS" });
      expect(state.screen).toBe("final_results");
    });
  });
});
