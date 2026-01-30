import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================
// INTERIM MODE - Shared Twilio Number
// ============================================
const INTERIM_MODE = false; // Dedicated number approved Jan 28, 2026

const INTERIM_RESPONSES = {
  help: "Thanks for reaching out! For support, please contact your ministry leader directly.",
  generic: "Message received. If this requires a response, a team member will follow up.",
};

const NPC_RESPONSES = {
  welcome: `Hey! 👋 Text your group code to connect, or tell me which ministry you're looking for.`,
  connected: (orgName: string) => `Connected to ${orgName}! A leader will text you back soon. 🙌`,
  connectedWithGroups: (orgName: string, groups: { name: string; code: string | null }[]) => {
    const groupList = groups
      .map((g, i) => `${i + 1}. ${g.name}${g.code ? ` (${g.code.toUpperCase()})` : ''}`)
      .join('\n');
    return `Welcome to ${orgName}! 🙌\n\nWhich group?\n${groupList}\n\nReply with the number or group code.`;
  },
  groupSelected: (groupName: string) => `You're connected to ${groupName}! A leader will text back soon. 🙌`,
  invalidSelection: `Hmm, I didn't catch that. Reply with a number from the list, or text HELP for options.`,
  lobbyMessage: `Got it! Your message is in the lobby. A leader will reach out soon to connect you with a group.`,
  waitingRoom: (orgName: string) => `Your message was sent to ${orgName}. A leader will reach out soon!`,
  unknownCode: `I don't recognize that code. Ask your leader for their ministry code and text it here. 👍`,
  help: `Commands:\nEXIT - Leave current chat\nSWITCH [code] - Switch ministry/group\nGROUPS - List available groups\nHELP - Show this message`,
  exited: `You've left the chat. Text a ministry code anytime to reconnect!`,
  switched: (name: string) => `Switched to ${name}! 🔄`,
  multipleGroups: (groups: { org_name: string; group_name: string; group_code: string | null }[]) => {
    const list = groups.map((g, i) =>
      `${i + 1}. ${g.group_name} @ ${g.org_name}${g.group_code ? ` (${g.group_code.toUpperCase()})` : ''}`
    ).join('\n');
    return `You're in multiple groups! Which one?\n${list}\n\nReply with a number.`;
  },
};

