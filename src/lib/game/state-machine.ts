/**
 * Hi-Lo Game State Machine
 *
 * Pure reducer for the player-facing game flow.
 * Screens: loading → intro → auth → round_play → round_result (×4) → final_results → leaderboard
 *
 * Designed to be used with React's useReducer.
 */

export type GameScreen =
  | "loading"
  | "intro"
  | "auth"
  | "round_play"
  | "round_result"
  | "final_results"
  | "leaderboard"
  | "expired";

export interface RoundData {
  roundNumber: number;
  submittedAnswer: string;
  onList: boolean;
  rank: number | null;
  roundScore: number;
  direction: string;
  allAnswers: { answer: string; rank: number }[];
}

export interface GameState {
  screen: GameScreen;
  currentRound: number;
  rounds: RoundData[];
  totalScore: number;
  authenticated: boolean;
  profileId: string | null;
  firstName: string;
  sessionId: string | null;
  submitting: boolean;
  error: string | null;
  lastMiss: string | null;
}

export type GameAction =
  | { type: "GAME_LOADED"; gameStatus: string }
  | { type: "START_GAME" }
  | { type: "AUTH_SUCCESS"; profileId: string; firstName: string }
  | { type: "AUTH_RESTORED"; profileId: string; firstName: string }
  | { type: "SUBMIT_ANSWER"; answer: string }
  | {
      type: "ANSWER_RESULT";
      result: {
        sessionId: string;
        roundNumber: number;
        submittedAnswer: string;
        onList: boolean;
        rank: number | null;
        roundScore: number;
        totalScore: number;
        direction: string;
        allAnswers: { answer: string; rank: number }[];
      };
    }
  | { type: "NEXT_ROUND" }
  | { type: "VIEW_LEADERBOARD" }
  | { type: "BACK_TO_RESULTS" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" }
  | {
      type: "RESUME_SESSION";
      sessionId: string;
      completedRounds: RoundData[];
      totalScore: number;
    }
  | { type: "GAME_EXPIRED" };

export function initialState(): GameState {
  return {
    screen: "loading",
    currentRound: 1,
    rounds: [],
    totalScore: 0,
    authenticated: false,
    profileId: null,
    firstName: "",
    sessionId: null,
    submitting: false,
    error: null,
    lastMiss: null,
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "GAME_LOADED": {
      if (state.screen !== "loading") return state;
      const screen = action.gameStatus === "active" ? "intro" : "expired";
      return { ...state, screen };
    }

    case "START_GAME": {
      if (state.screen !== "intro") return state;
      return {
        ...state,
        screen: state.authenticated ? "round_play" : "auth",
      };
    }

    case "AUTH_SUCCESS": {
      if (state.screen !== "auth") return state;
      return {
        ...state,
        screen: "round_play",
        authenticated: true,
        profileId: action.profileId,
        firstName: action.firstName,
      };
    }

    case "AUTH_RESTORED": {
      return {
        ...state,
        authenticated: true,
        profileId: action.profileId,
        firstName: action.firstName,
      };
    }

    case "SUBMIT_ANSWER": {
      return { ...state, submitting: true, error: null, lastMiss: null };
    }

    case "ANSWER_RESULT": {
      const { result } = action;

      // Miss: stay on round_play, show feedback, let them try again
      if (!result.onList) {
        return {
          ...state,
          submitting: false,
          lastMiss: result.submittedAnswer,
        };
      }

      // Hit: record the round and show result
      const roundData: RoundData = {
        roundNumber: result.roundNumber,
        submittedAnswer: result.submittedAnswer,
        onList: result.onList,
        rank: result.rank,
        roundScore: result.roundScore,
        direction: result.direction,
        allAnswers: result.allAnswers,
      };
      return {
        ...state,
        screen: "round_result",
        submitting: false,
        lastMiss: null,
        rounds: [...state.rounds, roundData],
        totalScore: result.totalScore,
        sessionId: result.sessionId,
      };
    }

    case "NEXT_ROUND": {
      if (state.screen !== "round_result") return state;
      if (state.currentRound >= 4) {
        return { ...state, screen: "final_results" };
      }
      return {
        ...state,
        screen: "round_play",
        currentRound: state.currentRound + 1,
      };
    }

    case "VIEW_LEADERBOARD": {
      if (state.screen !== "final_results" && state.screen !== "expired")
        return state;
      return { ...state, screen: "leaderboard" };
    }

    case "BACK_TO_RESULTS": {
      if (state.screen !== "leaderboard") return state;
      return { ...state, screen: "final_results" };
    }

    case "SET_ERROR": {
      return { ...state, error: action.error, submitting: false };
    }

    case "CLEAR_ERROR": {
      return { ...state, error: null };
    }

    case "RESUME_SESSION": {
      const nextRound = action.completedRounds.length + 1;
      const allDone = action.completedRounds.length >= 4;
      return {
        ...state,
        sessionId: action.sessionId,
        rounds: action.completedRounds,
        totalScore: action.totalScore,
        currentRound: allDone ? 4 : nextRound,
        screen: allDone ? "final_results" : "round_play",
      };
    }

    case "GAME_EXPIRED": {
      return { ...state, screen: "expired" };
    }

    default:
      return state;
  }
}
