// AI Game Manager — judges player answers for Hi-Lo games
// Fast path: exact match in game_answers → call RPC → return (50ms)
// AI path: no match → ask Claude Haiku → cache → call RPC → return (500ms)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function buildJudgePrompt(
  coreQuestion: string,
  answer: string,
  answers: { answer: string; rank: number }[],
  answerCount: number,
): string {
  return `You are the game manager for a Hi-Lo youth ministry trivia game.

Question: "${coreQuestion}"
Player's answer: "${answer}"

Existing ranked answers (1 = most popular, ${answerCount} = least):
${answers.map((a) => `${a.rank}. ${a.answer}`).join("\n")}

Rules:
1. Is "${answer}" a legitimate, appropriate answer to the question?
2. REJECT if ANY of these apply:
   - Profanity, slurs, crude humor
   - Sexual or suggestive content
   - Demonic/occult words (satan, demon, hell-as-swear, witchcraft, curse, etc.)
   - Violent words (kill, murder, stab) unless clearly biblical (e.g., "sacrifice")
   - Not actually answering the question
   - A youth pastor would be uncomfortable seeing it on screen
3. If it's a word form of an existing answer (plural, past tense, gerund), assign that answer's rank.
4. If it's a synonym of an existing answer, assign a rank close to but not identical to that answer.
5. If it's a new valid answer, assign a rank based on where it would fall if 100,000 teens were surveyed.
6. Ranks can range from 1 to ${answerCount + 50} (beyond the seed list for very obscure answers).

Respond in JSON ONLY:
{"valid": true/false, "rank": <number or null>, "reason": "<5 words max>"}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    // Create two clients:
    // - serviceClient: for direct table access (inserting AI judgments)
    // - userClient: for calling RPCs that need auth context
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Verify token is valid
    const {
      data: { user },
      error: authError,
    } = await serviceClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Parse request
    const body = await req.json();
    const { game_id, round_number, answer } = body;

    if (!game_id || !round_number || !answer) {
      return new Response(
        JSON.stringify({ error: "Missing game_id, round_number, or answer" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Normalize answer for matching
    const normalized = answer.trim().toLowerCase().replace(/\s+/g, " ");

    // 3. Fetch game data + existing answers
    const { data: game, error: gameError } = await serviceClient
      .from("games")
      .select("id, core_question, answer_count, status")
      .eq("id", game_id)
      .single();

    if (gameError || !game) {
      return new Response(JSON.stringify({ error: "Game not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const answerCount = game.answer_count || 400;

    // 4. Check exact match in game_answers
    const { data: existingAnswers } = await serviceClient
      .from("game_answers")
      .select("answer, rank")
      .eq("game_id", game_id)
      .order("rank", { ascending: true });

    const exactMatch = existingAnswers?.find(
      (a: { answer: string }) => a.answer.toLowerCase().trim() === normalized,
    );

    if (exactMatch) {
      // FAST PATH — exact match found, call RPC directly
      console.log(`⚡ Fast path: "${normalized}" → rank ${exactMatch.rank}`);
      const { data: rpcResult, error: rpcError } = await userClient.rpc(
        "submit_game_answer",
        {
          p_game_id: game_id,
          p_round_number: round_number,
          p_answer: normalized,
        },
      );

      if (rpcError) {
        return new Response(JSON.stringify({ error: rpcError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(rpcResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. AI PATH — no exact match, ask Claude Haiku
    if (!ANTHROPIC_API_KEY) {
      // Fallback: no AI key, just return miss
      return new Response(
        JSON.stringify({
          session_id: null,
          round_number,
          submitted_answer: normalized,
          on_list: false,
          rank: null,
          round_score: 0,
          total_score: 0,
          direction: round_number <= 2 ? "high" : "low",
          all_answers: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`🤖 AI judging: "${normalized}" for "${game.core_question}"`);

    const judgePrompt = buildJudgePrompt(
      game.core_question,
      normalized,
      existingAnswers || [],
      answerCount,
    );

    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: judgePrompt }],
      }),
    });

    if (!aiResponse.ok) {
      console.error("AI judge error:", await aiResponse.text());
      // Fallback: treat as miss on AI failure
      return new Response(
        JSON.stringify({
          session_id: null,
          round_number,
          submitted_answer: normalized,
          on_list: false,
          rank: null,
          round_score: 0,
          total_score: 0,
          direction: round_number <= 2 ? "high" : "low",
          all_answers: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.content[0].text.trim();

    // Parse AI response
    let judgment: { valid: boolean; rank: number | null; reason: string };
    try {
      // Strip code fences if present
      let cleanText = aiText;
      const codeMatch = cleanText.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
      if (codeMatch) cleanText = codeMatch[1].trim();
      judgment = JSON.parse(cleanText);
    } catch {
      console.error("Failed to parse AI judgment:", aiText);
      // Treat unparseable response as miss
      judgment = { valid: false, rank: null, reason: "parse error" };
    }

    console.log(
      `🎯 AI verdict: valid=${judgment.valid}, rank=${judgment.rank}, reason="${judgment.reason}"`,
    );

    // 6. If invalid/inappropriate — return miss
    if (!judgment.valid || judgment.rank === null) {
      // Need to call RPC to get session_id and total_score even for misses
      const { data: rpcResult, error: rpcError } = await userClient.rpc(
        "submit_game_answer",
        {
          p_game_id: game_id,
          p_round_number: round_number,
          p_answer: `__ai_miss_${Date.now()}`, // guaranteed miss — won't match any answer
        },
      );

      if (rpcError) {
        // Round may already be submitted, or other error
        return new Response(JSON.stringify({ error: rpcError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(rpcResult), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Valid — cache in game_answers, then call RPC
    const aiRank = Math.max(1, Math.min(500, Math.round(judgment.rank)));

    // Insert AI-judged answer into game_answers (cached for future players)
    const { error: insertError } = await serviceClient
      .from("game_answers")
      .insert({
        game_id,
        answer: normalized,
        rank: aiRank,
        is_ai_judged: true,
      });

    if (insertError) {
      // Could be a duplicate answer — another player may have cached it concurrently
      console.warn("AI answer insert warning:", insertError.message);
    }

    // Now call RPC — the answer is in game_answers, so it will match
    const { data: rpcResult, error: rpcError } = await userClient.rpc(
      "submit_game_answer",
      {
        p_game_id: game_id,
        p_round_number: round_number,
        p_answer: normalized,
      },
    );

    if (rpcError) {
      return new Response(JSON.stringify({ error: rpcError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(rpcResult), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