// Get last 10 digits for matching
function phoneMatch(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return digits.slice(-10);
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

// Send TwiML response
function twimlResponse(message: string | null): NextResponse {
  const body = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
  return new NextResponse(body, {
    status: 200,
    headers: { "Content-Type": "text/xml" }
  });
}

// Create Supabase client with service role key
function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("[receive-sms] Supabase URL:", supabaseUrl ? "SET" : "MISSING");
  console.log("[receive-sms] Service Key:", supabaseServiceKey ? "SET" : "MISSING");

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(`Missing env vars: URL=${!!supabaseUrl}, KEY=${!!supabaseServiceKey}`);
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  console.log("[receive-sms] Starting POST handler");

  // DEBUG: Test what getSupabase does
  try {
    const supabase = getSupabase();
    return twimlResponse("STEP1 OK: Supabase created");
  } catch (e) {
    return twimlResponse("STEP1 FAIL: " + String(e));
  }

  try {
    // Parse Twilio webhook (form data)
    const formData = await request.formData();
    console.log("[receive-sms] Form data parsed successfully");
    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = (formData.get("Body") as string || "").trim();
    const messageSid = formData.get("MessageSid") as string;

    console.log("[receive-sms] Received SMS:", { from, to, bodyPreview: body?.substring(0, 50), messageSid, interimMode: INTERIM_MODE });

    if (!from || !body) {
      console.error("[receive-sms] Missing required fields from Twilio webhook");
      return twimlResponse(`PARSE ERROR: from=${!!from}, body=${!!body}`);
    }

    const upperBody = body.toUpperCase();

    // ============================================
    // INTERIM MODE: Simple handling for shared number
    // ============================================
    if (INTERIM_MODE) {
      if (upperBody === "HELP") {
        return twimlResponse(INTERIM_RESPONSES.help);
      }

      const student = await findStudentByPhone(supabase, from);

      await storeMessage(supabase, {
        from,
        to,
        body,
        messageSid,
        studentId: student?.id || null,
        organizationId: student?.organization_id || null,
        groupId: null,
        direction: "inbound",
        isLobbyMessage: !!student,
      });

      if (!student) {
        await addToWaitingRoom(supabase, from, null, body);
      }

      return twimlResponse(INTERIM_RESPONSES.generic);
    }

    // ============================================
    // FULL MODE: NPC Router
    // ============================================

    // STEP 1: Check for commands
    if (upperBody === "EXIT") {
      await endSession(supabase, from);
      return twimlResponse(NPC_RESPONSES.exited);
    }

    if (upperBody === "HELP") {
      return twimlResponse(NPC_RESPONSES.help);
    }

    if (upperBody.startsWith("SWITCH ")) {
      const code = body.substring(7).trim().toLowerCase();
      const result = await handleSwitch(supabase, from, code);
      return twimlResponse(result.message);
    }

    if (upperBody === "GROUPS") {
      const result = await listGroups(supabase, from);
      return twimlResponse(result.message);
    }

    // STEP 2: Try auto-routing for replies
    const recentConvo = await findRecentConversation(supabase, from);
    if (recentConvo) {
      console.log("[receive-sms] Auto-routing reply to recent conversation:", recentConvo);
      await storeMessage(supabase, {
        from,
        to,
        body,
        messageSid,
        studentId: recentConvo.student_id,
        organizationId: recentConvo.organization_id,
        groupId: recentConvo.group_id,
        direction: "inbound",
        isLobbyMessage: false,
      });
      return twimlResponse(null);
    }

    // STEP 3: Check for active session
    const session = await getActiveSession(supabase, from);

    if (session) {
      if (session.status === "pending_group") {
        const result = await handleGroupSelection(supabase, from, body, session);
        return twimlResponse(result.message);
      } else if (session.status === "active") {
        const student = await findStudentByPhone(supabase, from);
        await storeMessage(supabase, {
          from,
          to,
          body,
          messageSid,
          studentId: student?.id || null,
          organizationId: session.organization_id,
          groupId: session.group_id,
          direction: "inbound",
          isLobbyMessage: !session.group_id,
        });
        await updateSessionActivity(supabase, session.session_id);
        return twimlResponse(null);
      }
    }

    // STEP 4: Check if known student
    const studentGroups = await findStudentGroups(supabase, from);

    if (studentGroups && studentGroups.length > 0) {
      if (studentGroups.length === 1) {
        const sg = studentGroups[0];
        await createSession(supabase, from, sg.org_id, sg.group_id, "active");
        await storeMessage(supabase, {
          from,
          to,
          body,
          messageSid,
          studentId: sg.student_id,
          organizationId: sg.org_id,
          groupId: sg.group_id,
          direction: "inbound",
          isLobbyMessage: false,
        });
        return twimlResponse(null);
      } else {
        await createSession(supabase, from, studentGroups[0].org_id, null, "pending_group");
        await storeGroupSelectionContext(supabase, from, studentGroups);
        return twimlResponse(NPC_RESPONSES.multipleGroups(studentGroups));
      }
    }

    // Check if student exists but not in any group (lobby case)
    const student = await findStudentByPhone(supabase, from);
    if (student) {
      await storeMessage(supabase, {
        from,
        to,
        body,
        messageSid,
        studentId: student.id,
        organizationId: student.organization_id,
        groupId: null,
        direction: "inbound",
        isLobbyMessage: true,
      });
      return twimlResponse(NPC_RESPONSES.lobbyMessage);
    }

    // STEP 5: Check if message is an org/group code
    const codeResult = await tryParseCode(supabase, body);

    if (codeResult.type === "org") {
      const orgGroups = await listOrgGroups(supabase, codeResult.orgId!);

      if (orgGroups.length === 0) {
        await addToWaitingRoom(supabase, from, codeResult.orgId!, body);
        return twimlResponse(NPC_RESPONSES.waitingRoom(codeResult.orgName!));
      } else if (orgGroups.length === 1) {
        await createSession(supabase, from, codeResult.orgId!, orgGroups[0].group_id, "active");
        await addToWaitingRoom(supabase, from, codeResult.orgId!, body);
        return twimlResponse(NPC_RESPONSES.connected(codeResult.orgName!));
      } else {
        await createSession(supabase, from, codeResult.orgId!, null, "pending_group");
        return twimlResponse(NPC_RESPONSES.connectedWithGroups(codeResult.orgName!, orgGroups));
      }
    }

    // STEP 6: Unknown contact - welcome message
    console.log("[receive-sms] STEP 6: Unknown contact, sending welcome");
    try {
      await addToWaitingRoom(supabase, from, null, body);
    } catch (e) {
      console.error("[receive-sms] addToWaitingRoom failed:", e);
    }
    try {
      await storeMessage(supabase, {
        from,
        to,
        body,
        messageSid,
        studentId: null,
        organizationId: null,
        groupId: null,
        direction: "inbound",
        isLobbyMessage: false,
      });
    } catch (e) {
      console.error("[receive-sms] storeMessage failed:", e);
    }

    console.log("[receive-sms] Returning welcome message:", NPC_RESPONSES.welcome);
    return twimlResponse(NPC_RESPONSES.welcome);

  } catch (error) {
    console.error("[receive-sms] Error processing webhook:", error);
    // Return error message for debugging
    return twimlResponse(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ========================================
// Helper Functions
// ========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

async function findRecentConversation(
  supabase: SupabaseClient,
  phone: string
): Promise<{ organization_id: string; group_id: string | null; student_id: string } | null> {
  const { data, error } = await supabase.rpc("find_recent_conversation", { p_phone: phone });
  if (error) {
    console.error("[receive-sms] Error finding recent conversation:", error);
    return null;
  }
  return data?.[0] || null;
}

async function findStudentGroups(
  supabase: SupabaseClient,
  phone: string
): Promise<{ student_id: string; org_id: string; org_name: string; group_id: string; group_name: string; group_code: string | null }[] | null> {
  const { data, error } = await supabase.rpc("find_student_groups", { p_phone: phone });
  if (error) {
    console.error("[receive-sms] Error finding student groups:", error);
    return null;
  }
  return data || null;
}

async function findStudentByPhone(
  supabase: SupabaseClient,
  phone: string
): Promise<{ id: string; organization_id: string } | null> {
  const phoneDigits = phoneMatch(phone);
  const { data, error } = await supabase
    .from("students")
    .select("id, organization_id")
    .ilike("phone_number", `%${phoneDigits}`)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[receive-sms] Error finding student:", error);
  }
  return data || null;
}

async function getActiveSession(
  supabase: SupabaseClient,
  phone: string
): Promise<{ session_id: string; organization_id: string; group_id: string | null; status: string } | null> {
  const { data, error } = await supabase.rpc("get_active_sms_session", { p_phone: phone });
  if (error) {
    console.error("[receive-sms] Error getting active session:", error);
    return null;
  }
  return data?.[0] || null;
}

async function createSession(
  supabase: SupabaseClient,
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
    console.error("[receive-sms] Error creating session:", error);
  }
}

async function updateSessionActivity(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    console.error("[receive-sms] Error updating session activity:", error);
  }
}

