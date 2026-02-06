"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import type { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";

interface EmailOtpFormProps {
  auth: ReturnType<typeof useDevotionalAuth>;
  onSuccess: (profileId: string, firstName: string) => void;
  onBack: () => void;
}

export function EmailOtpForm({ auth, onSuccess, onBack }: EmailOtpFormProps) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    auth.clearError();
    const success = await auth.sendEmailOtp(email.trim());
    if (success) {
      setCodeSent(true);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    auth.clearError();
    const result = await auth.verifyEmailOtp(email.trim(), code);
    if (result?.success && result.profile_id && result.first_name) {
      onSuccess(result.profile_id, result.first_name);
    }
  };

  if (codeSent) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-stone-800">Enter the code sent to</p>
          <p className="text-sm text-stone-500">{email}</p>
        </div>

        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          className={`text-center text-2xl tracking-widest font-mono ${
            code.length === 6 ? "ring-2 ring-emerald-400 animate-glow-pulse" : ""
          } ${auth.error ? "animate-shake" : ""}`}
          disabled={auth.isLoading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.length === 6) handleVerify();
          }}
        />

        {auth.error && (
          <p className="text-sm text-red-600 text-center animate-fade-in-up">{auth.error}</p>
        )}

        <Button
          onClick={handleVerify}
          disabled={auth.isLoading || code.length !== 6}
          className="w-full bg-stone-900 text-white"
        >
          {auth.isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Verifying...</>
          ) : (
            "Verify Code"
          )}
        </Button>

        <Button
          onClick={() => { setCodeSent(false); setCode(""); auth.clearError(); }}
          variant="ghost"
          size="sm"
          className="w-full text-stone-500"
          disabled={auth.isLoading}
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <div className="text-center">
        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
          <Mail className="h-5 w-5 text-blue-600" />
        </div>
        <p className="text-sm text-stone-500">
          Enter the email address on your profile
        </p>
      </div>

      <Input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={auth.isLoading}
        autoFocus
      />

      {auth.error && (
        <p className="text-sm text-red-600 text-center">{auth.error}</p>
      )}

      <Button
        type="submit"
        disabled={auth.isLoading || !email.includes("@")}
        className="w-full bg-stone-900 text-white"
      >
        {auth.isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</>
        ) : (
          "Send Code"
        )}
      </Button>

      <Button
        type="button"
        onClick={onBack}
        variant="ghost"
        size="sm"
        className="w-full text-stone-500"
        disabled={auth.isLoading}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back
      </Button>
    </form>
  );
}
