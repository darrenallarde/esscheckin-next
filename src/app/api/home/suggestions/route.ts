/**
 * AI Home Suggestions API Route
 *
 * Gathers context about the ministry state and uses Claude Haiku
 * to generate personalized, actionable suggestions for ministry leaders.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

interface SuggestionsRequest {
  organizationId: string;
}

interface Suggestion {
  icon: string;
  title: string;
  description: string;
  actionType: "navigate" | "broadcast" | "modal";
  actionPath?: string;
  priority: "high" | "medium" | "low";
}

interface SuggestionsResponse {
  success: boolean;
  suggestions?: Suggestion[];
  error?: string;
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<SuggestionsResponse>> {
  try {
    const body = (await request.json()) as SuggestionsRequest;
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: "Organization ID required" },
        { status: 400 }
      );
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return fallback suggestions if no API key
      return NextResponse.json({
        success: true,
        suggestions: getFallbackSuggestions(),
      });
    }

    const supabase = await createClient();

    // Gather context data in parallel
    const [
      miaStudentsResult,
      newStudentsResult,
      pastoralQueueResult,
      unreadMessagesResult,
      belongingResult,
    ] = await Promise.all([
      // Students missing 14+ days
      supabase
        .from("organization_memberships")
        .select(
          `
          profile_id,
          profiles!inner(first_name, last_name)
        `
        )
        .eq("organization_id", organizationId)
        .eq("role", "student")
        .eq("status", "active"),

      // Students needing triage
      supabase
        .from("organization_memberships")
        .select("profile_id")
        .eq("organization_id", organizationId)
        .eq("role", "student")
        .eq("needs_triage", true),

      // Pastoral queue items
      supabase
        .from("ai_recommendations")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("status", "pending"),

      // Unread messages count
      supabase
        .from("sms_messages")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("direction", "inbound")
        .is("read_at", null),

      // Get belonging distribution
      supabase.rpc("get_belonging_distribution", {
        p_org_id: organizationId,
      }),
    ]);

    // Calculate MIA students (14+ days) - simplified check
    // In production, you'd want to join with check_ins to get actual last check-in dates
    const miaCount = 0; // Placeholder - would need more complex query
    const newStudentCount = newStudentsResult.data?.length || 0;
    const pastoralQueueCount = pastoralQueueResult.data?.length || 0;
    const unreadMessageCount = unreadMessagesResult.data?.length || 0;

    // Build context for Claude
    const dayOfWeek = new Date().toLocaleDateString("en-US", {
      weekday: "long",
    });

    const contextPrompt = `You are an AI assistant for a youth ministry leader. Based on the following data about their ministry, suggest 3-4 specific, actionable next steps they should take right now.

Current ministry state:
- ${newStudentCount} new students need welcome/triage
- ${pastoralQueueCount} items in pastoral care queue
- ${unreadMessageCount} unread messages
- Today is ${dayOfWeek}

Return a JSON array of suggestions with this exact structure:
[{
  "icon": "phone" | "wave" | "heart" | "book" | "chart" | "message" | "users",
  "title": "Short action title (max 50 chars)",
  "description": "Brief context with names if relevant (max 100 chars)",
  "actionType": "navigate",
  "actionPath": "/path/to/page",
  "priority": "high" | "medium" | "low"
}]

Guidelines:
- Focus on the most impactful actions first
- Use "high" priority for urgent items (new students, unread messages)
- Use "medium" for regular tasks (pastoral queue)
- Use "low" for proactive/optional items
- Action paths should be: /people, /pastoral, /messages, /analytics, /curriculum, /groups
- Be specific and actionable in titles
- Keep descriptions concise

Return ONLY the JSON array, no other text.`;

    const anthropic = new Anthropic();

    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 500,
      messages: [{ role: "user", content: contextPrompt }],
    });

    // Parse the response
    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response format");
    }

    let suggestions: Suggestion[];
    try {
      // Extract JSON from the response (handle potential markdown code blocks)
      let jsonText = content.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "");
      }
      suggestions = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content.text);
      suggestions = getFallbackSuggestions();
    }

    // Validate and limit suggestions
    suggestions = suggestions
      .filter(
        (s) =>
          s.icon &&
          s.title &&
          s.description &&
          s.actionType &&
          s.priority
      )
      .slice(0, 4);

    return NextResponse.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Home suggestions error:", error);

    // Return fallback suggestions on error
    return NextResponse.json({
      success: true,
      suggestions: getFallbackSuggestions(),
    });
  }
}

/**
 * Fallback suggestions when AI is unavailable
 */
function getFallbackSuggestions(): Suggestion[] {
  return [
    {
      icon: "users",
      title: "Review new students",
      description: "Welcome and triage recent check-ins",
      actionType: "navigate",
      actionPath: "/people?filter=new",
      priority: "high",
    },
    {
      icon: "heart",
      title: "Check pastoral queue",
      description: "Students who may need follow-up",
      actionType: "navigate",
      actionPath: "/pastoral",
      priority: "medium",
    },
    {
      icon: "message",
      title: "Reply to messages",
      description: "Stay connected with your students",
      actionType: "navigate",
      actionPath: "/messages",
      priority: "medium",
    },
  ];
}
