import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateRecommendationPrompt, parseAIResponse } from "@/utils/aiRecommendations";
import { StudentPastoralData } from "@/types/pastoral";
import { CurriculumWeek } from "@/types/curriculum";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, pastoralData, curriculum } = body as {
      studentId: string;
      pastoralData: StudentPastoralData;
      curriculum: CurriculumWeek;
    };

    if (!studentId || !pastoralData || !curriculum) {
      return NextResponse.json(
        { error: "Missing required fields: studentId, pastoralData, curriculum" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    // Generate the recommendation using Claude
    const prompt = generateRecommendationPrompt({
      student: pastoralData,
      studentProfile: null, // Extended profile is optional
      curriculum,
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        temperature: 0.7,
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
      console.error("Anthropic API error:", errorData);
      return NextResponse.json(
        { error: `AI generation failed: ${errorData.error?.message || response.statusText}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.content[0].text;
    const parsed = parseAIResponse(content);

    // Store in database
    const supabase = await createClient();

    const { data: recommendation, error: insertError } = await supabase
      .from("ai_recommendations")
      .insert({
        student_id: studentId,
        curriculum_week_id: curriculum.id,
        key_insight: parsed.key_insight,
        action_bullets: parsed.action_bullets,
        context_paragraph: parsed.context_paragraph,
        engagement_status: pastoralData.belonging_status,
        days_since_last_seen: pastoralData.days_since_last_seen,
        is_dismissed: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      // If it's a duplicate constraint error, fetch the existing one
      if (insertError.code === "23505") {
        const { data: existing } = await supabase
          .from("ai_recommendations")
          .select("*")
          .eq("student_id", studentId)
          .eq("curriculum_week_id", curriculum.id)
          .single();

        if (existing) {
          return NextResponse.json(existing);
        }
      }
      return NextResponse.json(
        { error: "Failed to store recommendation" },
        { status: 500 }
      );
    }

    return NextResponse.json(recommendation);
  } catch (error) {
    console.error("Recommendation generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
