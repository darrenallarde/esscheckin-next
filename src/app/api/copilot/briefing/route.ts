import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import {
  buildCopilotBriefingPromptV3,
  parseCopilotBriefingResponseV3,
  generateFallbackBriefingV3,
  CopilotCandidateV3,
  CopilotBriefingResponseV3,
} from "@/utils/copilotPromptV3";

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

    // 1. Call V3 RPC — get signal candidates + healthy roster
    const { data: candidates, error: rpcError } = await supabase.rpc(
      "get_copilot_briefing_v3",
      { p_org_id: organizationId, p_signal_limit: 30, p_healthy_limit: 50 },
    );

    if (rpcError) {
      console.error("Copilot V3 RPC error:", rpcError);
      return NextResponse.json(
        { error: "Failed to fetch briefing data" },
        { status: 500 },
      );
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({
        briefing_summary: "No students need attention right now.",
        students: [],
        ministry_insights: {
          teaching_recommendation: "",
          growth_opportunities: [],
          strategic_assessment: "",
        },
      } satisfies CopilotBriefingResponseV3);
    }

    const typedCandidates = candidates as CopilotCandidateV3[];

    // 2. Compute briefing hash for cache (include ministry_priorities in hash)
    const allHashes = typedCandidates.map((c) => c.signals_hash).join("|");
    const today = new Date().toISOString().split("T")[0]; // date-scoped cache

    // 3. Fetch org data (name + ministry_priorities) in parallel with cache check
    const orgResult = await supabase
      .from("organizations")
      .select("name, ministry_priorities")
      .eq("id", organizationId)
      .single();

    const orgName = orgResult.data?.name || "Youth Ministry";
    const ministryPriorities =
      (orgResult.data?.ministry_priorities as string) || null;

    const briefingHash = createHash("md5")
      .update(
        `${organizationId}|${today}|${allHashes}|${ministryPriorities || ""}`,
      )
      .digest("hex");

    // 4. Check cache
    const { data: cached } = await supabase
      .from("copilot_drafts")
      .select("briefing_json")
      .eq("organization_id", organizationId)
      .eq("signals_hash", briefingHash)
      .not("briefing_json", "is", null)
      .limit(1)
      .maybeSingle();

    if (cached?.briefing_json) {
      return NextResponse.json(
        cached.briefing_json as CopilotBriefingResponseV3,
      );
    }

    // 5. Build prompt and call Claude
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("No ANTHROPIC_API_KEY — using fallback briefing");
      const fallback = generateFallbackBriefingV3(typedCandidates);
      return NextResponse.json(enrichBriefing(fallback, typedCandidates));
    }

    // Fetch curriculum context
    const curriculumResult = await supabase
      .from("curriculum_weeks")
      .select("topic_title, main_scripture, application_challenge, big_idea")
      .eq("organization_id", organizationId)
      .eq("is_current", true)
      .limit(1)
      .maybeSingle();

    const curriculum = curriculumResult.data || null;

    const prompt = buildCopilotBriefingPromptV3(
      typedCandidates,
      { orgName, totalStudents: typedCandidates.length },
      curriculum,
      ministryPriorities,
    );

    let briefing: CopilotBriefingResponseV3;
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
          max_tokens: 4096,
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
      briefing = parseCopilotBriefingResponseV3(responseText, validIds);
      briefing = enrichBriefing(briefing, typedCandidates);
    } catch (aiError) {
      console.error("AI generation failed, using fallback:", aiError);
      briefing = enrichBriefing(
        generateFallbackBriefingV3(typedCandidates),
        typedCandidates,
      );
    }

    // 6. Cache the result
    try {
      await supabase.from("copilot_drafts").upsert(
        {
          profile_id: typedCandidates[0].profile_id,
          organization_id: organizationId,
          signals_hash: briefingHash,
          briefing_json: briefing,
          model_used: "claude-sonnet-4-20250514",
          generated_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,organization_id" },
      );
    } catch (cacheError) {
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

/** Enrich AI response with student data the frontend needs */
function enrichBriefing(
  briefing: CopilotBriefingResponseV3,
  candidates: CopilotCandidateV3[],
): CopilotBriefingResponseV3 {
  return {
    ...briefing,
    students: briefing.students.map((s) => {
      const candidate = candidates.find((c) => c.profile_id === s.profile_id);
      if (candidate) {
        return {
          ...s,
          first_name: candidate.first_name,
          last_name: candidate.last_name,
          phone_number: candidate.phone_number,
          email: candidate.email,
          grade: candidate.grade,
          gender: candidate.gender,
          belonging_status: candidate.belonging_status,
          days_since_last_seen: candidate.days_since_last_seen,
          last_seen_at: candidate.last_seen_at,
          total_checkins_8weeks: candidate.total_checkins_8weeks,
          is_declining: candidate.is_declining,
          primary_parent_name: candidate.primary_parent_name,
          primary_parent_phone: candidate.primary_parent_phone,
          group_names: candidate.group_names,
        } as typeof s & Record<string, unknown>;
      }
      return s;
    }),
  };
}
