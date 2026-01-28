"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sprout, Shield, Loader2, Mail } from "lucide-react";
import { extractRouteFromPath } from "@/lib/navigation";

function SetupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkSetupStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkSetupStatus = async () => {
    const supabase = createClient();

    // Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    setUserEmail(user.email || null);

    // Check if user already has organization membership
    const { data: userOrgs } = await supabase.rpc("get_user_organizations", {
      p_user_id: user.id,
    });

    if (userOrgs && userOrgs.length > 0) {
      // User already has an org - redirect to their first org's dashboard
      const firstOrg = userOrgs[0];
      const orgSlug = firstOrg.organization_slug;

      // Check if there was a redirect param (e.g., from legacy path)
      const redirectPath = searchParams.get("redirect");
      if (redirectPath) {
        // Extract just the route part (e.g., /dashboard from /dashboard)
        const route = extractRouteFromPath(redirectPath) || "/dashboard";
        router.push(`/${orgSlug}${route}`);
      } else {
        router.push(`/${orgSlug}/dashboard`);
      }
      return;
    }

    // Check for any pending invitations for this user
    const { data: pendingInvites } = await supabase
      .from("organization_invitations")
      .select("id, organization_id, role")
      .eq("email", user.email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());

    if (pendingInvites && pendingInvites.length > 0) {
      // User has pending invitations - accept them
      for (const invite of pendingInvites) {
        await supabase.from("organization_members").upsert({
          organization_id: invite.organization_id,
          user_id: user.id,
          role: invite.role || "viewer",
          status: "active",
          accepted_at: new Date().toISOString(),
        }, {
          onConflict: "organization_id,user_id",
        });

        await supabase
          .from("organization_invitations")
          .update({ accepted_at: new Date().toISOString() })
          .eq("id", invite.id);
      }

      // Re-fetch orgs after accepting invites
      const { data: updatedOrgs } = await supabase.rpc("get_user_organizations", {
        p_user_id: user.id,
      });

      if (updatedOrgs && updatedOrgs.length > 0) {
        const firstOrg = updatedOrgs[0];
        router.push(`/${firstOrg.organization_slug}/dashboard`);
        return;
      }
    }

    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background flex flex-col items-center justify-center p-4">
      {/* Logo and Title */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
          <Sprout className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Seedling Insights</h1>
        <p className="text-muted-foreground mt-2">Organization Access</p>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
          </div>
          <CardTitle>No Organization Access</CardTitle>
          <CardDescription>
            You need to be invited to an organization to use Seedling Insights.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {userEmail && (
            <p className="text-sm text-center text-muted-foreground">
              Signed in as <strong>{userEmail}</strong>
            </p>
          )}

          <div className="bg-muted/50 rounded-lg p-4 text-center space-y-3">
            <Mail className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Need access?</p>
              <p>
                Contact your organization administrator and ask them to invite
                you from the Team settings page.
              </p>
              <p className="mt-2">
                Once invited, you&apos;ll receive an email with instructions to join.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push("/auth")}
            >
              Sign in with a different account
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                router.push("/auth");
              }}
            >
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SetupPageContent />
    </Suspense>
  );
}
