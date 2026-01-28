"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Sprout, Mail, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function AuthForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });

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
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
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

    const supabase = createClient();

    try {
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
        // Redirect to setup which will route to user's org
        router.push("/setup");
      }
    } catch {
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
        <CardTitle>Admin Sign In</CardTitle>
        <CardDescription>
          Enter your email to receive a 6-digit code
        </CardDescription>
      </CardHeader>
      <CardContent>
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
              autoFocus
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send One-Time Password"}
          </Button>
        </form>

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
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
          <Sprout className="h-10 w-10 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Seedling Insights</h1>
        <p className="text-muted-foreground mt-2">Leader Portal</p>
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
