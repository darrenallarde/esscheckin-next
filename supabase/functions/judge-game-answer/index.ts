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
  return `You are the game master for a youth ministry Hi-Lo trivia game. Judge the player's answer by following these steps IN ORDER.

Question: "${coreQuestion}"
Player's answer: "${answer}"

The ${answerCount} seed answers (1 = most popular):
${answers.map((a) => `${a.rank}. ${a.answer}`).join("\n")}

## STEP 1: Content check
Reject ONLY if genuinely inappropriate for a church screen: profanity, slurs, sexual content, demonic/occult references, or gratuitous violence.
→ If inappropriate: {"valid": false, "rank": null, "matched_to": null, "reason": "inappropriate"}

## STEP 2: Word form match
Is the answer a different FORM of a seed answer? (plural ↔ singular, tense change, gerund, etc.)
Examples: "save" → "saves" ✓, "forgiving" → "forgives" ✓, "helped" → "helps" ✓
→ If word form: use that seed answer's EXACT rank. Set matched_to to the seed word.

## STEP 3: True synonym match
Is the answer the SAME CONCEPT as a seed answer — would a reasonable person say "that's basically the same answer"?
The test: substitute them in the question. If the meaning is the same, it's a match.

YES — same concept:
- "rescue" ↔ "saves" (both = delivering from danger)
- "pardons" ↔ "forgives" (both = releasing from guilt)

NO — different concepts, even if loosely related:
- "yell" ≠ "speaks" (yelling is aggressive, speaking is communication)
- "think" ≠ "guides" (thinking is cognitive, guiding is directional)
- "walk" ≠ "carries" (walking is self-powered, carrying is lifting someone)

Be STRICT here. If you have to stretch to justify the match, it's NOT a match.
→ If true synonym: use that seed answer's rank. Set matched_to to the seed word.

## STEP 4: New valid answer
The answer doesn't match any seed, but it's a legitimate response to the question.
Assign a NEW rank based on how popular it would be if 100,000 teens were surveyed.
Place it honestly: common new answers near rank ${Math.round(answerCount * 0.6)}-${answerCount}, obscure ones ${answerCount + 1}-${answerCount + 50}.
Set matched_to to "new".

When in doubt between rejecting and accepting as new, ACCEPT as new with a high rank.

Respond in JSON ONLY:
{"valid": true/false, "rank": <number or null>, "matched_to": "<seed word or 'new' or null>", "reason": "<5 words max>"}`;
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
      console.log(
        JSON.stringify({
          event: "fast_path_hit",
          answer: normalized,
          rank: exactMatch.rank,
          game_id,
        }),
      );
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

    console.log(
      JSON.stringify({
        event: "ai_judge_start",
        answer: normalized,
        question: game.core_question,
        game_id,
        round_number,
        answer_count: answerCount,
        existing_answers: existingAnswers?.length || 0,
      }),
    );

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
    let judgment: {
      valid: boolean;
      rank: number | null;
      matched_to?: string | null;
      reason: string;
    };
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
      JSON.stringify({
        event: "ai_judge_result",
        answer: normalized,
        valid: judgment.valid,
        rank: judgment.rank,
        matched_to: judgment.matched_to || null,
        reason: judgment.reason,
        raw_response: aiText,
        game_id,
      }),
    );

    // 6. If invalid/inappropriate — return miss
    if (!judgment.valid || judgment.rank === null) {
      console.log(
        `❌ AI rejected: "${normalized}" | reason="${judgment.reason}" | question="${game.core_question}"`,
      );
      // Pass player's actual answer — it won't match in game_answers, triggering miss-no-insert
      const { data: rpcResult, error: rpcError } = await userClient.rpc(
        "submit_game_answer",
        {
          p_game_id: game_id,
          p_round_number: round_number,
          p_answer: normalized,
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
      console.warn(
        JSON.stringify({
          event: "ai_cache_insert_warning",
          answer: normalized,
          rank: aiRank,
          error: insertError.message,
          game_id,
        }),
      );
    } else {
      console.log(
        JSON.stringify({
          event: "ai_cache_insert",
          answer: normalized,
          rank: aiRank,
          game_id,
        }),
      );
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
