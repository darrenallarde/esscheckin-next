"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, UserCircle, Check, X, Loader2 } from "lucide-react";
import type { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";

interface UsernameSignUpFlowProps {
  auth: ReturnType<typeof useDevotionalAuth>;
  orgId: string;
  orgSlug: string;
  onSuccess: (profileId: string, firstName: string) => void;
  onBack: () => void;
}

export function UsernameSignUpFlow({ auth, orgId, orgSlug, onSuccess, onBack }: UsernameSignUpFlowProps) {
  // Step 1: Identify
  const [identifier, setIdentifier] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [step, setStep] = useState<"identify" | "credentials">("identify");

  // Step 2: Credentials
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Live username validation
  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const available = await auth.checkUsername(orgId, username);
      setUsernameAvailable(available);
      setCheckingUsername(false);
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, orgId, auth]);

  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    auth.clearError();
    const result = await auth.findProfileForSignup(orgId, identifier.trim());
    if (!result) return;
    if (!result.found) {
      auth.clearError();
      // Show error inline since clearError clears the hook error
      setIdentifier(identifier); // no-op to keep state
      return;
    }
    if (result.already_linked) {
      // Profile already has an account
      return;
    }
    if (result.profile_id && result.first_name) {
      setProfileId(result.profile_id);
      setFirstName(result.first_name);
      setStep("credentials");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    auth.clearError();

    if (password !== confirmPassword) return;
    if (!profileId) return;
    if (!usernameAvailable) return;

    const result = await auth.signUpWithUsername(orgId, orgSlug, profileId, username, password);
    if (result.success) {
      onSuccess(profileId, firstName);
    }
  };

  const passwordsMatch = password.length >= 6 && password === confirmPassword;

  if (step === "credentials") {
    return (
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="text-center">
          <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
            <UserCircle className="h-5 w-5 text-violet-600" />
          </div>
          <p className="text-sm font-medium text-stone-800">
            Hey {firstName}! Pick a username.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-sm">Username</Label>
          <div className="relative">
            <Input
              id="username"
              type="text"
              placeholder="sarah_j"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20))}
              disabled={auth.isLoading}
              autoFocus
              className="pr-8"
            />
            {username.length >= 3 && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {checkingUsername ? (
                  <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                ) : usernameAvailable ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : usernameAvailable === false ? (
                  <X className="h-4 w-4 text-red-500" />
                ) : null}
              </div>
            )}
          </div>
          {username.length > 0 && username.length < 3 && (
            <p className="text-xs text-stone-400">At least 3 characters</p>
          )}
          {usernameAvailable === false && (
            <p className="text-xs text-red-500">Username is taken</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={auth.isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-sm">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="Type password again"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={auth.isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && passwordsMatch && usernameAvailable) {
                handleSignUp(e);
              }
            }}
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="text-xs text-red-500">Passwords don&apos;t match</p>
          )}
        </div>

        {auth.error && (
          <p className="text-sm text-red-600 text-center">{auth.error}</p>
        )}

        <Button
          type="submit"
          disabled={auth.isLoading || !passwordsMatch || !usernameAvailable}
          className="w-full bg-stone-900 text-white"
        >
          {auth.isLoading ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating account...</>
          ) : (
            "Create Account"
          )}
        </Button>

        <Button
          type="button"
          onClick={() => { setStep("identify"); auth.clearError(); }}
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

  // Step 1: Identify
  return (
    <form onSubmit={handleIdentify} className="space-y-4">
      <div className="text-center">
        <div className="h-10 w-10 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-3">
          <UserCircle className="h-5 w-5 text-violet-600" />
        </div>
        <p className="text-sm text-stone-500">
          First, enter your phone number or email so we can find you
        </p>
      </div>

      <Input
        type="text"
        placeholder="Phone number or email"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        disabled={auth.isLoading}
        autoFocus
      />

      {auth.error && (
        <p className="text-sm text-red-600 text-center">{auth.error}</p>
      )}

      <Button
        type="submit"
        disabled={auth.isLoading || identifier.trim().length < 3}
        className="w-full bg-stone-900 text-white"
      >
        {auth.isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" />Looking up...</>
        ) : (
          "Find My Profile"
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
