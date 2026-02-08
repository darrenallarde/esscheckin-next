"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface SubmitAnswerInput {
  gameId: string;
  roundNumber: number;
  answer: string;
}

export interface SubmitAnswerResult {
  session_id: string;
  round_number: number;
  submitted_answer: string;
  on_list: boolean;
  rank: number | null;
  round_score: number;
  total_score: number;
  direction: string;
  all_answers: { answer: string; rank: number }[];
}

async function submitAnswer(
  input: SubmitAnswerInput,
): Promise<SubmitAnswerResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const response = await fetch(
    `${supabaseUrl}/functions/v1/judge-game-answer`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        game_id: input.gameId,
        round_number: input.roundNumber,
        answer: input.answer,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return data as SubmitAnswerResult;
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: submitAnswer,
  });
}
