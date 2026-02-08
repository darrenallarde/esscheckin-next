export { calculateRoundScore, calculateTotalScore } from "./scoring";
export type { RoundResult } from "./scoring";

export {
  normalizeAnswer,
  getRoundDirection,
  isGameOpen,
  getGameStatus,
} from "./utils";
export type { GameRecord, GameStatus, RoundDirection } from "./utils";

export { parseGameAIResponse, validateGameAnswers } from "./ai-parser";
export type { GameAIResponse, GameAnswer } from "./ai-parser";

export { gameReducer, initialState } from "./state-machine";
export type {
  GameScreen,
  GameState,
  GameAction,
  RoundData,
} from "./state-machine";
