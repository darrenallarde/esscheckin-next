"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sprout, Shield, Loader2, Mail } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkSetupStatus();
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
      // User already has an org, redirect to dashboard
      router.push("/dashboard");
      return;
    }

    // Check for any pending invitations for this user
    const { data: pendingInvites } = await supabase
      .from("organization_invitations")
      .select("id, organization_id")
      .eq("email", user.email)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString());

    if (pendingInvites && pendingInvites.length > 0) {
      // User has pending invitations - they should re-auth to trigger auto-accept
      // Or we could accept them here directly
      for (const invite of pendingInvites) {
        await supabase.from("organization_members").upsert({
          organization_id: invite.organization_id,
          user_id: user.id,
          role: "viewer", // Default role if somehow role wasn't set
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

      // Redirect to dashboard after accepting invites
      router.push("/dashboard");
      return;
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
        <h1 className="text-3xl font-bold text-foreground">ESS Check-in</h1>
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
            You need to be invited to an organization to use ESS Check-in.
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
                Once invited, you'll receive an email with instructions to join.
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
