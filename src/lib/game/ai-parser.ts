/**
 * Hi-Lo Game AI Response Parser
 *
 * Parses and validates the Claude-generated game content.
 * Handles markdown code blocks, malformed JSON, and data validation.
 */

export interface GameAnswer {
  answer: string;
  rank: number;
}

export interface GameAIResponse {
  scripture_verses: string;
  historical_facts: { fact: string; source: string }[];
  fun_facts: { fact: string }[];
  core_question: string;
  answers: GameAnswer[];
}

type ParseSuccess = { success: true; data: GameAIResponse };
type ParseFailure = { success: false; error: string };
type ParseResult = ParseSuccess | ParseFailure;

type ValidationSuccess = { valid: true };
type ValidationFailure = { valid: false; error: string };
type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Parse raw AI text output into a validated GameAIResponse.
 * Handles markdown code blocks and validates structure.
 */
export function parseGameAIResponse(raw: string): ParseResult {
  // Strip markdown code block wrappers if present
  let cleaned = raw.trim();
  const codeBlockMatch = cleaned.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }

  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { success: false, error: "Failed to parse JSON from AI response" };
  }

  // Validate top-level structure
  if (typeof parsed !== "object" || parsed === null) {
    return { success: false, error: "AI response is not an object" };
  }

  const obj = parsed as Record<string, unknown>;

  // Required fields
  if (typeof obj.core_question !== "string" || !obj.core_question) {
    return { success: false, error: "Missing or invalid core_question" };
  }

  if (typeof obj.scripture_verses !== "string" || !obj.scripture_verses) {
    return { success: false, error: "Missing or invalid scripture_verses" };
  }

  if (!Array.isArray(obj.answers)) {
    return { success: false, error: "Missing or invalid answers array" };
  }

  if (
    !Array.isArray(obj.historical_facts) ||
    obj.historical_facts.length !== 3
  ) {
    return {
      success: false,
      error: "historical_facts must be an array of exactly 3 items",
    };
  }

  if (!Array.isArray(obj.fun_facts) || obj.fun_facts.length !== 3) {
    return {
      success: false,
      error: "fun_facts must be an array of exactly 3 items",
    };
  }

  // Validate answers
  const answerValidation = validateGameAnswers(obj.answers as GameAnswer[]);
  if (!answerValidation.valid) {
    return { success: false, error: answerValidation.error };
  }

  return {
    success: true,
    data: parsed as GameAIResponse,
  };
}

/**
 * Validate the 400-answer list for completeness and uniqueness.
 */
export function validateGameAnswers(answers: GameAnswer[]): ValidationResult {
  if (answers.length < 350 || answers.length > 400) {
    return {
      valid: false,
      error: `Expected 350-400 answers, got ${answers.length}`,
    };
  }

  const ranks = new Set<number>();
  const words = new Set<string>();

  for (const a of answers) {
    if (typeof a.answer !== "string" || !a.answer.trim()) {
      return { valid: false, error: "Answer contains empty string" };
    }

    if (typeof a.rank !== "number" || a.rank < 1 || a.rank > 400) {
      return {
        valid: false,
        error: `Invalid rank ${a.rank}: must be 1-400`,
      };
    }

    if (ranks.has(a.rank)) {
      return { valid: false, error: `Duplicate rank: ${a.rank}` };
    }
    ranks.add(a.rank);

    const normalized = a.answer.trim().toLowerCase();
    if (words.has(normalized)) {
      return {
        valid: false,
        error: `Duplicate duplicate answer: "${a.answer}"`,
      };
    }
    words.add(normalized);
  }

  return { valid: true };
}
