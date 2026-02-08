import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { phone, code } = body;

  if (!phone || !code) {
    return NextResponse.json(
      { success: false, error: "Phone and code are required" },
      { status: 400 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up latest code for this phone
  const { data: otpRecord, error: lookupError } = await supabase
    .from("phone_otp_codes")
    .select("*")
    .eq("phone", phone)
    .eq("verified", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (lookupError || !otpRecord) {
    return NextResponse.json(
      {
        success: false,
        error: "No valid code found. Please request a new one.",
      },
      { status: 400 },
    );
  }

  // Check attempts
  if (otpRecord.attempts >= 5) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many attempts. Please request a new code.",
      },
      { status: 429 },
    );
  }

  // Increment attempts
  await supabase
    .from("phone_otp_codes")
    .update({ attempts: otpRecord.attempts + 1 })
    .eq("id", otpRecord.id);

  // Compare code
  if (otpRecord.code !== code) {
    return NextResponse.json(
      { success: false, error: "Invalid code. Please try again." },
      { status: 400 },
    );
  }

  // Mark as verified
  await supabase
    .from("phone_otp_codes")
    .update({ verified: true })
    .eq("id", otpRecord.id);

  // --- Profile-first lookup: find existing profile by phone number ---
  const digits = phone.replace(/\D/g, "");
  let normalized: string;
  let rawDigits = digits;

  if (digits.length === 10) {
    normalized = "+1" + digits;
  } else if (digits.length === 11 && digits.startsWith("1")) {
    normalized = "+" + digits;
    rawDigits = digits.substring(1); // strip leading 1 for raw match
  } else if (phone.startsWith("+")) {
    normalized = "+" + digits;
  } else {
    normalized = digits;
  }

  // Query profiles matching any phone format (same logic as link_phone_to_profile RPC)
  const { data: matchingProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, user_id, phone_number")
    .or(
      `phone_number.eq.${normalized},phone_number.eq.${rawDigits},phone_number.eq.${phone}`,
    )
    .limit(1);

  const profile = matchingProfiles?.[0] ?? null;

  // Case A: Profile exists and already has a linked auth user
  if (profile?.user_id) {
    const { data: existingAuthUser, error: getUserError } =
      await supabase.auth.admin.getUserById(profile.user_id);

    if (getUserError || !existingAuthUser?.user) {
      return NextResponse.json(
        { success: false, error: "Failed to look up existing account" },
        { status: 500 },
      );
    }

    // Generate magic link for the EXISTING auth user's email
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: existingAuthUser.user.email!,
      });

    if (linkError) {
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      token_hash: linkData.properties.hashed_token,
      email: existingAuthUser.user.email,
      already_linked: true,
      profile_id: profile.id,
      first_name: profile.first_name,
    });
  }

  // Case B & C: No user_id on profile, or no profile at all
  // Create or find synthetic phone auth user
  const syntheticEmail = `${rawDigits}@phone.sheepdoggo.app`;

  const { error: createError } = await supabase.auth.admin.createUser({
    email: syntheticEmail,
    email_confirm: true,
    phone,
    phone_confirm: true,
  });

  if (createError) {
    // User already exists with this synthetic email — generate magic link directly
    if (
      createError.message.includes("already been registered") ||
      createError.message.includes("duplicate")
    ) {
      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: syntheticEmail,
        });

      if (linkError) {
        return NextResponse.json(
          {
            success: false,
            error: "Failed to authenticate. Please try email sign-in.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        token_hash: linkData.properties.hashed_token,
        email: syntheticEmail,
      });
    }

    return NextResponse.json(
      { success: false, error: createError.message },
      { status: 500 },
    );
  }

  // New synthetic user created — generate magic link
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: syntheticEmail,
    });

  if (linkError) {
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    token_hash: linkData.properties.hashed_token,
    email: syntheticEmail,
  });
}
