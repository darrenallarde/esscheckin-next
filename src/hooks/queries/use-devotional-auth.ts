"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";

export type AuthMethod = "phone_otp" | "email_otp" | "username_password";

interface LinkResult {
  success: boolean;
  profile_id?: string;
  first_name?: string;
  already_linked?: boolean;
  error?: string;
}

interface FindProfileResult {
  found: boolean;
  already_linked?: boolean;
  profile_id?: string;
  first_name?: string;
}

interface UsernameSignupResult {
  success: boolean;
  error?: string;
}

export function useDevotionalAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Phone OTP: Send code via custom API (bypasses Supabase Auth phone provider)
  const sendPhoneOtp = useCallback(async (phone: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/devotional/send-phone-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setError(result.error || "Failed to send code");
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Phone OTP: Verify code via custom API + establish session + link profile
  const verifyPhoneOtp = useCallback(
    async (phone: string, code: string): Promise<LinkResult | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Step 1: Verify OTP code via our API (returns token_hash + email)
        const response = await fetch("/api/devotional/verify-phone-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          setError(result.error || "Verification failed");
          return null;
        }

        // Step 2: Establish client session using the magic link token
        const supabase = createClient();
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "email",
        });
        if (verifyError) {
          setError(verifyError.message);
          return null;
        }
        if (data.session) {
          setSession(data.session);
        }

        // Step 3: Link phone to profile (skip if API already resolved it)
        if (result.already_linked) {
          return {
            success: true,
            profile_id: result.profile_id,
            first_name: result.first_name,
            already_linked: true,
          };
        }

        const { data: linkData, error: linkError } = await supabase.rpc(
          "link_phone_to_profile",
          {
            p_phone: phone,
          },
        );
        if (linkError) {
          setError(linkError.message);
          return null;
        }
        const linkResult = linkData as unknown as LinkResult;
        if (!linkResult.success) {
          setError(linkResult.error || "Failed to link profile");
          return null;
        }
        return linkResult;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Email OTP: Send code
  const sendEmailOtp = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (otpError) {
        setError(otpError.message);
        return false;
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Email OTP: Verify code + link profile
  const verifyEmailOtp = useCallback(
    async (email: string, code: string): Promise<LinkResult | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email,
          token: code,
          type: "email",
        });
        if (verifyError) {
          setError(verifyError.message);
          return null;
        }
        if (data.session) {
          setSession(data.session);
        }

        // Link profile
        const { data: linkData, error: linkError } = await supabase.rpc(
          "link_email_to_profile",
          {
            p_email: email,
          },
        );
        if (linkError) {
          setError(linkError.message);
          return null;
        }
        const result = linkData as unknown as LinkResult;
        if (!result.success) {
          setError(result.error || "Failed to link profile");
          return null;
        }
        return result;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Verification failed");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Username/password: Find profile by identifier
  const findProfileForSignup = useCallback(
    async (
      orgId: string,
      identifier: string,
    ): Promise<FindProfileResult | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: rpcError } = await supabase.rpc(
          "find_profile_for_signup",
          {
            p_org_id: orgId,
            p_identifier: identifier,
          },
        );
        if (rpcError) {
          setError(rpcError.message);
          return null;
        }
        return data as unknown as FindProfileResult;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to look up profile",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Username/password: Check username availability
  const checkUsername = useCallback(
    async (orgId: string, username: string): Promise<boolean> => {
      try {
        const supabase = createClient();
        const { data, error: rpcError } = await supabase.rpc(
          "check_username_available",
          {
            p_org_id: orgId,
            p_username: username,
          },
        );
        if (rpcError) return false;
        return data as boolean;
      } catch {
        return false;
      }
    },
    [],
  );

  // Username/password: Complete signup via API route
  const signUpWithUsername = useCallback(
    async (
      orgId: string,
      orgSlug: string,
      profileId: string,
      username: string,
      password: string,
    ): Promise<UsernameSignupResult> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/devotional/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            org_id: orgId,
            org_slug: orgSlug,
            profile_id: profileId,
            username,
            password,
          }),
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
          const errMsg = result.error || "Signup failed";
          setError(errMsg);
          return { success: false, error: errMsg };
        }

        // Sign in with the new credentials
        const supabase = createClient();
        const syntheticEmail = `${username.toLowerCase()}@${orgSlug}.sheepdoggo.app`;
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: syntheticEmail,
            password,
          });
        if (signInError) {
          setError(signInError.message);
          return { success: false, error: signInError.message };
        }
        if (data.session) {
          setSession(data.session);
        }
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Signup failed";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Phone: Create a new profile when link_phone_to_profile returns "no profile found"
  const createPhoneProfile = useCallback(
    async (
      phone: string,
      orgId: string,
      firstName: string,
    ): Promise<LinkResult | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: rpcError } = await supabase.rpc(
          "create_phone_profile",
          {
            p_phone: phone,
            p_org_id: orgId,
            p_first_name: firstName,
          },
        );
        if (rpcError) {
          setError(rpcError.message);
          return null;
        }
        const result = data as unknown as LinkResult;
        if (!result.success) {
          setError(result.error || "Failed to create profile");
          return null;
        }
        return result;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create profile",
        );
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Check for existing session
  const checkSession = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session: existing },
    } = await supabase.auth.getSession();
    if (existing) {
      setSession(existing);
    }
    return existing;
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  return {
    isLoading,
    error,
    session,
    clearError,
    sendPhoneOtp,
    verifyPhoneOtp,
    sendEmailOtp,
    verifyEmailOtp,
    findProfileForSignup,
    checkUsername,
    signUpWithUsername,
    createPhoneProfile,
    checkSession,
    signOut,
  };
}
