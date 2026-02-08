// Supabase Edge Function to generate a Hi-Lo trivia game from a devotional
// Called after a leader creates a game from the curriculum page

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

function buildPrompt(devotional: {
  title: string;
  scripture_reference: string | null;
  scripture_text: string | null;
  reflection: string | null;
  discussion_question: string | null;
}): string {
  return `You are creating content for a Jackbox-style trivia game called "Hi-Lo" for youth ministry students (grades 6-12).

## SOURCE DEVOTIONAL
Title: ${devotional.title}
${devotional.scripture_reference ? `Scripture: ${devotional.scripture_reference}` : ""}
${devotional.scripture_text ? `"${devotional.scripture_text}"` : ""}
${devotional.reflection ? `Reflection: ${devotional.reflection}` : ""}
${devotional.discussion_question ? `Discussion Question: ${devotional.discussion_question}` : ""}

## YOUR TASK

Generate a complete Hi-Lo game package with these components:

### 1. scripture_verses
Select the most impactful 2-4 verses from the devotional's scripture passage. If the devotional only has 1-2 verses, include all of them. Format as a readable text block with the reference.

### 2. historical_facts (exactly 3)
Three real historical facts about the time period, culture, or setting of the scripture passage. Each should be:
- Accurate and educational
- Contextually connected to the scripture
- Interesting to teenagers
- Include a brief source context (e.g., "Roman customs", "1st century Palestine", "Ancient Near East")

### 3. fun_facts (exactly 3)
Three surprising or entertaining facts from the same era. These should make teens say "wait, really?!" Things like:
- Daily life details
- Food, games, or customs
- Comparisons to modern life

### 4. core_question
A single question that can be answered in ONE WORD. The question must be:
- Grounded in the scripture/devotional context
- Answerable by teenagers (not too obscure)
- Open-ended enough that many different words are valid answers
- Could range from theological to cultural to practical

Examples of good questions:
- "What one word describes what the disciples felt when they saw the empty tomb?"
- "What type of food do you think was most commonly eaten in this story?"
- "What one word would you use to describe God's response?"

### 5. answers (exactly 200)
200 single-word answers ranked from 1 (most popular — what most teenagers would say) to 200 (least popular — what almost no one would think of).

Rules for the answer list:
- Each answer is a single word (or at most two words for compound concepts like "olive oil")
- All answers must be legitimate responses to the question
- Rank 1-10: The obvious, first-thing-you'd-think-of answers
- Rank 11-50: Common but slightly less obvious
- Rank 51-100: Reasonable but require some thought
- Rank 101-150: Creative, less common answers
- Rank 151-200: Obscure but still valid answers
- NO duplicate words
- NO offensive or inappropriate words
- Think about what a room of 20 teenagers would actually shout out

## OUTPUT FORMAT
Return ONLY a JSON object (no other text):
{
  "scripture_verses": "string with the selected verses and reference",
  "historical_facts": [
    { "fact": "...", "source": "..." },
    { "fact": "...", "source": "..." },
    { "fact": "...", "source": "..." }
  ],
  "fun_facts": [
    { "fact": "..." },
    { "fact": "..." },
    { "fact": "..." }
  ],
  "core_question": "What one word ...?",
  "answers": [
    { "answer": "word1", "rank": 1 },
    { "answer": "word2", "rank": 2 },
    ...
    { "answer": "word200", "rank": 200 }
  ]
}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid credentials" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const body = await req.json();
    const { game_id } = body;

    if (!game_id) {
      return new Response(
        JSON.stringify({ error: "Missing game_id parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`🎮 Starting game generation for: ${game_id}`);

    // 1. Fetch the game + its devotional
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select(
        `
        *,
        devotionals!inner (
          id, title, scripture_reference, scripture_text,
          reflection, discussion_question
        )
      `,
      )
      .eq("id", game_id)
      .single();

    if (gameError || !game) {
      console.error("Game not found:", gameError);
      return new Response(
        JSON.stringify({ error: "Game not found", details: gameError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const devotional = game.devotionals;
    console.log(`📖 Devotional: ${devotional.title}`);

    // 2. Call Claude to generate game content
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const prompt = buildPrompt(devotional);
    console.log(`🤖 Calling Claude API for game generation...`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384, // 200 answers needs more tokens
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API Error:", JSON.stringify(errorData, null, 2));
      // Update game status to indicate failure
      await supabase
        .from("games")
        .update({ status: "ready" }) // 'ready' without content = needs retry
        .eq("id", game_id);
      throw new Error(
        `Claude API error: ${JSON.stringify(errorData.error || errorData)}`,
      );
    }

    const data = await response.json();
    const content = data.content[0].text;

    // 3. Parse the AI response
    let cleanText = content.trim();
    const codeBlockMatch = cleanText.match(
      /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/,
    );
    if (codeBlockMatch) {
      cleanText = codeBlockMatch[1].trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (parseError) {
      console.error(
        "Failed to parse AI response:",
        cleanText.substring(0, 500),
      );
      await supabase
        .from("games")
        .update({ status: "ready" })
        .eq("id", game_id);
      throw new Error("Failed to parse AI response as JSON");
    }

    // 4. Validate the response
    if (
      !parsed.core_question ||
      !parsed.scripture_verses ||
      !Array.isArray(parsed.answers) ||
      parsed.answers.length !== 200
    ) {
      console.error("Invalid AI response structure");
      await supabase
        .from("games")
        .update({ status: "ready" })
        .eq("id", game_id);
      throw new Error(
        `Invalid AI response: expected 200 answers, got ${parsed.answers?.length || 0}`,
      );
    }

    console.log(
      `✅ AI generated: "${parsed.core_question}" with ${parsed.answers.length} answers`,
    );

    // 5. Update the game with AI content
    const { error: updateError } = await supabase
      .from("games")
      .update({
        scripture_verses: parsed.scripture_verses,
        historical_facts: parsed.historical_facts || [],
        fun_facts: parsed.fun_facts || [],
        core_question: parsed.core_question,
        status: "ready",
        updated_at: new Date().toISOString(),
      })
      .eq("id", game_id);

    if (updateError) {
      console.error("Failed to update game:", updateError);
      throw new Error(`Failed to update game: ${updateError.message}`);
    }

    // 6. Insert the 200 answers
    const answerRecords = parsed.answers.map(
      (a: { answer: string; rank: number }) => ({
        game_id: game_id,
        answer: a.answer.trim().toLowerCase(),
        rank: a.rank,
      }),
    );

    const { error: answerError } = await supabase
      .from("game_answers")
      .insert(answerRecords);

    if (answerError) {
      console.error("Failed to insert answers:", answerError);
      throw new Error(`Failed to insert answers: ${answerError.message}`);
    }

    console.log(
      `🎉 Game generation complete! ${answerRecords.length} answers saved.`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        game_id: game_id,
        core_question: parsed.core_question,
        answers_created: answerRecords.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
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
