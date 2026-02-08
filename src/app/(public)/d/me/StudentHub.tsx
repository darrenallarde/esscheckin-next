"use client";

import { useState, useEffect } from "react";
import {
  Heart,
  BookOpen,
  UserCircle,
  Loader2,
  LogOut,
  Phone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";
import { PhoneOtpForm } from "@/components/devotional/PhoneOtpForm";
import { EmailOtpForm } from "@/components/devotional/EmailOtpForm";
import { StudentPrayerList } from "@/components/devotional/StudentPrayerList";
import { StudentDevotionalHistory } from "@/components/devotional/StudentDevotionalHistory";
import { StudentProfileEditor } from "@/components/devotional/StudentProfileEditor";
import { createClient } from "@/lib/supabase/client";

type AuthScreen = "gate" | "phone_otp" | "email_otp";
type HubTab = "prayers" | "devotionals" | "profile";

export function StudentHub() {
  const auth = useDevotionalAuth();
  const [screen, setScreen] = useState<AuthScreen>("gate");
  const [authenticated, setAuthenticated] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [activeTab, setActiveTab] = useState<HubTab>("prayers");

  // Check for existing session on mount
  useEffect(() => {
    const check = async () => {
      const session = await auth.checkSession();
      if (session) {
        setAuthenticated(true);
        try {
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
          // Best effort
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

  // Loading
  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
      </div>
    );
  }

  // Auth forms
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              My Hub
            </p>
            <p className="text-sm text-muted-foreground">
              Sign in to see your prayers and devotionals
            </p>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          {screen === "phone_otp" && (
            <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
              <PhoneOtpForm
                auth={auth}
                onSuccess={handleAuthSuccess}
                onBack={() => {
                  setScreen("gate");
                  auth.clearError();
                }}
              />
            </section>
          )}

          {screen === "email_otp" && (
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
          )}

          {screen === "gate" && (
            <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
              <div className="text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
                  <Heart className="h-7 w-7 text-rose-600" />
                </div>
                <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">
                  Sign in to your hub
                </p>
                <p className="text-xs text-stone-400">
                  See your prayer requests, responses, and devotional history
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
          )}
        </main>
      </div>
    );
  }

  // Authenticated hub
  const tabs: { key: HubTab; label: string; icon: React.ReactNode }[] = [
    { key: "prayers", label: "Prayers", icon: <Heart className="h-4 w-4" /> },
    {
      key: "devotionals",
      label: "Devotionals",
      icon: <BookOpen className="h-4 w-4" />,
    },
    {
      key: "profile",
      label: "Profile",
      icon: <UserCircle className="h-4 w-4" />,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100">
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
              My Hub
            </p>
            <p className="text-sm text-muted-foreground">
              Hey,{" "}
              <span className="font-medium text-stone-900">
                {firstName || "there"}
              </span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground text-xs"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Sign out
          </Button>
        </div>

        {/* Tab bar */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.key
                    ? "border-stone-900 text-stone-900"
                    : "border-transparent text-stone-400 hover:text-stone-600"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {activeTab === "prayers" && <StudentPrayerList />}
        {activeTab === "devotionals" && <StudentDevotionalHistory />}
        {activeTab === "profile" && <StudentProfileEditor />}
      </main>
    </div>
  );
}
