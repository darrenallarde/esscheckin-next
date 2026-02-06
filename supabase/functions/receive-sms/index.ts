import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ============================================
// SMS UX: Natural texting — feels like talking to a real person
// ============================================
// - Known phones auto-connect silently
// - Broadcast/DM replies route silently (no footer)
// - Active sessions route silently
// - Only speak when connecting or on commands

const NPC_RESPONSES = {
  // Unknown phone, no match — prompt for code
  welcome: () =>
    `Hey there! Text the code your leader gave you to get connected. Not sure? Just ask them!`,

  // First connection via org code
  connected: (orgName: string) =>
    `Connected to ${orgName}! Your messages go right to the team.`,

  // Auto-connect: known phone, 1 org
  autoConnected: (firstName: string, orgName: string) =>
    `Hey ${firstName}! Connected to ${orgName}. Your messages go right to the team.`,

  // Auto-connect: known phone, multiple orgs
  multiOrg: (firstName: string, orgs: { orgName: string }[]) => {
    const list = orgs.map((o, i) => `${i + 1}. ${o.orgName}`).join('\n');
    return `Hey ${firstName}! Which ministry? Reply:\n${list}`;
  },

  // HELP command (connected)
  helpConnected: (orgName: string) =>
    `You're connected to ${orgName}.\n` +
    `HELP — this menu\n` +
    `EXIT — disconnect\n` +
    `SWITCH [code] — change ministry`,

  // HELP command (not connected)
  helpNotConnected: () =>
    `You're not connected to a ministry yet.\n` +
    `Text the code your leader gave you to get started!\n` +
    `HELP — this menu`,

  // EXIT
  disconnected: () =>
    `Disconnected! Text a code to reconnect anytime.`,

  // SWITCH confirmed
  switched: (orgName: string) =>
    `Switched to ${orgName}!`,

  // Confirm switch while connected
  confirmSwitch: (orgName: string) =>
    `Switch to ${orgName}? Reply YES to confirm, or continue your message.`,

  // Invalid code
  invalidCode: () =>
    `Hmm, didn't recognize that code. Double-check with your leader and try again!`,

  // Error
  error: `Something went wrong. Please try again.`,
};

// Normalize phone number to just digits
function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

// Get last 10 digits for matching
function phoneMatch(phone: string): string {
  const digits = normalizePhone(phone);
  return digits.slice(-10);
}

