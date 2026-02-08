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
  const { data, error } = await supabase.rpc("submit_game_answer", {
    p_game_id: input.gameId,
    p_round_number: input.roundNumber,
    p_answer: input.answer,
  });

  if (error) throw error;
  if (!data) throw new Error("No result returned");

  return data as unknown as SubmitAnswerResult;
}

export function useSubmitAnswer() {
  return useMutation({
    mutationFn: submitAnswer,
  });
}
