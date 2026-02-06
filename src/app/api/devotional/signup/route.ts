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

  const { org_id, org_slug, profile_id, username, password } = body;

  if (!org_id || !org_slug || !profile_id || !username || !password) {
    return NextResponse.json(
      { success: false, error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Validate username format (alphanumeric, underscores, 3-20 chars)
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return NextResponse.json(
      { success: false, error: "Username must be 3-20 characters (letters, numbers, underscores)" },
      { status: 400 }
    );
  }

  // Validate password strength (min 6 chars)
  if (password.length < 6) {
    return NextResponse.json(
      { success: false, error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Check username availability
  const { data: available, error: checkError } = await supabase.rpc("check_username_available", {
    p_org_id: org_id,
    p_username: username,
  });

  if (checkError || !available) {
    return NextResponse.json(
      { success: false, error: "Username is already taken" },
      { status: 409 }
    );
  }

  // 2. Verify profile exists and isn't already linked
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, user_id")
    .eq("id", profile_id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { success: false, error: "Profile not found" },
      { status: 404 }
    );
  }

  if (profile.user_id) {
    return NextResponse.json(
      { success: false, error: "This profile is already linked to an account" },
      { status: 409 }
    );
  }

  // 3. Create auth user with synthetic email
  const syntheticEmail = `${username.toLowerCase()}@${org_slug}.sheepdoggo.app`;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  });

  if (authError) {
    return NextResponse.json(
      { success: false, error: authError.message },
      { status: 500 }
    );
  }

  const userId = authData.user.id;

  // 4. Link profile to auth user
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("id", profile_id);

  if (updateError) {
    // Clean up: delete auth user if profile link fails
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { success: false, error: "Failed to link profile" },
      { status: 500 }
    );
  }

  // 5. Insert username record
  const { error: usernameError } = await supabase
    .from("student_auth_usernames")
    .insert({
      profile_id,
      organization_id: org_id,
      username: username.toLowerCase(),
    });

  if (usernameError) {
    // Non-fatal — profile is already linked, username is just a mapping
    console.error("Failed to insert username record:", usernameError);
  }

  return NextResponse.json({
    success: true,
    user_id: userId,
  });
}
