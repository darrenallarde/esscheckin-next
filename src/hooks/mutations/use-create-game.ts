"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface CreateGameInput {
  organizationId: string;
  devotionalId: string;
}

export interface CreateGameResult {
  gameId: string;
  coreQuestion: string;
  answersCreated: number;
  gameUrl: string;
}

async function createGame(input: CreateGameInput): Promise<CreateGameResult> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  // 1. Insert game record with placeholder content
  const { data: game, error: insertError } = await supabase
    .from("games")
    .insert({
      organization_id: input.organizationId,
      devotional_id: input.devotionalId,
      scripture_verses: "",
      core_question: "",
      status: "generating",
      created_by: session.user.id,
    })
    .select("id")
    .single();

  if (insertError || !game) {
    throw new Error(insertError?.message || "Failed to create game record");
  }

  // 2. Call generate-game edge function
  const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-game`;
  const response = await fetch(edgeFunctionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ game_id: game.id }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Game generation failed (${response.status})`,
    );
  }

  const result = await response.json();

  // 3. Auto-activate with 7-day window
  const now = new Date();
  const closesAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { error: activateError } = await supabase
    .from("games")
    .update({
      status: "active",
      opens_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
    })
    .eq("id", game.id);

  if (activateError) {
    throw new Error(`Failed to activate game: ${activateError.message}`);
  }

  const gameUrl = `${window.location.origin}/g/${game.id}`;

  return {
    gameId: game.id,
    coreQuestion: result.core_question || "",
    answersCreated: result.answers_created || 0,
    gameUrl,
  };
}

export function useCreateGame() {
  return useMutation({
    mutationFn: createGame,
  });
}