async function updateSessionGroup(
  supabase: SupabaseClient,
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
    console.error("[receive-sms] Error updating session group:", error);
  }
}

async function endSession(
  supabase: SupabaseClient,
  phone: string
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({
      status: "ended",
      ended_at: new Date().toISOString()
    })
    .eq("phone_number", phone)
    .in("status", ["pending_group", "active"]);

  if (error) {
    console.error("[receive-sms] Error ending session:", error);
  }
}

async function tryParseCode(
  supabase: SupabaseClient,
  text: string
): Promise<{ type: "org" | "group" | "none"; orgId?: string; orgName?: string; groupId?: string; groupName?: string }> {
  const code = text.trim().toLowerCase();

  const { data: orgData } = await supabase.rpc("find_org_by_code", { p_code: code });
  if (orgData?.[0]) {
    return { type: "org", orgId: orgData[0].org_id, orgName: orgData[0].org_name || orgData[0].org_slug };
  }

  return { type: "none" };
}

async function listOrgGroups(
  supabase: SupabaseClient,
  orgId: string
): Promise<{ group_id: string; name: string; code: string | null }[]> {
  const { data, error } = await supabase.rpc("list_org_groups_for_sms", { p_org_id: orgId });
  if (error) {
    console.error("[receive-sms] Error listing org groups:", error);
    return [];
  }
  return (data || []).map((g: { group_id: string; group_name: string; group_code: string | null }) => ({
    group_id: g.group_id,
    name: g.group_name,
    code: g.group_code,
  }));
}

