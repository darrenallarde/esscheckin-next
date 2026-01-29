"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, Users } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

interface InvitationDetails {
  email: string;
  organizationName: string;
  role: string;
}

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);

  // Check for invite token and fetch invitation details
  useEffect(() => {
    const inviteToken = searchParams.get("invite");
    if (inviteToken) {
      setLoadingInvite(true);
      const fetchInvitation = async () => {
        try {
          const supabase = createClient();
          const { data, error } = await supabase.rpc("get_invitation_by_token", { p_token: inviteToken });
          if (!error && data && data.length > 0) {
            const inv = data[0];
            setInvitation({
              email: inv.email,
              organizationName: inv.organization_name,
              role: inv.role,
            });
            setEmail(inv.email);
          }
        } finally {
          setLoadingInvite(false);
        }
      };
      fetchInvitation();
    }
  }, [searchParams]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // DEBUG: Alert-based debugging for iPad Safari (toasts may not work)
    alert(`[1] Starting OTP for: ${email}`);

    try {
      const supabase = createClient();
      alert("[2] Supabase client created");

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      alert(`[3] OTP response: ${error ? error.message : "SUCCESS"}`);

      if (error) {
        toast({
          title: "Unable to send code",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setEmailSent(true);
        toast({
          title: "Check your email!",
          description: "We've sent you a 6-digit code to access the dashboard.",
        });
      }
    } catch (err) {
      console.error("OTP send error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`[CATCH] Exception: ${errorMessage}`);
      toast({
        title: "Caught exception",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      alert("[4] Finally block - done");
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit code from your email.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: "email",
      });

      if (error) {
        toast({
          title: "Verification failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success!",
          description: "You're now logged in.",
        });

        // Accept any pending invitations for this email
        const { data: { user } } = await supabase.auth.getUser();
        console.log("User after verify:", user?.id, user?.email);

        if (user && user.email) {
          // Accept invitations
          const { error: acceptError } = await supabase.rpc("accept_pending_invitations", {
            p_user_id: user.id,
            p_user_email: user.email,
          });
          console.log("Accept invitations result:", acceptError ? acceptError.message : "success");

          // Get user's organizations
          const { data: orgs, error: orgsError } = await supabase.rpc("get_user_organizations", {
            p_user_id: user.id,
          });
          console.log("User orgs:", orgs, orgsError);

          if (orgs && orgs.length > 0) {
            // Redirect to their first org's dashboard
            router.push(`/${orgs[0].organization_slug}/dashboard`);
            return;
          }
        }

        // Fallback to setup if no orgs found
        router.push("/setup");
      }
    } catch (err) {
      console.error("OTP verify error:", err);
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Code entry screen
  if (emailSent) {
    return (
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle>Enter Your Code</CardTitle>
          <CardDescription>
            We sent a 6-digit code to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Verification Code</label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-widest font-mono"
              disabled={isLoading}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && verificationCode.length === 6) {
                  handleVerifyCode();
                }
              }}
            />
          </div>

          <Button
            onClick={handleVerifyCode}
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full"
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            The code expires in 1 hour.
          </p>

          <Button
            onClick={() => {
              setEmailSent(false);
              setVerificationCode("");
            }}
            variant="outline"
            className="w-full"
            disabled={isLoading}
          >
            Use a Different Email
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Email entry screen
  return (
    <Card className="w-full max-w-md shadow-card">
      <CardHeader className="text-center">
        {invitation ? (
          <>
            <div className="flex justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle>Join {invitation.organizationName}</CardTitle>
            <CardDescription>
              You&apos;ve been invited to join as {invitation.role === "admin" ? "an admin" : `a ${invitation.role}`}
            </CardDescription>
          </>
        ) : (
          <>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your email to receive a 6-digit code
            </CardDescription>
          </>
        )}
      </CardHeader>
      <CardContent>
        {loadingInvite ? (
          <div className="text-center py-4 text-muted-foreground">
            Loading invitation details...
          </div>
        ) : (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus={!invitation}
                disabled={isLoading || !!invitation}
              />
              {invitation && (
                <p className="text-xs text-muted-foreground">
                  This invitation was sent to {invitation.email}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : invitation ? "Accept Invitation" : "Send One-Time Password"}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Button onClick={() => router.push("/")} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthPage() {
  return (
    <div className="min-h-screen bg-gradient-background flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center mb-8">
        <Image
          src="/logo.png"
          alt="Sheepdoggo"
          width={280}
          height={80}
          className="mb-2"
          priority
        />
        <p className="text-muted-foreground">Leader Portal</p>
      </div>

      <Suspense
        fallback={
          <Card className="w-full max-w-md shadow-card">
            <CardHeader className="text-center">
              <CardTitle>Loading...</CardTitle>
            </CardHeader>
          </Card>
        }
      >
        <AuthForm />
      </Suspense>
    </div>
  );
}
