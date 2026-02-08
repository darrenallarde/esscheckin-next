"use client";

import { useState } from "react";
import { Phone, Mail, UserCircle, Loader2, Gamepad2 } from "lucide-react";
import type { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";
import { PhoneOtpForm } from "@/components/devotional/PhoneOtpForm";
import { EmailOtpForm } from "@/components/devotional/EmailOtpForm";
import { UsernameSignUpFlow } from "@/components/devotional/UsernameSignUpFlow";

type AuthScreen = "gate" | "phone_otp" | "email_otp" | "username_signup";

interface GameAuthGateProps {
  auth: ReturnType<typeof useDevotionalAuth>;
  orgId: string;
  orgSlug: string;
  onSuccess: (profileId: string, firstName: string) => void;
}

export function GameAuthGate({
  auth,
  orgId,
  orgSlug,
  onSuccess,
}: GameAuthGateProps) {
  const [screen, setScreen] = useState<AuthScreen>("gate");

  const handleAuthSuccess = (profileId: string, name: string) => {
    onSuccess(profileId, name);
  };

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

  if (screen === "username_signup") {
    return (
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm animate-fade-in-up">
        <UsernameSignUpFlow
          auth={auth}
          orgId={orgId}
          orgSlug={orgSlug}
          onSuccess={handleAuthSuccess}
          onBack={() => {
            setScreen("gate");
            auth.clearError();
          }}
        />
      </section>
    );
  }

  // Default: Gate screen
  return (
    <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm animate-fade-in-up">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
            <Gamepad2 className="h-6 w-6 text-violet-600" />
          </div>
        </div>

        <div>
          <p className="text-lg font-semibold text-stone-900">
            Sign in to play
          </p>
          <p className="text-sm text-stone-500 mt-1">
            Your score will be saved to the leaderboard
          </p>
        </div>

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

          <button
            onClick={() => setScreen("username_signup")}
            className="w-full py-2.5 px-4 rounded-lg border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <UserCircle className="h-4 w-4" />
            Create username &amp; password
          </button>
        </div>
      </div>
    </section>
  );
}
