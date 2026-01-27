"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sprout, Shield, Loader2 } from "lucide-react";

// Default organization ID from the SQL migration
const DEFAULT_ORG_ID = "a0000000-0000-0000-0000-000000000001";

export default function SetupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasExistingOwner, setHasExistingOwner] = useState(false);

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

    // Check if the default org has any owners
    const { data: members, error: membersError } = await supabase
      .from("organization_members")
      .select("id, role")
      .eq("organization_id", DEFAULT_ORG_ID)
      .eq("role", "owner")
      .eq("status", "active");

    if (membersError) {
      console.error("Error checking org members:", membersError);
      setError("Failed to check organization status. The organization tables may not exist yet.");
      setIsLoading(false);
      return;
    }

    setHasExistingOwner(members && members.length > 0);
    setIsLoading(false);
  };

  const claimOwnership = async () => {
    setIsClaiming(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setIsClaiming(false);
      return;
    }

    try {
      // Add user as owner of the default organization
      const { error: insertError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: DEFAULT_ORG_ID,
          user_id: user.id,
          role: "owner",
          status: "active",
          accepted_at: new Date().toISOString(),
        });

      if (insertError) {
        throw insertError;
      }

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      console.error("Error claiming ownership:", err);
      setError(err instanceof Error ? err.message : "Failed to set up organization");
      setIsClaiming(false);
    }
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
        <p className="text-muted-foreground mt-2">Organization Setup</p>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <Shield className="h-6 w-6 text-secondary" />
            </div>
          </div>
          <CardTitle>
            {hasExistingOwner ? "Request Access" : "Claim Ownership"}
          </CardTitle>
          <CardDescription>
            {hasExistingOwner
              ? "This organization already has an owner. Contact them to get access."
              : "You're the first user! Set yourself up as the organization owner."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {userEmail && (
            <p className="text-sm text-center text-muted-foreground">
              Signed in as <strong>{userEmail}</strong>
            </p>
          )}

          {hasExistingOwner ? (
            <div className="text-center text-sm text-muted-foreground">
              <p>The organization owner needs to invite you from the Team settings.</p>
              <Button
                variant="outline"
                onClick={() => router.push("/auth")}
                className="mt-4"
              >
                Back to Sign In
              </Button>
            </div>
          ) : (
            <Button
              onClick={claimOwnership}
              disabled={isClaiming}
              className="w-full"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Become Organization Owner"
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
