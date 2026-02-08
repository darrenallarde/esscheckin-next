"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, Gamepad2 } from "lucide-react";
import type { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";
import { PhoneOtpForm } from "@/components/devotional/PhoneOtpForm";
import { EmailOtpForm } from "@/components/devotional/EmailOtpForm";
import { tapScale } from "@/lib/game/timing";

type AuthScreen = "gate" | "phone_otp" | "email_otp";

interface GameAuthGateProps {
  auth: ReturnType<typeof useDevotionalAuth>;
  orgId: string;
  onSuccess: (profileId: string, firstName: string) => void;
}

export function GameAuthGate({ auth, orgId, onSuccess }: GameAuthGateProps) {
  const [screen, setScreen] = useState<AuthScreen>("gate");

  const handleAuthSuccess = (profileId: string, name: string) => {
    onSuccess(profileId, name);
  };

  // Auth form screens — keep light-themed forms, wrap in dark container
  if (screen === "phone_otp") {
    return (
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
        <PhoneOtpForm
          auth={auth}
          orgId={orgId}
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
      <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
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

  // Default: Gate screen — dark themed
  return (
    <section
      className="rounded-xl p-6 border"
      style={{
        background: "var(--game-surface)",
        borderColor: "var(--game-border)",
      }}
    >
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div
            className="h-12 w-12 rounded-full flex items-center justify-center"
            style={{ background: "hsla(258, 90%, 66%, 0.15)" }}
          >
            <Gamepad2
              className="h-6 w-6"
              style={{ color: "var(--game-accent)" }}
            />
          </div>
        </div>

        <div>
          <p className="text-lg font-semibold">Sign in to play</p>
          <p className="text-sm mt-1" style={{ color: "var(--game-muted)" }}>
            Your score will be saved to the leaderboard
          </p>
        </div>

        <div className="space-y-2">
          <motion.button
            onClick={() => setScreen("phone_otp")}
            whileTap={tapScale}
            className="w-full py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              background: "var(--game-accent)",
              color: "#fff",
            }}
          >
            <Phone className="h-4 w-4" />
            Sign in with phone
          </motion.button>

          <motion.button
            onClick={() => setScreen("email_otp")}
            whileTap={tapScale}
            className="w-full py-2.5 px-4 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2"
            style={{
              borderColor: "var(--game-border)",
              color: "var(--game-text)",
            }}
          >
            <Mail className="h-4 w-4" />
            Sign in with email
          </motion.button>
        </div>
      </div>
    </section>
  );
}
