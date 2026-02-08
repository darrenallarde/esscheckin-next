import { describe, expect, it } from "vitest";

import {
  parseGameAIResponse,
  validateGameAnswers,
  type GameAIResponse,
} from "@/lib/game/ai-parser";

describe("parseGameAIResponse", () => {
  it("parses a valid JSON response with 120 answers", () => {
    const raw = JSON.stringify(makeValidResponse(120));
    const result = parseGameAIResponse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.core_question).toBe(
        "What one word describes this food?",
      );
      expect(result.data.answers).toHaveLength(120);
      expect(result.data.historical_facts).toHaveLength(3);
      expect(result.data.fun_facts).toHaveLength(3);
    }
  });

  it("handles JSON wrapped in markdown code block", () => {
    const raw = "```json\n" + JSON.stringify(makeValidResponse(100)) + "\n```";
    const result = parseGameAIResponse(raw);
    expect(result.success).toBe(true);
  });

  it("handles JSON wrapped in plain code block", () => {
    const raw = "```\n" + JSON.stringify(makeValidResponse(100)) + "\n```";
    const result = parseGameAIResponse(raw);
    expect(result.success).toBe(true);
  });

  it("fails on completely invalid JSON", () => {
    const result = parseGameAIResponse("not json at all");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("parse");
    }
  });

  it("fails when core_question is missing", () => {
    const response = makeValidResponse(100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (response as any).core_question;
    const result = parseGameAIResponse(JSON.stringify(response));
    expect(result.success).toBe(false);
  });

  it("fails when answers array is missing", () => {
    const response = makeValidResponse(100);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (response as any).answers;
    const result = parseGameAIResponse(JSON.stringify(response));
    expect(result.success).toBe(false);
  });

  it("fails when historical_facts has wrong count", () => {
    const response = makeValidResponse(100);
    response.historical_facts = [{ fact: "one", source: "ctx" }];
    const result = parseGameAIResponse(JSON.stringify(response));
    expect(result.success).toBe(false);
  });

  it("fails when fun_facts has wrong count", () => {
    const response = makeValidResponse(100);
    response.fun_facts = [];
    const result = parseGameAIResponse(JSON.stringify(response));
    expect(result.success).toBe(false);
  });
});

describe("validateGameAnswers", () => {
  it("passes for 120 unique answers", () => {
    const answers = makeAnswers(120);
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(true);
  });

  it("passes for 80 answers (minimum threshold)", () => {
    const answers = makeAnswers(80);
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(true);
  });

  it("passes for 200 answers (maximum threshold)", () => {
    const answers = makeAnswers(200);
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(true);
  });

  it("passes for 150 answers (mid-range)", () => {
    const answers = makeAnswers(150);
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(true);
  });

  it("fails when answer count is below 80", () => {
    const answers = makeAnswers(79);
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("80");
    }
  });

  it("fails when answer count exceeds 200", () => {
    const answers = makeAnswers(201);
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("200");
    }
  });

  it("fails when ranks have duplicates", () => {
    const answers = makeAnswers(100);
    answers[99].rank = 1; // duplicate rank
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("rank");
    }
  });

  it("fails when answers have duplicates", () => {
    const answers = makeAnswers(100);
    answers[99].answer = answers[0].answer; // duplicate word
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("duplicate");
    }
  });

  it("fails when a rank is out of range (0)", () => {
    const answers = makeAnswers(100);
    answers[0].rank = 0;
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(false);
  });

  it("allows ranks up to 500 (room for AI-judged answers)", () => {
    const answers = makeAnswers(100);
    answers[99].rank = 500;
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(true);
  });

  it("fails when a rank exceeds 500", () => {
    const answers = makeAnswers(100);
    answers[99].rank = 501;
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(false);
  });

  it("fails when an answer is empty string", () => {
    const answers = makeAnswers(100);
    answers[0].answer = "";
    const result = validateGameAnswers(answers);
    expect(result.valid).toBe(false);
  });
});

// --- Test Helpers ---

function makeAnswers(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    answer: `word${i + 1}`,
    rank: i + 1,
  }));
}

function makeValidResponse(answerCount: number = 120): GameAIResponse {
  return {
    scripture_verses: "For God so loved the world...",
    historical_facts: [
      { fact: "Historical fact 1", source: "contextual" },
      { fact: "Historical fact 2", source: "contextual" },
      { fact: "Historical fact 3", source: "contextual" },
    ],
    fun_facts: [
      { fact: "Fun fact 1" },
      { fact: "Fun fact 2" },
      { fact: "Fun fact 3" },
    ],
    core_question: "What one word describes this food?",
    answers: makeAnswers(answerCount),
  };
}
