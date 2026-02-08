"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Loader2, UserCircle } from "lucide-react";
import type { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";

interface PhoneOtpFormProps {
  auth: ReturnType<typeof useDevotionalAuth>;
  orgId?: string;
  onSuccess: (profileId: string, firstName: string) => void;
  onBack: () => void;
}

export function PhoneOtpForm({
  auth,
  orgId,
  onSuccess,
  onBack,
}: PhoneOtpFormProps) {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [needsName, setNeedsName] = useState(false);
  const [firstName, setFirstName] = useState("");

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const getRawPhone = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    return `+${digits}`;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    auth.clearError();
    const rawPhone = getRawPhone();
    const success = await auth.sendPhoneOtp(rawPhone);
    if (success) {
      setCodeSent(true);
    }
  };

  // React state updates (setError) don't take effect until next render,
  // so we watch auth.error via useEffect instead of checking it synchronously
  useEffect(() => {
    if (
      auth.error?.toLowerCase().includes("no profile found") &&
      orgId &&
      !needsName
    ) {
      auth.clearError();
      setNeedsName(true);
    }
  }, [auth.error, orgId, needsName, auth]);

  const handleVerify = async () => {
    if (code.length !== 6) return;
    auth.clearError();
    const rawPhone = getRawPhone();
    const result = await auth.verifyPhoneOtp(rawPhone, code);
    if (result?.success && result.profile_id && result.first_name) {
      onSuccess(result.profile_id, result.first_name);
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !orgId) return;
    auth.clearError();
    const rawPhone = getRawPhone();
    const result = await auth.createPhoneProfile(
      rawPhone,
      orgId,
      firstName.trim(),
    );
    if (result?.success && result.profile_id) {
      onSuccess(result.profile_id, result.first_name || firstName.trim());
    }
  };

  // Step 3: Name input for new players
  if (needsName) {
    return (
      <form onSubmit={handleCreateProfile} className="space-y-4">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
            <UserCircle className="h-5 w-5 text-violet-600" />
          </div>
          <p className="text-sm font-medium text-stone-800">
            Welcome! What&apos;s your first name?
          </p>
          <p className="text-xs text-stone-400 mt-1">
            Phone verified — just need your name to get started
          </p>
        </div>

        <Input
          type="text"
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          disabled={auth.isLoading}
          autoFocus
        />

        {auth.error && (
          <p className="text-sm text-red-600 text-center">{auth.error}</p>
        )}

        <Button
          type="submit"
          disabled={auth.isLoading || !firstName.trim()}
          className="w-full bg-stone-900 text-white"
        >
          {auth.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Creating...
            </>
          ) : (
            "Let's Go!"
          )}
        </Button>
      </form>
    );
  }

  // Step 2: Code entry
  if (codeSent) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
            <Phone className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-stone-800">
            Enter the code sent to
          </p>
          <p className="text-sm text-stone-500">{phone}</p>
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
            code.length === 6
              ? "ring-2 ring-emerald-400 animate-glow-pulse"
              : ""
          } ${auth.error ? "animate-shake" : ""}`}
          disabled={auth.isLoading}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && code.length === 6) handleVerify();
          }}
        />

        {auth.error && (
          <p className="text-sm text-red-600 text-center animate-fade-in-up">
            {auth.error}
          </p>
        )}

        <Button
          onClick={handleVerify}
          disabled={auth.isLoading || code.length !== 6}
          className="w-full bg-stone-900 text-white"
        >
          {auth.isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Verifying...
            </>
          ) : (
            "Verify Code"
          )}
        </Button>

        <Button
          onClick={() => {
            setCodeSent(false);
            setCode("");
            auth.clearError();
          }}
          variant="ghost"
          size="sm"
          className="w-full text-stone-500"
          disabled={auth.isLoading}
        >
          Use a different number
        </Button>
      </div>
    );
  }

  // Step 1: Phone input
  return (
    <form onSubmit={handleSendCode} className="space-y-4">
      <div className="text-center">
        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <Phone className="h-5 w-5 text-emerald-600" />
        </div>
        <p className="text-sm text-stone-500">
          Enter the phone number on your profile
        </p>
      </div>

      <Input
        type="tel"
        placeholder="(555) 123-4567"
        value={phone}
        onChange={(e) => setPhone(formatPhone(e.target.value))}
        disabled={auth.isLoading}
        autoFocus
      />

      {auth.error && (
        <p className="text-sm text-red-600 text-center">{auth.error}</p>
      )}

      <Button
        type="submit"
        disabled={auth.isLoading || phone.replace(/\D/g, "").length < 10}
        className="w-full bg-stone-900 text-white"
      >
        {auth.isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Sending...
          </>
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
