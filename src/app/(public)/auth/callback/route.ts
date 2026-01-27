import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method was called from a Server Component.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // Auto-accept any pending invitations for this user's email
        const { data: invitations } = await supabase
          .from("organization_invitations")
          .select("*")
          .eq("email", user.email)
          .is("accepted_at", null)
          .gt("expires_at", new Date().toISOString());

        // Accept each invitation by adding user to organization
        for (const invite of invitations || []) {
          // Add user to organization_members
          await supabase.from("organization_members").upsert({
            organization_id: invite.organization_id,
            user_id: user.id,
            role: invite.role,
            status: "active",
            invited_by: invite.invited_by,
            accepted_at: new Date().toISOString(),
          }, {
            onConflict: "organization_id,user_id",
          });

          // Mark invitation as accepted
          await supabase
            .from("organization_invitations")
            .update({ accepted_at: new Date().toISOString() })
            .eq("id", invite.id);
        }

        // Check if user is a member of any organization
        const { data: orgs } = await supabase.rpc("get_user_organizations", {
          p_user_id: user.id,
        });

        // If user has no organization membership, redirect to setup
        if (!orgs || orgs.length === 0) {
          return NextResponse.redirect(`${origin}/setup`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=Could not authenticate`);
}
