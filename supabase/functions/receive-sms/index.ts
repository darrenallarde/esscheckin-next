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
// MUD-style: clean commands, minimal chatter, transparent routing
const NPC_RESPONSES = {
  // New unknown user - prompt for code
  welcome: () =>
    `Welcome! Text your ministry code to connect.\nText ? for commands.`,

  // First connection to an org - explain how it works
  firstConnection: (orgName: string, code: string) =>
    `Welcome to ${orgName}! Text ? anytime for options.\n\n` +
    `Your messages now go directly to our team.\n` +
    `The #${code.toUpperCase()} tag below shows you're connected.\n\n` +
    `#${code.toUpperCase()}`,

  // Subsequent messages - just show the footer
  messageRouted: (code: string) =>
    `#${code.toUpperCase()}`,

  // MENU/? command response (avoiding HELP which is a Twilio reserved keyword)
  help: (orgName: string | null, code: string | null) =>
    `Commands:\n` +
    `- ? or MENU - Show this menu\n` +
    `- EXIT - Disconnect and start fresh\n` +
    `- SWITCH [code] - Connect to a different ministry` +
    (orgName ? `\n\nCurrently connected to: ${orgName} #${code?.toUpperCase()}` : `\n\nNot connected to any ministry.`),

  // EXIT command response
  disconnected: () =>
    `Disconnected. Text a ministry code to reconnect.\nText ? for commands.`,

  // SWITCH command success
  switched: (orgName: string, code: string) =>
    `Switched! Welcome to ${orgName}.\n\n#${code.toUpperCase()}`,

  // Auto-detected code while connected - ask for confirmation
  confirmSwitch: (orgName: string) =>
    `Switch to ${orgName}? Reply YES to confirm, or continue your message.`,

  // Invalid code
  invalidCode: () =>
    `Code not found. Text ? for commands.`,

  // Group selection (future feature)
  connectedWithGroups: (orgName: string, code: string, groups: { name: string; code: string | null }[]) => {
    const groupList = groups
      .map((g, i) => `${i + 1}. ${g.name}${g.code ? ` (${g.code.toUpperCase()})` : ''}`)
      .join('\n');
    return `Welcome to ${orgName}!\n\nWhich group?\n${groupList}\n\nReply with the number or group code.\n\n#${code.toUpperCase()}`;
  },
  groupSelected: (groupName: string, code: string) =>
    `Connected to ${groupName}!\n\n#${code.toUpperCase()}`,
  invalidSelection: (code?: string) => {
    const base = `Didn't catch that. Reply with a number from the list, or text ? for options.`;
    return code ? `${base}\n\n#${code.toUpperCase()}` : base;
  },
  multipleGroups: (groups: { org_name: string; group_name: string; group_code: string | null }[]) => {
    const list = groups.map((g, i) =>
      `${i + 1}. ${g.group_name} @ ${g.org_name}${g.group_code ? ` (${g.group_code.toUpperCase()})` : ''}`
    ).join('\n');
    return `You're in multiple groups! Which one?\n${list}\n\nReply with a number.`;
  },
  replyRouted: null, // No response needed for auto-routed replies
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
      if (upperBody === "?" || upperBody === "MENU") {
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

    // Get current session for context
    const currentSession = await getActiveSession(supabase, from);
    const currentOrgCode = currentSession ? await getOrgCode(supabase, currentSession.organization_id) : null;
    const currentOrgName = currentSession ? await getOrgName(supabase, currentSession.organization_id) : null;

    // STEP 0: Check for pending switch confirmation (YES/NO response)
    if (currentSession?.status === "pending_switch" && currentSession.pending_switch_org_id) {
      if (upperBody === "YES") {
        // Confirm the switch
        const switchOrgId = currentSession.pending_switch_org_id;
        const switchOrgName = await getOrgName(supabase, switchOrgId);
        const switchOrgCode = await getOrgCode(supabase, switchOrgId);

        // Create new session for the switched org
        await createSession(supabase, from, switchOrgId, null, "active");

        // Analytics log
        console.log("SMS_EVENT", JSON.stringify({
          event: "SMS_SWITCH_CONFIRMED",
          from_org_id: currentSession.organization_id,
          to_org_id: switchOrgId,
          phone_last4: from.slice(-4),
          timestamp: new Date().toISOString(),
        }));

        return twimlResponse(NPC_RESPONSES.switched(switchOrgName || "ministry", switchOrgCode || ""));
      } else {
        // Not YES - clear pending switch and route as normal message
        await clearPendingSwitch(supabase, currentSession.session_id);
        // Continue to route the message normally below
      }
    }

    // STEP 1: Check for commands
    if (upperBody === "EXIT") {
      await endSession(supabase, from);

      // Analytics log
      console.log("SMS_EVENT", JSON.stringify({
        event: "SMS_EXIT_COMMAND",
        org_id: currentSession?.organization_id || null,
        phone_last4: from.slice(-4),
        timestamp: new Date().toISOString(),
      }));

      return twimlResponse(NPC_RESPONSES.disconnected());
    }

    if (upperBody === "?" || upperBody === "MENU") {
      return twimlResponse(NPC_RESPONSES.help(currentOrgName, currentOrgCode));
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

    // STEP 2: Check if message is an org code (BEFORE recent convo check)
    // If already connected, prompt for confirmation before switching
    console.log("STEP 2: Checking if message is an org code...");
    const codeResult = await tryParseCode(supabase, body);
    console.log("Code result:", codeResult);

    if (codeResult.type === "org") {
      // Check if already connected to a DIFFERENT org
      if (currentSession && currentSession.status === "active" && currentSession.organization_id !== codeResult.orgId) {
        // Auto-detected a different org code while connected - prompt for confirmation
        await setPendingSwitch(supabase, currentSession.session_id, codeResult.orgId!);

        // Analytics log
        console.log("SMS_EVENT", JSON.stringify({
          event: "SMS_SWITCH_PROMPTED",
          current_org_id: currentSession.organization_id,
          target_org_id: codeResult.orgId,
          target_org_name: codeResult.orgName,
          phone_last4: from.slice(-4),
          timestamp: new Date().toISOString(),
        }));

        return twimlResponse(NPC_RESPONSES.confirmSwitch(codeResult.orgName!));
      }

      // Not connected yet, or same org - connect normally
      // Org-level routing: Connect directly to org inbox (no group selection)
      console.log("SMS_EVENT", JSON.stringify({
        event: "SMS_ORG_CONNECTED",
        org_id: codeResult.orgId,
        org_name: codeResult.orgName,
        org_code: codeResult.orgCode,
        phone_last4: phoneMatch(from).slice(-4),
        is_first_connection: !currentSession,
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

      // First connection gets full welcome, subsequent gets minimal footer
      return twimlResponse(NPC_RESPONSES.firstConnection(codeResult.orgName!, codeResult.orgCode!));
    }

    // STEP 3: Try auto-routing for replies (recent conversation)
    console.log("STEP 3: Checking for recent conversation...");
    const recentConvo = await findRecentConversation(supabase, from);
    console.log("Recent convo result:", recentConvo);
    if (recentConvo) {
      console.log("Auto-routing reply to recent conversation:", recentConvo);
      const orgCode = await getOrgCode(supabase, recentConvo.organization_id);
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
      // Return minimal footer showing which org they're connected to
      return twimlResponse(orgCode ? NPC_RESPONSES.messageRouted(orgCode) : null);
    }

    // STEP 4: Check for active session
    console.log("STEP 4: Checking for active session...");
    const session = await getActiveSession(supabase, from);
    console.log("Session result:", session);

    if (session) {
      const sessionOrgCode = await getOrgCode(supabase, session.organization_id);
      const sessionOrgName = await getOrgName(supabase, session.organization_id);

      if (session.status === "pending_group") {
        const result = await handleGroupSelection(supabase, from, body, session, sessionOrgCode);
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

        // Check if this is the first message after connecting
        const isFirst = session.is_first_message;
        await updateSessionActivity(supabase, session.session_id, false); // Mark as no longer first message

        // First message gets welcome explanation, subsequent messages get minimal footer
        if (isFirst) {
          return twimlResponse(NPC_RESPONSES.firstConnection(sessionOrgName || "ministry", sessionOrgCode || ""));
        }
        return twimlResponse(sessionOrgCode ? NPC_RESPONSES.messageRouted(sessionOrgCode) : null);
      }
    }

    // STEP 5: REMOVED - No auto-routing based on phone number matching
    // Security: New contacts MUST text an org code first to connect.
    // This prevents accidental routing to wrong orgs and ensures intentional connection.
    // Once connected via code, we can look up their profile for personalized greeting.

    // STEP 6: Unknown contact - welcome message (requires org code)
    console.log("STEP 6: Unknown contact, sending welcome message - requires org code to connect");
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

    return twimlResponse(NPC_RESPONSES.welcome());

  } catch (error) {
    console.error("Error processing webhook:", error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    // Return a friendly error message instead of silent failure
    return twimlResponse("Oops! Something went wrong. Please try again or contact support.");
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
} | null> {
  // Query directly to get all columns including new ones
  const { data, error } = await supabase
    .from("sms_sessions")
    .select("id, organization_id, group_id, status, is_first_message, pending_switch_org_id")
    .eq("phone_number", phone)
    .in("status", ["pending_group", "active", "pending_switch"])
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error getting active session:", error);
    return null;
  }
  if (!data) return null;

  return {
    session_id: data.id,
    organization_id: data.organization_id,
    group_id: data.group_id,
    status: data.status,
    is_first_message: data.is_first_message ?? true,
    pending_switch_org_id: data.pending_switch_org_id,
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
  sessionId: string,
  isFirstMessage: boolean = true
): Promise<void> {
  const { error } = await supabase
    .from("sms_sessions")
    .update({
      last_activity: new Date().toISOString(),
      is_first_message: isFirstMessage,
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
      ended_at: new Date().toISOString(),
      pending_switch_org_id: null,
    })
    .eq("phone_number", phone)
    .in("status", ["pending_group", "active", "pending_switch"]);

  if (error) {
    console.error("Error ending session:", error);
  }
}

async function tryParseCode(
  supabase: ReturnType<typeof createClient>,
  text: string
): Promise<{ type: "org" | "group" | "none"; orgId?: string; orgName?: string; orgCode?: string; groupId?: string; groupName?: string }> {
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

// Get org short_code by org ID
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
  session: { session_id: string; organization_id: string },
  orgCode: string | null
): Promise<{ message: string }> {
  const groups = await listOrgGroups(supabase, session.organization_id);
  const trimmedInput = input.trim();

  const num = parseInt(trimmedInput, 10);
  if (!isNaN(num) && num >= 1 && num <= groups.length) {
    const selected = groups[num - 1];
    await updateSessionGroup(supabase, session.session_id, selected.group_id);
    return { message: NPC_RESPONSES.groupSelected(selected.name, orgCode || "") };
  }

  const lowerInput = trimmedInput.toLowerCase();
  const matchingGroup = groups.find(g => g.code?.toLowerCase() === lowerInput);
  if (matchingGroup) {
    await updateSessionGroup(supabase, session.session_id, matchingGroup.group_id);
    return { message: NPC_RESPONSES.groupSelected(matchingGroup.name, orgCode || "") };
  }

  return { message: NPC_RESPONSES.invalidSelection(orgCode || undefined) };
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

    // Analytics log
    console.log("SMS_EVENT", JSON.stringify({
      event: "SMS_SWITCH_COMMAND",
      org_id: result.orgId,
      org_name: result.orgName,
      phone_last4: phone.slice(-4),
      timestamp: new Date().toISOString(),
    }));

    return { message: NPC_RESPONSES.switched(result.orgName!, result.orgCode || code) };
  }

  return { message: NPC_RESPONSES.invalidCode() };
}

async function listGroups(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{ message: string }> {
  const session = await getActiveSession(supabase, phone);
  if (!session) {
    return { message: "You're not connected to a ministry. Text a ministry code to connect!" };
  }

  const orgCode = await getOrgCode(supabase, session.organization_id);
  const groups = await listOrgGroups(supabase, session.organization_id);
  if (groups.length === 0) {
    const msg = "No groups available in this ministry.";
    return { message: orgCode ? `${msg}\n\n#${orgCode.toUpperCase()}` : msg };
  }

  const list = groups.map((g, i) => `${i + 1}. ${g.name}${g.code ? ` (${g.code.toUpperCase()})` : ''}`).join('\n');
  const msg = `Available groups:\n${list}\n\nText SWITCH [code] to change groups.`;
  return { message: orgCode ? `${msg}\n\n#${orgCode.toUpperCase()}` : msg };
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
  // Store with both profile_id and student_id (same value since IDs are preserved)
  const { error } = await supabase.from("sms_messages").insert({
    profile_id: msg.studentId, // New: profile_id (same as student_id during migration)
    student_id: msg.studentId, // Backward compatibility
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
      has_profile: !!msg.studentId,
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
