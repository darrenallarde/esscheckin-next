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

      if (user && user.email) {
        // Auto-accept any pending invitations for this user's email
        // Uses SECURITY DEFINER RPC to bypass RLS since new users have no permissions
        await supabase.rpc("accept_pending_invitations", {
          p_user_id: user.id,
          p_user_email: user.email,
        });

        // Check if user is a member of any organization
        const { data: orgs } = await supabase.rpc("get_user_organizations", {
          p_user_id: user.id,
        });

        // If user has no organization membership, redirect to setup
        if (!orgs || orgs.length === 0) {
          return NextResponse.redirect(`${origin}/setup`);
        }

        // Redirect to the first org's dashboard (or use next param if it's org-specific)
        const firstOrg = orgs[0];
        const redirectPath = next.startsWith("/") && !next.includes("/dashboard")
          ? next
          : `/${firstOrg.organization_slug}/dashboard`;
        return NextResponse.redirect(`${origin}${redirectPath}`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return to auth page with error
  return NextResponse.redirect(`${origin}/auth?error=Could not authenticate`);
}
