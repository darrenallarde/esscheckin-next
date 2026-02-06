import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { phone } = body;

  if (!phone || typeof phone !== "string") {
    return NextResponse.json(
      { success: false, error: "Phone number is required" },
      { status: 400 }
    );
  }

  // Validate phone format (E.164: +1XXXXXXXXXX)
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) {
    return NextResponse.json(
      { success: false, error: "Invalid phone number" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Rate limit: 1 code per 60s per phone
  const { data: recent } = await supabase
    .from("phone_otp_codes")
    .select("created_at")
    .eq("phone", phone)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (recent && recent.length > 0) {
    return NextResponse.json(
      { success: false, error: "Please wait 60 seconds before requesting another code" },
      { status: 429 }
    );
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in phone_otp_codes
  const { error: insertError } = await supabase
    .from("phone_otp_codes")
    .insert({
      phone,
      code,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });

  if (insertError) {
    console.error("Failed to store OTP:", insertError);
    return NextResponse.json(
      { success: false, error: "Failed to generate code" },
      { status: 500 }
    );
  }

  // Send SMS via edge function
  const { error: smsError } = await supabase.functions.invoke("send-otp-sms", {
    body: {
      to: phone,
      message: `Your verification code is ${code}. It expires in 10 minutes.`,
    },
  });

  if (smsError) {
    console.error("Failed to send OTP SMS:", smsError);
    return NextResponse.json(
      { success: false, error: "Failed to send code. Please try again." },
      { status: 500 }
    );
  }

  // Clean up expired codes (non-blocking best effort)
  supabase
    .from("phone_otp_codes")
    .delete()
    .lt("expires_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
    .then(() => {});

  return NextResponse.json({ success: true });
}