// Send TwiML response
function twimlResponse(message: string | null): Response {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new Response(body, { headers: { "Content-Type": "text/xml" } });
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Parse Twilio webhook
    const formData = await req.formData();
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = (formData.get("Body") as string || "").trim();
    const messageSid = formData.get("MessageSid") as string;

    console.log("Received SMS:", { from, to, bodyPreview: body?.substring(0, 50), messageSid });

    // Structured analytics log
    console.log("SMS_EVENT", JSON.stringify({
      event: "SMS_RECEIVED",
      phone_last4: from ? from.slice(-4) : null,
      body_length: body?.length || 0,
      timestamp: new Date().toISOString(),
    }));

    if (!from || !body) {
      console.error("Missing required fields from Twilio webhook");
      return twimlResponse(null);
    }

    const upperBody = body.toUpperCase().trim();

    // ============================================
    // ROUTING PIPELINE
    // ============================================

    // Get current session for context
    const currentSession = await getActiveSession(supabase, from);
    const currentOrgName = currentSession ? await getOrgName(supabase, currentSession.organization_id) : null;

    // STEP 0: Check for pending_org selection (multi-org choice)
    if (currentSession?.status === "pending_org" && currentSession.pending_org_list) {
      const num = parseInt(body.trim(), 10);
      const orgList = currentSession.pending_org_list as { orgId: string; orgName: string }[];

      if (!isNaN(num) && num >= 1 && num <= orgList.length) {
        const selected = orgList[num - 1];
        // Connect to selected org
        await createSession(supabase, from, selected.orgId, null, "active");

        // Find profile to store with message
        const student = await findStudentByPhone(supabase, from);
        await storeMessage(supabase, {
          from, to, body, messageSid,
          studentId: student?.id || null,
          organizationId: selected.orgId,
          groupId: null,
          direction: "inbound",
          isLobbyMessage: false,
        });

        console.log("SMS_EVENT", JSON.stringify({
          event: "SMS_MULTI_ORG_SELECTED",
          org_id: selected.orgId,
          org_name: selected.orgName,
          phone_last4: from.slice(-4),
          timestamp: new Date().toISOString(),
        }));

        return twimlResponse(NPC_RESPONSES.connected(selected.orgName));
      }
      // Invalid selection — re-prompt
      const firstName = currentSession.pending_org_list_name || "there";
      return twimlResponse(NPC_RESPONSES.multiOrg(firstName, orgList));
    }

    // STEP 0b: Check for pending switch confirmation (YES/NO response)
    if (currentSession?.status === "pending_switch" && currentSession.pending_switch_org_id) {
      if (upperBody === "YES") {
        const switchOrgId = currentSession.pending_switch_org_id;
        const switchOrgName = await getOrgName(supabase, switchOrgId);

        await createSession(supabase, from, switchOrgId, null, "active");

        console.log("SMS_EVENT", JSON.stringify({
          event: "SMS_SWITCH_CONFIRMED",
          from_org_id: currentSession.organization_id,
          to_org_id: switchOrgId,
          phone_last4: from.slice(-4),
          timestamp: new Date().toISOString(),
        }));

        return twimlResponse(NPC_RESPONSES.switched(switchOrgName || "ministry"));
      } else {
        // Not YES — clear pending switch, continue routing normally
        await clearPendingSwitch(supabase, currentSession.session_id);
      }
    }

    // STEP 1: Check for commands (HELP, ?, MENU, EXIT, SWITCH)
    if (upperBody === "EXIT") {
      await endSession(supabase, from);

      console.log("SMS_EVENT", JSON.stringify({
        event: "SMS_EXIT_COMMAND",
        org_id: currentSession?.organization_id || null,
        phone_last4: from.slice(-4),
        timestamp: new Date().toISOString(),
      }));

      return twimlResponse(NPC_RESPONSES.disconnected());
    }

    if (upperBody === "?" || upperBody === "MENU" || upperBody === "HELP") {
      if (currentSession && currentOrgName) {
        return twimlResponse(NPC_RESPONSES.helpConnected(currentOrgName));
      }
      return twimlResponse(NPC_RESPONSES.helpNotConnected());
    }

    if (upperBody.startsWith("SWITCH ")) {
      const code = body.substring(7).trim().toLowerCase();
      const result = await handleSwitch(supabase, from, code);
      return twimlResponse(result.message);
    }

    // STEP 2: Check if message is an org code
    console.log("STEP 2: Checking if message is an org code...");
    const codeResult = await tryParseCode(supabase, body);

    if (codeResult.type === "org") {
      // If already connected to a DIFFERENT org, prompt for confirmation
      if (currentSession && currentSession.status === "active" && currentSession.organization_id !== codeResult.orgId) {
        await setPendingSwitch(supabase, currentSession.session_id, codeResult.orgId!);

        console.log("SMS_EVENT", JSON.stringify({
          event: "SMS_SWITCH_PROMPTED",
          current_org_id: currentSession.organization_id,
          target_org_id: codeResult.orgId,
          phone_last4: from.slice(-4),
          timestamp: new Date().toISOString(),
        }));

        return twimlResponse(NPC_RESPONSES.confirmSwitch(codeResult.orgName!));
      }

      // Connect to org — also look up profile for the message
      const student = await findStudentByPhone(supabase, from);

      console.log("SMS_EVENT", JSON.stringify({
        event: "SMS_ORG_CONNECTED",
        org_id: codeResult.orgId,
        org_name: codeResult.orgName,
        phone_last4: phoneMatch(from).slice(-4),
        timestamp: new Date().toISOString(),
      }));

      await createSession(supabase, from, codeResult.orgId!, null, "active");
      await storeMessage(supabase, {
        from, to, body, messageSid,
        studentId: student?.id || null,
        organizationId: codeResult.orgId!,
        groupId: null,
        direction: "inbound",
        isLobbyMessage: false,
      });

      return twimlResponse(NPC_RESPONSES.connected(codeResult.orgName!));
    }

    // STEP 3: Try auto-routing for replies (recent conversation within 24h)
    // This catches broadcast replies and DM replies
    console.log("STEP 3: Checking for recent conversation...");
    const recentConvo = await findRecentConversation(supabase, from);

    if (recentConvo) {
      console.log("Auto-routing reply to recent conversation:", recentConvo);

      // Ensure we have a profile_id — fallback to phone lookup
      let studentId = recentConvo.student_id;
      if (!studentId) {
        const student = await findStudentByPhone(supabase, from);
        studentId = student?.id || null;
      }

      await storeMessage(supabase, {
        from, to, body, messageSid,
        studentId,
        organizationId: recentConvo.organization_id,
        groupId: recentConvo.group_id,
        direction: "inbound",
        isLobbyMessage: false,
      });

      // Create a session so future messages route via STEP 4 (active session)
      // This avoids repeated find_recent_conversation queries
      await createSession(supabase, from, recentConvo.organization_id, recentConvo.group_id, "active");

      // Silent — no response, no footer
      return twimlResponse(null);
    }

    // STEP 4: Check for active session
    console.log("STEP 4: Checking for active session...");
    const session = currentSession; // Already fetched above

    if (session && session.status === "active") {
      const student = await findStudentByPhone(supabase, from);
      await storeMessage(supabase, {
        from, to, body, messageSid,
        studentId: student?.id || null,
        organizationId: session.organization_id,
        groupId: session.group_id,
        direction: "inbound",
        isLobbyMessage: !session.group_id,
      });

      await updateSessionActivity(supabase, session.session_id);

      // Silent — no response, no footer
      return twimlResponse(null);
    }

    if (session && session.status === "pending_group") {
      const sessionOrgCode = await getOrgCode(supabase, session.organization_id);
      const result = await handleGroupSelection(supabase, from, body, session, sessionOrgCode);
      return twimlResponse(result.message);
    }

    // STEP 5: Auto-connect known phone (NEW)
    // If their phone is in our system, connect them automatically
    console.log("STEP 5: Checking if phone belongs to a known profile...");
    const profileOrgs = await findProfileOrgsByPhone(supabase, from);

    if (profileOrgs && profileOrgs.orgs.length > 0) {
      if (profileOrgs.orgs.length === 1) {
        // Single org — auto-connect silently with welcome
        const org = profileOrgs.orgs[0];
        await createSession(supabase, from, org.orgId, null, "active");
        await storeMessage(supabase, {
          from, to, body, messageSid,
          studentId: profileOrgs.profileId,
          organizationId: org.orgId,
          groupId: null,
          direction: "inbound",
          isLobbyMessage: false,
        });

        console.log("SMS_EVENT", JSON.stringify({
          event: "SMS_AUTO_CONNECTED",
          org_id: org.orgId,
          org_name: org.orgName,
          profile_id: profileOrgs.profileId,
          phone_last4: from.slice(-4),
          timestamp: new Date().toISOString(),
        }));

        return twimlResponse(NPC_RESPONSES.autoConnected(profileOrgs.firstName, org.orgName));
      } else {
        // Multiple orgs — present numbered list
        // Create a pending_org session to track the selection
        const firstOrg = profileOrgs.orgs[0];
        await createSessionWithOrgList(supabase, from, firstOrg.orgId, profileOrgs.orgs, profileOrgs.firstName);

        console.log("SMS_EVENT", JSON.stringify({
          event: "SMS_MULTI_ORG_PROMPTED",
          profile_id: profileOrgs.profileId,
          org_count: profileOrgs.orgs.length,
          phone_last4: from.slice(-4),
          timestamp: new Date().toISOString(),
        }));

        return twimlResponse(NPC_RESPONSES.multiOrg(profileOrgs.firstName, profileOrgs.orgs));
      }
    }

    // STEP 6: Unknown contact — friendly guidance
    console.log("STEP 6: Unknown contact, sending welcome message");
    await addToWaitingRoom(supabase, from, null, body);
    await storeMessage(supabase, {
      from, to, body, messageSid,
      studentId: null,
      organizationId: null,
      groupId: null,
      direction: "inbound",
      isLobbyMessage: false,
    });

    return twimlResponse(NPC_RESPONSES.welcome());

  } catch (error) {
    console.error("Error processing webhook:", error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return twimlResponse(NPC_RESPONSES.error);
  }
});

