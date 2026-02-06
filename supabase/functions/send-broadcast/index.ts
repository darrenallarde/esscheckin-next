import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit: 1 message per second for long codes (Twilio recommendation)
const DELAY_BETWEEN_MESSAGES_MS = 1000;

// Delay helper
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Clean phone number to E.164 format
function cleanPhoneNumber(phone: string): string {
  let cleanTo = phone.replace(/[^0-9]/g, "");
  if (cleanTo.length === 10) {
    cleanTo = "+1" + cleanTo;
  } else if (cleanTo.length === 11 && cleanTo.startsWith("1")) {
    cleanTo = "+" + cleanTo;
  } else if (!cleanTo.startsWith("+")) {
    cleanTo = "+" + cleanTo;
  }
  return cleanTo;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error("Missing Twilio configuration");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { broadcastId } = await req.json();

    if (!broadcastId) {
      throw new Error("Missing required field: broadcastId");
    }

    // Get broadcast details
    const { data: broadcast, error: broadcastError } = await supabase
      .from("sms_broadcasts")
      .select("*")
      .eq("id", broadcastId)
      .single();

    if (broadcastError || !broadcast) {
      throw new Error("Broadcast not found");
    }

    if (broadcast.status !== "draft") {
      throw new Error(`Broadcast already ${broadcast.status}`);
    }

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from("sms_broadcast_recipients")
      .select("id, phone_number, profile_id")
      .eq("broadcast_id", broadcastId)
      .eq("status", "pending");

    if (recipientsError) {
      throw new Error("Failed to fetch recipients");
    }

    if (!recipients || recipients.length === 0) {
      throw new Error("No recipients found for broadcast");
    }

    // Update broadcast status to sending
    await supabase
      .from("sms_broadcasts")
      .update({ status: "sending" })
      .eq("id", broadcastId);

    // Log broadcast start
    console.log("BROADCAST_EVENT", JSON.stringify({
      event: "BROADCAST_STARTED",
      broadcast_id: broadcastId,
      org_id: broadcast.organization_id,
      recipient_count: recipients.length,
      timestamp: new Date().toISOString(),
    }));

    let sentCount = 0;
    let failedCount = 0;

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    // Send messages with rate limiting
    for (const recipient of recipients) {
      try {
        const cleanTo = cleanPhoneNumber(recipient.phone_number);

        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            To: cleanTo,
            From: TWILIO_PHONE_NUMBER,
            Body: broadcast.message_body,
          }),
        });

        const twilioData = await twilioResponse.json();

        if (twilioResponse.ok) {
          // Update recipient status to sent
          await supabase
            .from("sms_broadcast_recipients")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              twilio_sid: twilioData.sid,
            })
            .eq("id", recipient.id);

          sentCount++;

          // Store in sms_messages for conversation history
          // This makes broadcasts visible in Messages inbox and enables find_recent_conversation
          try {
            await supabase.from("sms_messages").insert({
              profile_id: recipient.profile_id,
              student_id: recipient.profile_id,
              organization_id: broadcast.organization_id,
              direction: "outbound",
              body: broadcast.message_body,
              from_number: TWILIO_PHONE_NUMBER,
              to_number: cleanTo,
              twilio_sid: twilioData.sid,
              status: twilioData.status || "sent",
            });
          } catch (insertErr) {
            // Don't let a failed sms_messages insert break broadcast delivery
            console.error("Failed to store broadcast message in sms_messages:", {
              recipient_id: recipient.id,
              error: insertErr.message,
            });
          }
        } else {
          // Update recipient status to failed
          await supabase
            .from("sms_broadcast_recipients")
            .update({
              status: "failed",
              error_message: twilioData.message || "Unknown error",
            })
            .eq("id", recipient.id);

          failedCount++;

          console.error("Twilio error for recipient:", {
            recipient_id: recipient.id,
            phone_last4: cleanTo.slice(-4),
            error: twilioData.message,
          });
        }
      } catch (err) {
        // Update recipient status to failed
        await supabase
          .from("sms_broadcast_recipients")
          .update({
            status: "failed",
            error_message: err.message || "Network error",
          })
          .eq("id", recipient.id);

        failedCount++;

        console.error("Error sending to recipient:", {
          recipient_id: recipient.id,
          error: err.message,
        });
      }

      // Rate limiting: wait between messages
      await delay(DELAY_BETWEEN_MESSAGES_MS);
    }

    // Update broadcast status to sent
    const finalStatus = failedCount === recipients.length ? "failed" : "sent";
    await supabase
      .from("sms_broadcasts")
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString(),
        sent_count: sentCount,
        failed_count: failedCount,
      })
      .eq("id", broadcastId);

    // Log broadcast completion
    console.log("BROADCAST_EVENT", JSON.stringify({
      event: "BROADCAST_COMPLETED",
      broadcast_id: broadcastId,
      org_id: broadcast.organization_id,
      sent_count: sentCount,
      failed_count: failedCount,
      final_status: finalStatus,
      timestamp: new Date().toISOString(),
    }));

    return new Response(
      JSON.stringify({
        success: true,
        broadcastId,
        sentCount,
        failedCount,
        status: finalStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Broadcast error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
