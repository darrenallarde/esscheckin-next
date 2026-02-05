/**
 * ChMS Write-Back Edge Function
 *
 * Pushes SheepDoggo activity data back to the connected ChMS.
 * Runs on a schedule (every 15 minutes) or manually triggered.
 *
 * Write-back data per provider:
 * - Rock RMS: Person Attributes (SheepDoggoLastCheckIn, etc.) + Interactions API
 * - Planning Center: Custom FieldData on a "SheepDoggo" tab
 * - CCB: udf_text_1 through udf_text_6 (limited to 12 total custom fields)
 *
 * Request body:
 * {
 *   organization_id?: string,  // Specific org (manual) or omit for all (scheduled)
 * }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const specificOrgId = body.organization_id;

    // Get active connections that need write-back
    let query = supabase
      .from("chms_connections")
      .select("organization_id, provider, base_url, credentials, sync_config")
      .eq("is_active", true);

    if (specificOrgId) {
      query = query.eq("organization_id", specificOrgId);
    }

    const { data: connections, error: connError } = await query;
    if (connError) throw connError;
    if (!connections || connections.length === 0) {
      return jsonResponse({ success: true, message: "No active connections" });
    }

    const results: Array<{
      org: string;
      provider: string;
      succeeded: number;
      failed: number;
    }> = [];

    for (const conn of connections) {
      try {
        const result = await writeBackForOrg(
          supabase,
          conn.organization_id,
          conn
        );
        results.push({
          org: conn.organization_id,
          provider: conn.provider,
          ...result,
        });
      } catch (err) {
        console.error(
          `Write-back failed for org ${conn.organization_id}:`,
          err
        );
        results.push({
          org: conn.organization_id,
          provider: conn.provider,
          succeeded: 0,
          failed: -1,
        });
      }
    }

    return jsonResponse({ success: true, results });
  } catch (error) {
    console.error("chms-write-back error:", error);
    return jsonResponse({ success: false, error: error.message }, 400);
  }
});

interface ConnectionRow {
  organization_id: string;
  provider: string;
  base_url: string | null;
  credentials: Record<string, unknown>;
  sync_config: Record<string, unknown>;
}

async function writeBackForOrg(
  supabase: ReturnType<typeof createClient>,
  orgId: string,
  conn: ConnectionRow
): Promise<{ succeeded: number; failed: number }> {
  // Get all linked profiles for this org
  const { data: links } = await supabase
    .from("chms_profile_links")
    .select("profile_id, external_person_id, external_alias_id, last_write_back_at")
    .eq("organization_id", orgId)
    .eq("link_status", "linked");

  if (!links || links.length === 0) return { succeeded: 0, failed: 0 };

  // For each linked profile, gather activity data
  const activities: Array<{
    externalPersonId: string;
    externalAliasId?: string;
    profileId: string;
    lastCheckIn?: string;
    lastText?: string;
    belongingStatus?: string;
    totalPoints?: number;
    totalCheckIns?: number;
  }> = [];

  for (const link of links) {
    // Get latest check-in
    const { data: checkIn } = await supabase
      .from("check_ins")
      .select("created_at")
      .eq("profile_id", link.profile_id)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get latest SMS
    const { data: sms } = await supabase
      .from("sms_messages")
      .select("created_at")
      .eq("profile_id", link.profile_id)
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get game stats (points, total check-ins)
    const { data: gameStats } = await supabase
      .from("student_game_stats")
      .select("total_points, total_check_ins")
      .eq("profile_id", link.profile_id)
      .eq("organization_id", orgId)
      .maybeSingle();

    // Only write back if there's something new since last write-back
    const lastWriteBack = link.last_write_back_at
      ? new Date(link.last_write_back_at)
      : new Date(0);

    const checkInDate = checkIn?.created_at
      ? new Date(checkIn.created_at)
      : null;
    const smsDate = sms?.created_at ? new Date(sms.created_at) : null;

    const hasNewActivity =
      (checkInDate && checkInDate > lastWriteBack) ||
      (smsDate && smsDate > lastWriteBack);

    if (!hasNewActivity && link.last_write_back_at) continue;

    activities.push({
      externalPersonId: link.external_person_id,
      externalAliasId: link.external_alias_id || undefined,
      profileId: link.profile_id,
      lastCheckIn: checkIn?.created_at
        ? new Date(checkIn.created_at).toISOString().split("T")[0]
        : undefined,
      lastText: sms?.created_at
        ? new Date(sms.created_at).toISOString().split("T")[0]
        : undefined,
      totalPoints: gameStats?.total_points || undefined,
      totalCheckIns: gameStats?.total_check_ins || undefined,
    });
  }

  if (activities.length === 0) return { succeeded: 0, failed: 0 };

  // Write to ChMS based on provider
  let succeeded = 0;
  let failed = 0;

  switch (conn.provider) {
    case "rock":
      ({ succeeded, failed } = await writeBackRock(conn, activities));
      break;
    case "planning_center":
      ({ succeeded, failed } = await writeBackPco(conn, activities));
      break;
    case "ccb":
      ({ succeeded, failed } = await writeBackCcb(conn, activities));
      break;
  }

  // Update last_write_back_at for succeeded profiles
  if (succeeded > 0) {
    const succeededIds = activities
      .slice(0, succeeded)
      .map((a) => a.profileId);
    await supabase
      .from("chms_profile_links")
      .update({ last_write_back_at: new Date().toISOString() })
      .eq("organization_id", orgId)
      .in("profile_id", succeededIds);
  }

  // Log the write-back
  await supabase.from("chms_sync_log").insert({
    organization_id: orgId,
    sync_type: "write_back",
    provider: conn.provider,
    records_processed: activities.length,
    records_updated: succeeded,
    records_failed: failed,
    trigger_method: "auto",
    completed_at: new Date().toISOString(),
  });

  return { succeeded, failed };
}

// =============================================================================
// Provider-specific write-back implementations
// =============================================================================

interface ActivityData {
  externalPersonId: string;
  externalAliasId?: string;
  profileId: string;
  lastCheckIn?: string;
  lastText?: string;
  belongingStatus?: string;
  totalPoints?: number;
  totalCheckIns?: number;
}

async function writeBackRock(
  conn: ConnectionRow,
  activities: ActivityData[]
): Promise<{ succeeded: number; failed: number }> {
  const baseUrl = (conn.base_url || "").replace(/\/+$/, "");
  const apiKey = (conn.credentials as { api_key?: string }).api_key || "";
  const headers = {
    "Authorization-Token": apiKey,
    "Content-Type": "application/json",
  };
  const attrPrefix =
    (conn.sync_config as { rockPersonAttributeKey?: string })
      .rockPersonAttributeKey || "SheepDoggo";

  let succeeded = 0;
  let failed = 0;

  for (const activity of activities) {
    try {
      const personId = activity.externalPersonId;

      // Write attributes
      const attrs: Array<[string, string]> = [];
      if (activity.lastCheckIn)
        attrs.push([`${attrPrefix}LastCheckIn`, activity.lastCheckIn]);
      if (activity.lastText)
        attrs.push([`${attrPrefix}LastText`, activity.lastText]);
      if (activity.belongingStatus)
        attrs.push([`${attrPrefix}Belonging`, activity.belongingStatus]);
      if (activity.totalPoints !== undefined)
        attrs.push([`${attrPrefix}Points`, String(activity.totalPoints)]);
      if (activity.totalCheckIns !== undefined)
        attrs.push([`${attrPrefix}CheckIns`, String(activity.totalCheckIns)]);

      for (const [key, value] of attrs) {
        await fetch(`${baseUrl}/api/People/AttributeValue/${personId}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ Key: key, Value: value }),
        });
      }

      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
}

async function writeBackPco(
  conn: ConnectionRow,
  activities: ActivityData[]
): Promise<{ succeeded: number; failed: number }> {
  const creds = conn.credentials as { app_id?: string; secret?: string };
  const authHeader = "Basic " + btoa(`${creds.app_id}:${creds.secret}`);
  const headers = {
    Authorization: authHeader,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  let succeeded = 0;
  let failed = 0;

  for (const activity of activities) {
    try {
      // PCO: write to custom field_data
      // This requires pre-created field definitions on a "SheepDoggo" tab
      // For now, we just update the remote_id and note fields
      const personId = activity.externalPersonId;

      // Update person note with summary
      const notes: string[] = [];
      if (activity.lastCheckIn) notes.push(`Last Check-in: ${activity.lastCheckIn}`);
      if (activity.lastText) notes.push(`Last Text: ${activity.lastText}`);
      if (activity.totalPoints) notes.push(`Points: ${activity.totalPoints}`);
      if (activity.totalCheckIns) notes.push(`Check-ins: ${activity.totalCheckIns}`);

      if (notes.length > 0) {
        // Use notes endpoint as a lightweight write-back
        await fetch(
          `https://api.planningcenteronline.com/people/v2/people/${personId}/notes`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({
              data: {
                type: "Note",
                attributes: {
                  note: `SheepDoggo Activity Update:\n${notes.join("\n")}`,
                },
              },
            }),
          }
        );
      }

      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
}

async function writeBackCcb(
  conn: ConnectionRow,
  activities: ActivityData[]
): Promise<{ succeeded: number; failed: number }> {
  let baseUrl = (conn.base_url || "").replace(/\/+$/, "");
  if (!baseUrl.startsWith("http")) baseUrl = `https://${baseUrl}`;
  const creds = conn.credentials as { username?: string; password?: string };
  const authHeader = "Basic " + btoa(`${creds.username}:${creds.password}`);

  let succeeded = 0;
  let failed = 0;

  // CCB UDF mapping:
  // udf_text_1 = LastCheckIn, udf_text_2 = LastText
  // udf_text_3 = Belonging, udf_text_4 = Points, udf_text_5 = CheckIns

  for (const activity of activities) {
    try {
      let params = `&individual_id=${activity.externalPersonId}`;
      if (activity.lastCheckIn)
        params += `&udf_text_1=${encodeURIComponent(activity.lastCheckIn)}`;
      if (activity.lastText)
        params += `&udf_text_2=${encodeURIComponent(activity.lastText)}`;
      if (activity.belongingStatus)
        params += `&udf_text_3=${encodeURIComponent(activity.belongingStatus)}`;
      if (activity.totalPoints !== undefined)
        params += `&udf_text_4=${encodeURIComponent(String(activity.totalPoints))}`;
      if (activity.totalCheckIns !== undefined)
        params += `&udf_text_5=${encodeURIComponent(String(activity.totalCheckIns))}`;

      const res = await fetch(
        `${baseUrl}/api.php?srv=update_individual${params}`,
        {
          headers: { Authorization: authHeader, Accept: "text/xml" },
        }
      );

      if (!res.ok) throw new Error(`CCB update failed: ${res.status}`);
      succeeded++;
    } catch {
      failed++;
    }
  }

  return { succeeded, failed };
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