// ========================================
// Helper Functions
// ========================================

// Find orgs associated with a phone number via profiles + organization_memberships
async function findProfileOrgsByPhone(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{ profileId: string; firstName: string; orgs: { orgId: string; orgName: string }[] } | null> {
  const phoneDigits = phoneMatch(phone);

  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      first_name,
      organization_memberships!inner(
        organization_id,
        organizations!inner(display_name, name)
      )
    `)
    .ilike("phone_number", `%${phoneDigits}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error finding profile orgs by phone:", error);
    return null;
  }

  if (!data || !data.organization_memberships?.length) {
    return null;
  }

  const orgs = data.organization_memberships.map((m: any) => ({
    orgId: m.organization_id,
    orgName: m.organizations?.display_name || m.organizations?.name || "Ministry",
  }));

  // Deduplicate by orgId
  const uniqueOrgs = orgs.filter((o: any, i: number, arr: any[]) =>
    arr.findIndex((x: any) => x.orgId === o.orgId) === i
  );

  return {
    profileId: data.id,
    firstName: data.first_name || "there",
    orgs: uniqueOrgs,
  };
}

async function findRecentConversation(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{ organization_id: string; group_id: string | null; student_id: string | null } | null> {
  const { data, error } = await supabase.rpc("find_recent_conversation", { p_phone: phone });
  if (error) {
    console.error("Error finding recent conversation:", error);
    return null;
  }
  return data?.[0] || null;
}

async function findStudentByPhone(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{ id: string; organization_id: string } | null> {
  const phoneDigits = phoneMatch(phone);

  // Try profiles table first (new schema)
  const { data: profileData } = await supabase
    .from("profiles")
    .select(`
      id,
      organization_memberships!inner(organization_id)
    `)
    .ilike("phone_number", `%${phoneDigits}`)
    .limit(1)
    .maybeSingle();

  if (profileData && profileData.organization_memberships?.[0]) {
    return {
      id: profileData.id,
      organization_id: profileData.organization_memberships[0].organization_id,
    };
  }

  // Fallback to students table
  const { data, error } = await supabase
    .from("students")
    .select("id, organization_id")
    .ilike("phone_number", `%${phoneDigits}`)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error finding student:", error);
  }
  return data || null;
}

async function getActiveSession(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{
  session_id: string;
  organization_id: string;
  group_id: string | null;
  status: string;
  is_first_message: boolean;
  pending_switch_org_id: string | null;
  pending_org_list: any | null;
  pending_org_list_name: string | null;
} | null> {
  const { data, error } = await supabase
    .from("sms_sessions")
    .select("id, organization_id, group_id, status, is_first_message, pending_switch_org_id, pending_org_list")
    .eq("phone_number", phone)
    .in("status", ["pending_group", "active", "pending_switch", "pending_org"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error getting active session:", error);
    return null;
  }
  if (!data) return null;

  // Extract firstName from pending_org_list metadata if present
  let pendingOrgListName: string | null = null;
  if (data.pending_org_list && Array.isArray(data.pending_org_list)) {
    // Name is stored at index -1 (not really) — we store it as a _name key in the first entry or separately
    // Actually we store it in the session creation — let's check if there's metadata
  }
  // We'll pass the pending_org_list through and extract name from the helper
  const orgList = data.pending_org_list as any;
  if (orgList && orgList._name) {
    pendingOrgListName = orgList._name;
  }

  return {
    session_id: data.id,
    organization_id: data.organization_id,
    group_id: data.group_id,
    status: data.status,
    is_first_message: data.is_first_message ?? true,
    pending_switch_org_id: data.pending_switch_org_id,
    pending_org_list: orgList?.orgs || orgList,
    pending_org_list_name: pendingOrgListName || orgList?._name || null,
  };
}

async function createSession(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  orgId: string,
  groupId: string | null,
  status: "pending_group" | "active"
): Promise<void> {
  await endSession(supabase, phone);

  const { error } = await supabase.from("sms_sessions").insert({
    phone_number: phone,
    organization_id: orgId,
    group_id: groupId,
    status,
  });

  if (error) {
    console.error("Error creating session:", error);
  } else {
    console.log("SMS_EVENT", JSON.stringify({
      event: "SMS_SESSION_STARTED",
      org_id: orgId,
      group_id: groupId,
      status,
      phone_last4: phone.slice(-4),
      timestamp: new Date().toISOString(),
    }));
  }
}

async function createSessionWithOrgList(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  orgId: string,
  orgs: { orgId: string; orgName: string }[],
  firstName: string
): Promise<void> {
  await endSession(supabase, phone);

  const { error } = await supabase.from("sms_sessions").insert({
    phone_number: phone,
    organization_id: orgId,
    group_id: null,
    status: "pending_org",
    pending_org_list: { _name: firstName, orgs },
  });

  if (error) {
    console.error("Error creating pending_org session:", error);
  }
}

async function updateSessionActivity(
  supabase: ReturnType<typeof createClient>,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({
      last_activity: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Error updating session activity:", error);
  }
}

async function setPendingSwitch(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  targetOrgId: string
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({
      status: "pending_switch",
      pending_switch_org_id: targetOrgId,
      last_activity: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Error setting pending switch:", error);
  }
}

async function clearPendingSwitch(
  supabase: ReturnType<typeof createClient>,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({
      status: "active",
      pending_switch_org_id: null,
      last_activity: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Error clearing pending switch:", error);
  }
}

async function getOrgName(
  supabase: ReturnType<typeof createClient>,
  orgId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("display_name, name")
    .eq("id", orgId)
    .single();

  if (error) {
    console.error("Error getting org name:", error);
    return null;
  }
  return data?.display_name || data?.name || null;
}

async function getOrgCode(
  supabase: ReturnType<typeof createClient>,
  orgId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("short_code, slug")
    .eq("id", orgId)
    .single();

  if (error) {
    console.error("Error getting org code:", error);
    return null;
  }
  return data?.short_code || data?.slug || null;
}

async function endSession(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString(),
      pending_switch_org_id: null,
    })
    .eq("phone_number", phone)
    .in("status", ["pending_group", "active", "pending_switch", "pending_org"]);

  if (error) {
    console.error("Error ending session:", error);
  }
}

async function tryParseCode(
  supabase: ReturnType<typeof createClient>,
  text: string
): Promise<{ type: "org" | "none"; orgId?: string; orgName?: string; orgCode?: string }> {
  const code = text.trim().toLowerCase();

  const { data: orgData } = await supabase.rpc("find_org_by_code", { p_code: code });
  if (orgData?.[0]) {
    return {
      type: "org",
      orgId: orgData[0].org_id,
      orgName: orgData[0].org_name || orgData[0].org_slug,
      orgCode: orgData[0].org_code || code,
    };
  }

  return { type: "none" };
}

async function handleSwitch(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  code: string
): Promise<{ message: string }> {
  const result = await tryParseCode(supabase, code);

  if (result.type === "org") {
    await createSession(supabase, phone, result.orgId!, null, "active");

    console.log("SMS_EVENT", JSON.stringify({
      event: "SMS_SWITCH_COMMAND",
      org_id: result.orgId,
      org_name: result.orgName,
      phone_last4: phone.slice(-4),
      timestamp: new Date().toISOString(),
    }));

    return { message: NPC_RESPONSES.switched(result.orgName!) };
  }

  return { message: NPC_RESPONSES.invalidCode() };
}

async function handleGroupSelection(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  input: string,
  session: { session_id: string; organization_id: string },
  orgCode: string | null
): Promise<{ message: string }> {
  const groups = await listOrgGroups(supabase, session.organization_id);
  const trimmedInput = input.trim();

  const num = parseInt(trimmedInput, 10);
  if (!isNaN(num) && num >= 1 && num <= groups.length) {
    const selected = groups[num - 1];
    await updateSessionGroup(supabase, session.session_id, selected.group_id);
    return { message: `Connected to ${selected.name}!` };
  }

  const lowerInput = trimmedInput.toLowerCase();
  const matchingGroup = groups.find(g => g.code?.toLowerCase() === lowerInput);
  if (matchingGroup) {
    await updateSessionGroup(supabase, session.session_id, matchingGroup.group_id);
    return { message: `Connected to ${matchingGroup.name}!` };
  }

  const list = groups.map((g, i) => `${i + 1}. ${g.name}`).join('\n');
  return { message: `Didn't catch that. Reply with a number:\n${list}` };
}

async function listOrgGroups(
  supabase: ReturnType<typeof createClient>,
  orgId: string
): Promise<{ group_id: string; name: string; code: string | null }[]> {
  const { data, error } = await supabase.rpc("list_org_groups_for_sms", { p_org_id: orgId });
  if (error) {
    console.error("Error listing org groups:", error);
    return [];
  }
  return (data || []).map((g: { group_id: string; group_name: string; group_code: string | null }) => ({
    group_id: g.group_id,
    name: g.group_name,
    code: g.group_code,
  }));
}

async function updateSessionGroup(
  supabase: ReturnType<typeof createClient>,
  sessionId: string,
  groupId: string
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({
      group_id: groupId,
      status: "active",
      last_activity: new Date().toISOString()
    })
    .eq("id", sessionId);

  if (error) {
    console.error("Error updating session group:", error);
  }
}

async function addToWaitingRoom(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  orgId: string | null,
  firstMessage: string
): Promise<void> {
  const { data: existing } = await supabase
    .from("sms_waiting_room")
    .select("id, message_count")
    .eq("phone_number", phone)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    await supabase
      .from("sms_waiting_room")
      .update({
        message_count: (existing.message_count || 1) + 1,
        last_contact_at: new Date().toISOString(),
        organization_id: orgId || undefined,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("sms_waiting_room").insert({
      phone_number: phone,
      organization_id: orgId,
      first_message: firstMessage,
      status: "pending",
    });
  }
}

async function storeMessage(
  supabase: ReturnType<typeof createClient>,
  msg: {
    from: string;
    to: string;
    body: string;
    messageSid: string;
    studentId: string | null;
    organizationId: string | null;
    groupId: string | null;
    direction: "inbound" | "outbound";
    isLobbyMessage: boolean;
  }
): Promise<void> {
  const { error } = await supabase.from("sms_messages").insert({
    profile_id: msg.studentId,
    student_id: msg.studentId,
    direction: msg.direction,
    body: msg.body,
    from_number: msg.from,
    to_number: msg.to,
    twilio_sid: msg.messageSid,
    status: "received",
    organization_id: msg.organizationId,
    group_id: msg.groupId,
    is_lobby_message: msg.isLobbyMessage,
  });

  if (error) {
    console.error("Error storing message:", error);
  } else {
    console.log("SMS_EVENT", JSON.stringify({
      event: "SMS_MESSAGE_ROUTED",
      org_id: msg.organizationId,
      group_id: msg.groupId,
      is_lobby: msg.isLobbyMessage,
      has_profile: !!msg.studentId,
      direction: msg.direction,
      timestamp: new Date().toISOString(),
    }));
  }
}
