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

  const { phone, code } = body;

  if (!phone || !code) {
    return NextResponse.json(
      { success: false, error: "Phone and code are required" },
      { status: 400 }
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
      { success: false, error: "No valid code found. Please request a new one." },
      { status: 400 }
    );
  }

  // Check attempts
  if (otpRecord.attempts >= 5) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please request a new code." },
      { status: 429 }
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
      { status: 400 }
    );
  }

  // Mark as verified
  await supabase
    .from("phone_otp_codes")
    .update({ verified: true })
    .eq("id", otpRecord.id);

  // Find or create auth user with synthetic email
  const digits = phone.replace(/\D/g, "");
  const syntheticEmail = `${digits}@phone.sheepdoggo.app`;

  // Check if user already exists
  const { data: existingUsers } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  let userId: string | null = null;

  // Search by email (listUsers doesn't filter, so search manually)
  const { data: userByEmail } = await supabase
    .from("auth.users")
    .select("id")
    .eq("email", syntheticEmail)
    .limit(1);

  // Alternative: use admin API to find by email
  if (existingUsers) {
    const found = existingUsers.users.find(u => u.email === syntheticEmail);
    if (found) {
      userId = found.id;
    }
  }

  if (!userId) {
    // Try to find by iterating (admin.listUsers doesn't support email filter well)
    // Instead, just try to create and handle duplicate error
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      phone,
      phone_confirm: true,
    });

    if (createError) {
      // User likely already exists — try to generate link anyway
      if (createError.message.includes("already been registered") || createError.message.includes("duplicate")) {
        // Find user by generating a magic link (which requires existing user)
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: syntheticEmail,
        });
        if (linkError) {
          return NextResponse.json(
            { success: false, error: "Failed to authenticate. Please try email sign-in." },
            { status: 500 }
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
        { status: 500 }
      );
    }

    userId = newUser.user.id;
  }

  // Generate magic link for session
  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: syntheticEmail,
  });

  if (linkError) {
    return NextResponse.json(
      { success: false, error: "Failed to create session" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    token_hash: linkData.properties.hashed_token,
    email: syntheticEmail,
  });
}
