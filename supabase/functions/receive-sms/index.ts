import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// INTERIM MODE - Shared Twilio Number
// ============================================
// Set to false when dedicated number is approved
// to enable full NPC routing and conversation features
const INTERIM_MODE = false; // Dedicated number approved Jan 28, 2026

// Interim responses - simple, generic, no confusion for Seedling users
const INTERIM_RESPONSES = {
  help: "Thanks for reaching out! For support, please contact your ministry leader directly.",
  generic: "Message received. If this requires a response, a team member will follow up.",
};

// Full NPC responses (used when INTERIM_MODE = false)
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
  replyRouted: null, // No response needed for auto-routed replies
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

serve(async (req) => {
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

    console.log("Received SMS:", { from, to, bodyPreview: body?.substring(0, 50), messageSid, interimMode: INTERIM_MODE });

    // Structured analytics log for SMS_RECEIVED
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

    const upperBody = body.toUpperCase();

    // ============================================
    // INTERIM MODE: Simple handling for shared number
    // ============================================
    if (INTERIM_MODE) {
      // Handle HELP command
      if (upperBody === "HELP") {
        return twimlResponse(INTERIM_RESPONSES.help);
      }

      // Try to find student by phone number
      const student = await findStudentByPhone(supabase, from);

      // Store the message (with student context if found)
      await storeMessage(supabase, {
        from,
        to,
        body,
        messageSid,
        studentId: student?.id || null,
        organizationId: student?.organization_id || null,
        groupId: null,
        direction: "inbound",
        isLobbyMessage: !!student, // If student exists but no routing, it's a lobby message
      });

      // If unknown phone, add to waiting room (silently)
      if (!student) {
        await addToWaitingRoom(supabase, from, null, body);
      }

      // Return generic acknowledgment
      return twimlResponse(INTERIM_RESPONSES.generic);
    }

    // ============================================
    // FULL MODE: NPC Router (when dedicated number is active)
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
      console.log("Auto-routing reply to recent conversation:", recentConvo);
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
      // No response needed - message is routed
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
      // Org-level routing: Connect directly to org inbox (no group selection)
      // Group-level routing is opt-in (user texts group code specifically)
      console.log("SMS_EVENT", JSON.stringify({
        event: "SMS_ORG_CONNECTED",
        org_id: codeResult.orgId,
        org_name: codeResult.orgName,
        phone_last4: phoneMatch(from).slice(-4),
        timestamp: new Date().toISOString(),
      }));

      await createSession(supabase, from, codeResult.orgId!, null, "active");
      await addToWaitingRoom(supabase, from, codeResult.orgId!, body);
      await storeMessage(supabase, {
        from,
        to,
        body,
        messageSid,
        studentId: null,
        organizationId: codeResult.orgId!,
        groupId: null, // Org-level, not group-level
        direction: "inbound",
        isLobbyMessage: false,
      });
      return twimlResponse(NPC_RESPONSES.connected(codeResult.orgName!));
    }

    // STEP 6: Unknown contact - welcome message
    await addToWaitingRoom(supabase, from, null, body);
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

    return twimlResponse(NPC_RESPONSES.welcome);

  } catch (error) {
    console.error("Error processing webhook:", error);
    return twimlResponse(null);
  }
});

// ========================================
// Helper Functions
// ========================================

async function findRecentConversation(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{ organization_id: string; group_id: string | null; student_id: string } | null> {
  const { data, error } = await supabase.rpc("find_recent_conversation", { p_phone: phone });
  if (error) {
    console.error("Error finding recent conversation:", error);
    return null;
  }
  return data?.[0] || null;
}

async function findStudentGroups(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{ student_id: string; org_id: string; org_name: string; group_id: string; group_name: string; group_code: string | null }[] | null> {
  const { data, error } = await supabase.rpc("find_student_groups", { p_phone: phone });
  if (error) {
    console.error("Error finding student groups:", error);
    return null;
  }
  return data || null;
}

async function findStudentByPhone(
  supabase: ReturnType<typeof createClient>,
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
    console.error("Error finding student:", error);
  }
  return data || null;
}

async function getActiveSession(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{ session_id: string; organization_id: string; group_id: string | null; status: string } | null> {
  const { data, error } = await supabase.rpc("get_active_sms_session", { p_phone: phone });
  if (error) {
    console.error("Error getting active session:", error);
    return null;
  }
  return data?.[0] || null;
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
    // Analytics log for session creation
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

async function updateSessionActivity(
  supabase: ReturnType<typeof createClient>,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({ last_activity: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) {
    console.error("Error updating session activity:", error);
  }
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

async function endSession(
  supabase: ReturnType<typeof createClient>,
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
    console.error("Error ending session:", error);
  }
}

async function tryParseCode(
  supabase: ReturnType<typeof createClient>,
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

async function handleGroupSelection(
  supabase: ReturnType<typeof createClient>,
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
  supabase: ReturnType<typeof createClient>,
  phone: string,
  code: string
): Promise<{ message: string }> {
  const result = await tryParseCode(supabase, code);

  if (result.type === "org") {
    // Org-level routing: Switch to org directly (no group selection)
    await createSession(supabase, phone, result.orgId!, null, "active");
    return { message: NPC_RESPONSES.switched(result.orgName!) };
  }

  return { message: NPC_RESPONSES.unknownCode };
}

async function listGroups(
  supabase: ReturnType<typeof createClient>,
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
    // Analytics log for message routing
    console.log("SMS_EVENT", JSON.stringify({
      event: "SMS_MESSAGE_ROUTED",
      org_id: msg.organizationId,
      group_id: msg.groupId,
      is_lobby: msg.isLobbyMessage,
      has_student: !!msg.studentId,
      direction: msg.direction,
      timestamp: new Date().toISOString(),
    }));
  }
}

// Store context for multi-group selection
async function storeGroupSelectionContext(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  groups: { student_id: string; org_id: string; org_name: string; group_id: string; group_name: string; group_code: string | null }[]
): Promise<void> {
  console.log("Group selection context for", phone, ":", groups.length, "groups");
}
