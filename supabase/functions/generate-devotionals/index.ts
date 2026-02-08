// Supabase Edge Function to generate AI-powered devotionals from sermon content
// Called after a devotional_series is created

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface DevotionalSeries {
  id: string;
  organization_id: string;
  sermon_title: string | null;
  sermon_content: string;
  frequency: "1x_week" | "3x_week" | "daily";
  time_slots: ("morning" | "afternoon" | "evening")[];
  start_date: string;
  status: string;
}

interface GeneratedDevotional {
  title: string;
  scripture_reference: string;
  scripture_text: string;
  reflection: string;
  prayer_prompt: string;
  discussion_question: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Get the number of days based on frequency
function getDaysForFrequency(frequency: string): number {
  switch (frequency) {
    case "1x_week":
      return 1;
    case "3x_week":
      return 3;
    case "daily":
      return 7;
    default:
      return 7;
  }
}

// Generate dates for the devotional series
function generateDates(startDate: string, numDays: number): string[] {
  const dates: string[] = [];
  const start = new Date(startDate + "T00:00:00");

  for (let i = 0; i < numDays; i++) {
    const date = new Date(start);
    date.setDate(date.getDate() + i);
    dates.push(date.toISOString().split("T")[0]);
  }

  return dates;
}

// Build the AI prompt for generating devotionals
function buildPrompt(
  series: DevotionalSeries,
  dates: string[],
  timeSlots: string[],
): string {
  const devotionalSlots: string[] = [];

  dates.forEach((date, dayIndex) => {
    timeSlots.forEach((slot) => {
      devotionalSlots.push(
        `Day ${dayIndex + 1}, ${date}, ${slot.charAt(0).toUpperCase() + slot.slice(1)}`,
      );
    });
  });

  return `You are creating devotional content for youth ministry students (grades 6-12) based on this sermon.

## SERMON CONTENT
${series.sermon_title ? `Title: ${series.sermon_title}` : ""}
${series.sermon_content}

## TASK
Generate ${devotionalSlots.length} unique devotionals, one for each of these time slots:
${devotionalSlots.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## GUIDELINES FOR EACH DEVOTIONAL
1. **Title**: 3-7 words, engaging and theme-related
2. **Scripture**: Pick a relevant passage (1-3 verses) that connects to the sermon theme
3. **Reflection**: 150-200 words, written for teens:
   - Relatable language (not preachy)
   - Connect scripture to their daily life
   - ${timeSlots.includes("morning") ? "Morning: Focus on starting the day with intention" : ""}
   - ${timeSlots.includes("afternoon") ? "Afternoon: Focus on midday reset and perspective" : ""}
   - ${timeSlots.includes("evening") ? "Evening: Focus on reflection and rest" : ""}
4. **Prayer Prompt**: 1-2 sentences to help them start praying
5. **Discussion Question**: One question for small group use

## IMPORTANT
- Each devotional should explore a DIFFERENT aspect of the sermon
- Vary the scripture passages (don't repeat the same one)
- Make each time slot feel distinct (morning = fresh start, afternoon = reset, evening = reflection)
- Keep language appropriate for 11-18 year olds

## OUTPUT FORMAT
Return a JSON array with exactly ${devotionalSlots.length} objects:
[
  {
    "day_number": 1,
    "time_slot": "morning",
    "title": "Starting Fresh",
    "scripture_reference": "Lamentations 3:22-23",
    "scripture_text": "The steadfast love of the Lord never ceases; his mercies never come to an end; they are new every morning; great is your faithfulness.",
    "reflection": "...",
    "prayer_prompt": "...",
    "discussion_question": "..."
  },
  ...
]`;
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Verify the user is authenticated
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

    // Parse request body
    const body = await req.json();
    const { series_id } = body;

    if (!series_id) {
      return new Response(
        JSON.stringify({ error: "Missing series_id parameter" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`🙏 Starting devotional generation for series: ${series_id}`);

    // 1. Fetch the series
    const { data: series, error: seriesError } = await supabase
      .from("devotional_series")
      .select("*")
      .eq("id", series_id)
      .single();

    if (seriesError || !series) {
      console.error("❌ Series not found:", seriesError);
      return new Response(
        JSON.stringify({ error: "Series not found", details: seriesError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`✅ Found series: ${series.sermon_title || "Untitled"}`);

    // 2. Calculate dates and slots
    const numDays = getDaysForFrequency(series.frequency);
    const dates = generateDates(series.start_date, numDays);
    const timeSlots = series.time_slots as string[];
    const totalDevotionals = dates.length * timeSlots.length;

    console.log(
      `📅 Generating ${totalDevotionals} devotionals (${numDays} days × ${timeSlots.length} slots)`,
    );

    // 3. Generate devotionals using Claude
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const prompt = buildPrompt(series as DevotionalSeries, dates, timeSlots);

    console.log(`🤖 Calling Claude API...`);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("❌ Claude API Error:", JSON.stringify(errorData, null, 2));
      throw new Error(
        `Claude API error: ${JSON.stringify(errorData.error || errorData)}`,
      );
    }

    const data = await response.json();
    const content = data.content[0].text;

    // Parse JSON response
    let cleanText = content.trim();
    if (cleanText.startsWith("```json")) {
      cleanText = cleanText.replace(/```json\n?/, "").replace(/\n?```$/, "");
    } else if (cleanText.startsWith("```")) {
      cleanText = cleanText.replace(/```\n?/, "").replace(/\n?```$/, "");
    }

    const generatedDevotionals = JSON.parse(cleanText) as GeneratedDevotional[];

    console.log(
      `✅ Claude generated ${generatedDevotionals.length} devotionals`,
    );

    // 4. Validate and map to database format
    const devotionalRecords = generatedDevotionals.map((d, index) => {
      // Calculate the date and slot for this index
      const slotsPerDay = timeSlots.length;
      const dayIndex = Math.floor(index / slotsPerDay);
      const slotIndex = index % slotsPerDay;

      return {
        series_id: series_id,
        day_number: dayIndex + 1,
        scheduled_date: dates[dayIndex],
        time_slot: timeSlots[slotIndex],
        title: d.title,
        scripture_reference: d.scripture_reference,
        scripture_text: d.scripture_text,
        reflection: d.reflection,
        prayer_prompt: d.prayer_prompt,
        discussion_question: d.discussion_question,
      };
    });

    // 5. Insert devotionals into database
    console.log(`💾 Inserting ${devotionalRecords.length} devotionals...`);

    const { error: insertError } = await supabase
      .from("devotionals")
      .insert(devotionalRecords);

    if (insertError) {
      console.error("❌ Insert error:", insertError);
      throw new Error(`Failed to save devotionals: ${insertError.message}`);
    }

    // 6. Update series status to 'ready'
    const { error: updateError } = await supabase
      .from("devotional_series")
      .update({ status: "ready" })
      .eq("id", series_id);

    if (updateError) {
      console.error("❌ Status update error:", updateError);
      // Don't throw - devotionals were saved successfully
    }

    // 7. Auto-generate series title if none was provided
    if (!series.sermon_title) {
      try {
        console.log("📝 Auto-generating series title...");
        const excerpt = series.sermon_content.slice(0, 500);
        const titleResponse = await fetch(
          "https://api.anthropic.com/v1/messages",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-haiku-4-5-20251001",
              max_tokens: 30,
              messages: [
                {
                  role: "user",
                  content: `Given this sermon excerpt, generate a 3-6 word series title for a youth devotional. Return ONLY the title text, no quotes or punctuation.\n\n${excerpt}`,
                },
              ],
            }),
          },
        );

        if (titleResponse.ok) {
          const titleData = await titleResponse.json();
          const generatedTitle = titleData.content[0].text.trim();
          console.log(`✅ Auto-generated title: "${generatedTitle}"`);

          await supabase
            .from("devotional_series")
            .update({ sermon_title: generatedTitle })
            .eq("id", series_id);
        }
      } catch (titleError) {
        console.error(
          "⚠️ Title auto-generation failed (non-fatal):",
          titleError,
        );
        // Silently continue — no worse than today
      }
    }

    console.log(
      `🎉 Generation complete! ${devotionalRecords.length} devotionals saved.`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${devotionalRecords.length} devotionals`,
        series_id: series_id,
        devotionals_created: devotionalRecords.length,
        dates: dates,
        time_slots: timeSlots,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Fatal error:", error);
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
