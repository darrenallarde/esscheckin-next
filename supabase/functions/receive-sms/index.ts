import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Twilio sends webhooks as form-urlencoded
    const formData = await req.formData();

    const from = formData.get("From") as string;
    const to = formData.get("To") as string;
    const body = formData.get("Body") as string;
    const messageSid = formData.get("MessageSid") as string;

    console.log("Received SMS:", { from, to, body: body?.substring(0, 50), messageSid });

    if (!from || !body) {
      console.error("Missing required fields from Twilio webhook");
      // Return 200 anyway so Twilio doesn't retry
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } }
      );
    }

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Try to find the student by phone number
    const { data: studentId } = await supabase
      .rpc("find_student_by_phone", { p_phone: from });

    const { error: dbError } = await supabase
      .from("sms_messages")
      .insert({
        student_id: studentId || null,
        direction: "inbound",
        body: body,
        from_number: from,
        to_number: to,
        twilio_sid: messageSid,
        status: "received",
      });

    if (dbError) {
      console.error("Database error:", dbError);
    }

    // Return empty TwiML response (no auto-reply)
    // You could add an auto-reply here if needed:
    // <Response><Message>Thanks for your message!</Message></Response>
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Return 200 so Twilio doesn't keep retrying
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } }
    );
  }
});
