/**
 * Insights Debug Endpoint
 *
 * Bypasses the LLM and runs a known-good query directly against the RPC.
 * Use this to diagnose "0 results" issues by checking the raw response shape.
 *
 * GET /api/insights/debug?orgId=xxx
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json({ error: "orgId query param required" }, { status: 400 });
  }

  const supabase = await createClient();

  // 1. Check auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized", authError: authError?.message }, { status: 401 });
  }

  // 2. Run a known-good query via RPC
  const testSql = "SELECT profile_id, organization_id, first_name, last_name FROM insights_people WHERE status = 'active' AND role IN ('student', 'leader')";

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "run_insights_query",
    { p_org_id: orgId, p_sql: testSql }
  );

  // 3. Also run a direct count to compare
  const { data: countData, error: countError } = await supabase
    .from("organization_memberships")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .in("role", ["student", "leader"])
    .eq("status", "active");

  // 4. Return detailed diagnostic info
  return NextResponse.json({
    auth: { userId: user.id, email: user.email },
    rpc: {
      error: rpcError?.message || null,
      rawType: typeof rpcData,
      isNull: rpcData === null,
      isArray: Array.isArray(rpcData),
      length: Array.isArray(rpcData) ? rpcData.length : "N/A",
      // Check if nested array (PostgREST wrapper)
      firstElementIsArray: Array.isArray(rpcData) && rpcData.length > 0 ? Array.isArray(rpcData[0]) : false,
      preview: JSON.stringify(rpcData).slice(0, 500),
    },
    directCount: {
      error: countError?.message || null,
      count: countData,
    },
    sql: testSql,
    orgId,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
}
