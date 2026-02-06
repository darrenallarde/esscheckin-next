"use client";

import { useState, useEffect } from "react";
import { BookHeart, PenLine, Phone, Mail, UserCircle, Loader2 } from "lucide-react";
import { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";
import { PhoneOtpForm } from "./PhoneOtpForm";
import { EmailOtpForm } from "./EmailOtpForm";
import { UsernameSignUpFlow } from "./UsernameSignUpFlow";
import { DevotionalEngagedView } from "./DevotionalEngagedView";

type AuthScreen = "gate" | "phone_otp" | "email_otp" | "username_signup";

interface DevotionalAuthGateProps {
  devotionalId: string;
  orgId: string;
  orgSlug: string;
}

export function DevotionalAuthGate({ devotionalId, orgId, orgSlug }: DevotionalAuthGateProps) {
  const auth = useDevotionalAuth();
  const [screen, setScreen] = useState<AuthScreen>("gate");
  const [authenticated, setAuthenticated] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const check = async () => {
      const session = await auth.checkSession();
      if (session) {
        setAuthenticated(true);
        // Try to get first name from profile (best effort)
        setFirstName("");
      }
      setCheckingSession(false);
    };
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthSuccess = (profileId: string, name: string) => {
    setFirstName(name);
    setAuthenticated(true);
  };

  const handleSignOut = async () => {
    await auth.signOut();
    setAuthenticated(false);
    setFirstName("");
    setScreen("gate");
  };

  // Loading state while checking session
  if (checkingSession) {
    return (
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-stone-400" />
        </div>
      </section>
    );
  }

  // Authenticated — show engagement view
  if (authenticated) {
    return (
      <DevotionalEngagedView
        devotionalId={devotionalId}
        firstName={firstName || "there"}
        onSignOut={handleSignOut}
      />
    );
  }

  // Auth form screens
  if (screen === "phone_otp") {
    return (
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
        <PhoneOtpForm
          auth={auth}
          onSuccess={handleAuthSuccess}
          onBack={() => { setScreen("gate"); auth.clearError(); }}
        />
      </section>
    );
  }

  if (screen === "email_otp") {
    return (
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
        <EmailOtpForm
          auth={auth}
          onSuccess={handleAuthSuccess}
          onBack={() => { setScreen("gate"); auth.clearError(); }}
        />
      </section>
    );
  }

  if (screen === "username_signup") {
    return (
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
        <UsernameSignUpFlow
          auth={auth}
          orgId={orgId}
          orgSlug={orgSlug}
          onSuccess={handleAuthSuccess}
          onBack={() => { setScreen("gate"); auth.clearError(); }}
        />
      </section>
    );
  }

  // Default: Gate screen — sign in prompt
  return (
    <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
      <div className="text-center space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          Want to engage deeper?
        </p>
        <div className="flex items-center justify-center gap-6 text-muted-foreground">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <PenLine className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-xs">Journal</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
              <BookHeart className="h-5 w-5 text-rose-600" />
            </div>
            <span className="text-xs">Pray</span>
          </div>
        </div>

        <p className="text-xs text-stone-400">
          Sign in to track your devotional journey
        </p>

        <div className="space-y-2">
          <button
            onClick={() => setScreen("phone_otp")}
            className="w-full py-3 px-4 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Sign in with phone
          </button>

          <button
            onClick={() => setScreen("email_otp")}
            className="w-full py-2.5 px-4 rounded-lg border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Sign in with email
          </button>

          <button
            onClick={() => setScreen("username_signup")}
            className="w-full py-2.5 px-4 rounded-lg border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
          >
            <UserCircle className="h-4 w-4" />
            Create username &amp; password
          </button>
        </div>
      </div>
    </section>
  );
}
