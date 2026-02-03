"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Lock, Send, CheckCircle, Zap } from "lucide-react";
import { useMarketingTracking } from "@/lib/amplitude/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function LandingPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    ministry: "",
    size: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Amplitude tracking
  const { trackLandingPageViewed, trackWaitlistFormSubmitted } = useMarketingTracking();

  // Track page view on mount
  useEffect(() => {
    trackLandingPageViewed();
  }, [trackLandingPageViewed]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Waitlist submission:", formData);

    // Track waitlist submission
    trackWaitlistFormSubmitted({
      ministry_name: formData.ministry,
      ministry_size: formData.size as "small" | "medium" | "large" | "mega",
    });

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white overflow-hidden relative">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-fuchsia-950/40 to-lime-950/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lime-500/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-fuchsia-600/20 via-transparent to-transparent" />

      {/* Animated orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-lime-400/20 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-fuchsia-500/25 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🐑</span>
              <span className="text-xl font-black bg-gradient-to-r from-lime-300 via-white to-fuchsia-300 bg-clip-text text-transparent">
                Sheep Doggo
              </span>
            </div>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/5 backdrop-blur-sm text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/auth">Team Login</Link>
            </Button>
          </div>
        </header>

        {/* Main - Hero + Form side by side */}
        <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center max-w-6xl mx-auto">

            {/* Left: Hero text */}
            <div className="text-center lg:text-left">
              {/* Exclusive badge */}
              <div className="inline-flex items-center gap-2 bg-lime-500/20 backdrop-blur-sm border border-lime-400/40 px-4 py-2 rounded-full text-sm font-bold mb-6">
                <Lock className="h-4 w-4 text-lime-400" />
                <span className="text-lime-300">Closed Beta</span>
                <span className="text-white/40">·</span>
                <span className="text-white/90">7 ministries inside</span>
                <Zap className="h-4 w-4 text-fuchsia-400" />
              </div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
                <span className="text-white">
                  Know Your
                </span>
                <br />
                <span className="bg-gradient-to-r from-lime-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                  Flock
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-white/70 mb-8 max-w-md mx-auto lg:mx-0">
                See who&apos;s drifting before they&apos;re gone.
              </p>

              {/* Social proof */}
              <div className="flex items-center justify-center lg:justify-start gap-4 text-white/50">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center text-xs font-bold text-black">E</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-400 to-fuchsia-600 flex items-center justify-center text-xs font-bold text-white">G</div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-xs font-bold text-white">C</div>
                </div>
                <span className="text-sm">
                  <span className="text-white font-semibold">230+ students</span> being shepherded
                </span>
              </div>
            </div>

            {/* Right: Form */}
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-lime-500/30 via-fuchsia-500/30 to-violet-500/30 rounded-[2rem] blur-2xl opacity-60" />

              <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 md:p-8">
                {isSubmitted ? (
                  <div className="text-center py-6">
                    <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-lime-400/20 border border-lime-400/50 mb-4">
                      <CheckCircle className="h-8 w-8 text-lime-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">You&apos;re In!</h3>
                    <p className="text-white/70">We&apos;ll reach out soon.</p>
                    <p className="text-3xl mt-4">🐑 🐕</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-black mb-1 bg-gradient-to-r from-lime-300 via-white to-fuchsia-300 bg-clip-text text-transparent">
                        Request Early Access
                      </h3>
                      <p className="text-white/50 text-sm">
                        Limited spots. We&apos;re picky.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="name" className="text-white/70 text-sm">Your Name</Label>
                          <Input
                            id="name"
                            placeholder="John"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-lime-400/50 h-11"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="text-white/70 text-sm">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@church.org"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-lime-400/50 h-11"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="ministry" className="text-white/70 text-sm">Ministry Name</Label>
                        <Input
                          id="ministry"
                          placeholder="Grace Community Youth"
                          value={formData.ministry}
                          onChange={(e) => setFormData({ ...formData, ministry: e.target.value })}
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-lime-400/50 h-11"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="size" className="text-white/70 text-sm">Size</Label>
                        <Select
                          value={formData.size}
                          onValueChange={(value) => setFormData({ ...formData, size: value })}
                          required
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-lime-400/50 [&>span]:text-white/50 h-11">
                            <SelectValue placeholder="How many students?" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a2f] border-white/20">
                            <SelectItem value="small" className="text-white focus:bg-white/10">Under 50</SelectItem>
                            <SelectItem value="medium" className="text-white focus:bg-white/10">50-150</SelectItem>
                            <SelectItem value="large" className="text-white focus:bg-white/10">150-500</SelectItem>
                            <SelectItem value="mega" className="text-white focus:bg-white/10">500+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-lime-500 to-lime-400 hover:from-lime-400 hover:to-lime-300 text-black font-bold border-0 shadow-lg shadow-lime-500/25 h-12 text-base"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Get Early Access
                          </>
                        )}
                      </Button>
                    </form>

                    <p className="text-xs text-white/30 text-center mt-4">
                      No spam. We respect shepherds.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Quick value props - mobile visible, compact */}
          <div className="mt-12 lg:mt-16 grid grid-cols-3 gap-4 max-w-2xl mx-auto text-center">
            <div className="p-4">
              <div className="text-2xl mb-2">👀</div>
              <p className="text-white/70 text-sm font-medium">Spot the wanderers</p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">💡</div>
              <p className="text-white/70 text-sm font-medium">Insights, not data</p>
            </div>
            <div className="p-4">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-white/70 text-sm font-medium">AI-powered nudges</p>
            </div>
          </div>
        </main>

        {/* Minimal footer */}
        <footer className="container mx-auto px-4 py-6 text-center">
          <p className="text-white/30 text-sm">
            🐑 Sheep Doggo · A Seedling Team Project
          </p>
        </footer>
      </div>
    </div>
  );
}
