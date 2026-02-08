"use client";

import { useState, useEffect } from "react";
import { BookHeart, Phone, Mail, Loader2 } from "lucide-react";
import { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";
import { PhoneOtpForm } from "./PhoneOtpForm";
import { EmailOtpForm } from "./EmailOtpForm";
import { DevotionalEngagedView } from "./DevotionalEngagedView";

type AuthScreen = "gate" | "phone_otp" | "email_otp";

interface DevotionalAuthGateProps {
  devotionalId: string;
  orgId?: string;
}

export function DevotionalAuthGate({ devotionalId }: DevotionalAuthGateProps) {
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
        // Look up first name from profiles table
        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();
          const { data } = await supabase
            .from("profiles")
            .select("first_name")
            .eq("user_id", session.user.id)
            .single();
          if (data?.first_name) {
            setFirstName(data.first_name);
          }
        } catch {
          // Best effort — "there" fallback is fine
        }
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
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm animate-fade-in-up">
        <PhoneOtpForm
          auth={auth}
          onSuccess={handleAuthSuccess}
          onBack={() => {
            setScreen("gate");
            auth.clearError();
          }}
        />
      </section>
    );
  }

  if (screen === "email_otp") {
    return (
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm animate-fade-in-up">
        <EmailOtpForm
          auth={auth}
          onSuccess={handleAuthSuccess}
          onBack={() => {
            setScreen("gate");
            auth.clearError();
          }}
        />
      </section>
    );
  }

  // Default: Gate screen — sign in prompt
  return (
    <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm animate-fade-in-up">
      <div className="text-center space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          Share what&apos;s on your heart
        </p>
        <div className="flex items-center justify-center text-muted-foreground">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center">
              <BookHeart className="h-6 w-6 text-rose-600" />
            </div>
            <span className="text-xs">Prayer Request</span>
          </div>
        </div>

        <p className="text-xs text-stone-400">
          Sign in to track your devotional journey
        </p>

        <div className="space-y-2">
          <button
            onClick={() => setScreen("phone_otp")}
            className="w-full py-3 px-4 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Phone className="h-4 w-4" />
            Sign in with phone
          </button>

          <button
            onClick={() => setScreen("email_otp")}
            className="w-full py-2.5 px-4 rounded-lg border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Mail className="h-4 w-4" />
            Sign in with email
          </button>
        </div>
      </div>
    </section>
  );
}