async function handleGroupSelection(
  supabase: SupabaseClient,
  phone: string,
  input: string,
  session: { session_id: string; organization_id: string }
): Promise<{ message: string }> {
  const groups = await listOrgGroups(supabase, session.organization_id);
  const trimmedInput = input.trim();

  const num = parseInt(trimmedInput, 10);
  if (!isNaN(num) && num >= 1 && num <= groups.length) {
    const selected = groups[num - 1];
    await updateSessionGroup(supabase, session.session_id, selected.group_id);
    return { message: NPC_RESPONSES.groupSelected(selected.name) };
  }

  const lowerInput = trimmedInput.toLowerCase();
  const matchingGroup = groups.find(g => g.code?.toLowerCase() === lowerInput);
  if (matchingGroup) {
    await updateSessionGroup(supabase, session.session_id, matchingGroup.group_id);
    return { message: NPC_RESPONSES.groupSelected(matchingGroup.name) };
  }

  return { message: NPC_RESPONSES.invalidSelection };
}

async function handleSwitch(
  supabase: SupabaseClient,
  phone: string,
  code: string
): Promise<{ message: string }> {
  const result = await tryParseCode(supabase, code);

  if (result.type === "org") {
    await createSession(supabase, phone, result.orgId!, null, "pending_group");
    const groups = await listOrgGroups(supabase, result.orgId!);
    if (groups.length <= 1) {
      if (groups.length === 1) {
        const activeSession = await getActiveSession(supabase, phone);
        if (activeSession) {
          await updateSessionGroup(supabase, activeSession.session_id, groups[0].group_id);
        }
      }
      return { message: NPC_RESPONSES.switched(result.orgName!) };
    }
    return { message: NPC_RESPONSES.connectedWithGroups(result.orgName!, groups) };
  }

  return { message: NPC_RESPONSES.unknownCode };
}

async function listGroups(
  supabase: SupabaseClient,
  phone: string
): Promise<{ message: string }> {
  const session = await getActiveSession(supabase, phone);
  if (!session) {
    return { message: "You're not connected to a ministry. Text a ministry code to connect!" };
  }

  const groups = await listOrgGroups(supabase, session.organization_id);
  if (groups.length === 0) {
    return { message: "No groups available in this ministry." };
  }

  const list = groups.map((g, i) => `${i + 1}. ${g.name}${g.code ? ` (${g.code.toUpperCase()})` : ''}`).join('\n');
  return { message: `Available groups:\n${list}\n\nText SWITCH [code] to change groups.` };
}

async function addToWaitingRoom(
  supabase: SupabaseClient,
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
  supabase: SupabaseClient,
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
    console.error("[receive-sms] Error storing message:", error);
  }
}

async function storeGroupSelectionContext(
  supabase: SupabaseClient,
  phone: string,
  groups: { student_id: string; org_id: string; org_name: string; group_id: string; group_name: string; group_code: string | null }[]
): Promise<void> {
  console.log("[receive-sms] Group selection context for", phone, ":", groups.length, "groups");
}
