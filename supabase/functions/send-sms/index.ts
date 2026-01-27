import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
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

    const { to, body, studentId } = await req.json();

    if (!to || !body) {
      throw new Error("Missing required fields: to, body");
    }

    // Clean the phone number - ensure it has +1 prefix
    let cleanTo = to.replace(/[^0-9]/g, "");
    if (cleanTo.length === 10) {
      cleanTo = "+1" + cleanTo;
    } else if (cleanTo.length === 11 && cleanTo.startsWith("1")) {
      cleanTo = "+" + cleanTo;
    } else if (!cleanTo.startsWith("+")) {
      cleanTo = "+" + cleanTo;
    }

    // Send SMS via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: cleanTo,
        From: TWILIO_PHONE_NUMBER,
        Body: body,
      }),
    });

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      console.error("Twilio error:", twilioData);
      throw new Error(twilioData.message || "Failed to send SMS");
    }

    // Store the message in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user ID from auth header if present
    const authHeader = req.headers.get("Authorization");
    let sentBy = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      sentBy = user?.id;
    }

    const { error: dbError } = await supabase
      .from("sms_messages")
      .insert({
        student_id: studentId || null,
        direction: "outbound",
        body: body,
        from_number: twilioData.from || TWILIO_PHONE_NUMBER,
        to_number: cleanTo,
        twilio_sid: twilioData.sid,
        status: twilioData.status,
        sent_by: sentBy,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      // Don't throw - SMS was sent successfully, just logging failed
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageSid: twilioData.sid,
        status: twilioData.status,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
