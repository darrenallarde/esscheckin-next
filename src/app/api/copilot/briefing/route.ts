import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import {
  buildCopilotBriefingPrompt,
  parseCopilotBriefingResponse,
  generateFallbackBriefing,
  CopilotCandidate,
  CopilotBriefingResponse,
} from "@/utils/copilotPrompt";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId } = body as { organizationId: string };

    if (!organizationId) {
      return NextResponse.json(
        { error: "Missing required field: organizationId" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Call V2 RPC — get raw candidate data (up to 20)
    const { data: candidates, error: rpcError } = await supabase.rpc(
      "get_copilot_briefing_v2",
      { p_org_id: organizationId, p_limit: 20 },
    );

    if (rpcError) {
      console.error("Copilot V2 RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to fetch briefing data" },
        { status: 500 },
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        briefing_summary: "No students need attention right now.",
        students: [],
      } satisfies CopilotBriefingResponse);
    }

    const typedCandidates = candidates as CopilotCandidate[];

    // 2. Compute briefing hash for cache
    const allHashes = typedCandidates.map((c) => c.signals_hash).join("|");
    const today = new Date().toISOString().split("T")[0]; // date-scoped cache
    const briefingHash = createHash("md5")
      .update(`${organizationId}|${today}|${allHashes}`)
      .digest("hex");

    // 3. Check cache
    const { data: cached } = await supabase
      .from("copilot_drafts")
      .select("briefing_json")
      .eq("organization_id", organizationId)
      .eq("signals_hash", briefingHash)
      .not("briefing_json", "is", null)
      .limit(1)
      .maybeSingle();

    if (cached?.briefing_json) {
      return NextResponse.json(cached.briefing_json as CopilotBriefingResponse);
    }

    // 4. Build prompt and call Claude
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("No ANTHROPIC_API_KEY — using fallback briefing");
      const fallback = generateFallbackBriefing(typedCandidates);
      return NextResponse.json(fallback);
    }

    // Fetch org name and curriculum context in parallel
    const [orgResult, curriculumResult] = await Promise.all([
      supabase
        .from("organizations")
        .select("name")
        .eq("id", organizationId)
        .single(),
      supabase
        .from("curriculum_weeks")
        .select("topic_title, main_scripture, application_challenge, big_idea")
        .eq("organization_id", organizationId)
        .eq("is_current", true)
        .limit(1)
        .maybeSingle(),
    ]);

    const orgName = orgResult.data?.name || "Youth Ministry";
    const curriculum = curriculumResult.data || null;

    const prompt = buildCopilotBriefingPrompt(
      typedCandidates,
      { orgName, totalStudents: typedCandidates.length },
      curriculum,
    );

    let briefing: CopilotBriefingResponse;
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2048,
          temperature: 0.6,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Claude API error:", errText);
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.content[0]?.text;
      if (!responseText) throw new Error("Empty Claude response");

      const validIds = new Set(typedCandidates.map((c) => c.profile_id));
      briefing = parseCopilotBriefingResponse(responseText, validIds);

      // Enrich the AI response with student data the frontend needs
      briefing.students = briefing.students.map((s) => {
        const candidate = typedCandidates.find(
          (c) => c.profile_id === s.profile_id,
        );
        if (candidate) {
          return {
            ...s,
            // These are passed through for the frontend
            first_name: candidate.first_name,
            last_name: candidate.last_name,
            phone_number: candidate.phone_number,
            email: candidate.email,
            grade: candidate.grade,
            gender: candidate.gender,
            belonging_status: candidate.belonging_status,
            days_since_last_seen: candidate.days_since_last_seen,
            total_checkins_8weeks: candidate.total_checkins_8weeks,
            is_declining: candidate.is_declining,
            primary_parent_name: candidate.primary_parent_name,
            primary_parent_phone: candidate.primary_parent_phone,
            group_names: candidate.group_names,
          } as typeof s & Record<string, unknown>;
        }
        return s;
      });
    } catch (aiError) {
      console.error("AI generation failed, using fallback:", aiError);
      briefing = generateFallbackBriefing(typedCandidates);
    }

    // 5. Cache the result
    try {
      await supabase.from("copilot_drafts").upsert(
        {
          profile_id: typedCandidates[0].profile_id, // placeholder — keyed by signals_hash
          organization_id: organizationId,
          signals_hash: briefingHash,
          briefing_json: briefing,
          model_used: "claude-sonnet-4-20250514",
          generated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,organization_id" },
      );
    } catch (cacheError) {
      // Non-fatal — briefing still works without caching
      console.error("Failed to cache briefing:", cacheError);
    }

    return NextResponse.json(briefing);
  } catch (error) {
    console.error("Copilot briefing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
