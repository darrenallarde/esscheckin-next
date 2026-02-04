"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, ArrowLeft, Users } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useAuthTracking } from "@/lib/amplitude/hooks";

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
  const [displayName, setDisplayName] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Amplitude tracking
  const { trackAuthPageViewed, trackOtpRequested, trackOtpVerified } = useAuthTracking();
  const hasTrackedPageView = useRef(false);

  // Track page view on mount
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      const hasInviteToken = !!searchParams.get("invite");
      trackAuthPageViewed({ has_invite_token: hasInviteToken });
      hasTrackedPageView.current = true;
    }
  }, [searchParams, trackAuthPageViewed]);

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
    setStatusMessage(null);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setStatusMessage({ type: 'error', text: error.message });
        toast({
          title: "Unable to send code",
          description: error.message,
          variant: "destructive",
        });
      } else {
        // Track OTP requested
        trackOtpRequested({ is_invite_flow: !!invitation });

        setEmailSent(true);
        toast({
          title: "Check your email!",
          description: "We've sent you a 6-digit code to access the dashboard.",
        });
      }
    } catch (err) {
      console.error("OTP send error:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: 'error', text: errorMessage });
      toast({
        title: "Caught exception",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
        // Track OTP verified
        trackOtpVerified({ is_invite_flow: !!invitation });

        toast({
          title: "Success!",
          description: "You're now logged in.",
        });

        // Accept any pending invitations for this email
        const { data: { user } } = await supabase.auth.getUser();
        console.log("User after verify:", user?.id, user?.email);

        if (user && user.email) {
          // Accept invitations with display name if provided
          const { error: acceptError } = await supabase.rpc("accept_pending_invitations", {
            p_user_id: user.id,
            p_user_email: user.email,
            p_display_name: displayName.trim() || null,
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
              <Label htmlFor="email">Email Address</Label>
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

            {/* Display Name field - shown only during invite acceptance */}
            {invitation && (
              <div className="space-y-2">
                <Label htmlFor="displayName">Your Name</Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Pastor Mike"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This is how you&apos;ll appear when sending messages to students.
                </p>
              </div>
            )}

            {/* Inline status message for Safari compatibility (toasts may not show) */}
            {statusMessage && (
              <div className={`p-3 rounded-md text-sm ${
                statusMessage.type === 'error'
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-green-50 text-green-700 border border-green-200'
              }`}>
                {statusMessage.text}
              </div>
            )}

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
