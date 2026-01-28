"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, Send, CheckCircle, Sparkles } from "lucide-react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // For now, just simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // TODO: Send to actual waitlist endpoint
    console.log("Waitlist submission:", formData);

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 overflow-hidden relative">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] text-6xl animate-float-slow opacity-20">🐑</div>
        <div className="absolute top-40 right-[15%] text-4xl animate-float-slower opacity-15">🐑</div>
        <div className="absolute bottom-32 left-[20%] text-5xl animate-float-drift opacity-20">🐑</div>
        <div className="absolute top-1/3 right-[8%] text-3xl animate-float-slower opacity-10">🐑</div>
        <div className="absolute bottom-20 right-[25%] text-4xl animate-float-slow opacity-15">🐕</div>
      </div>

      {/* Header - minimal */}
      <header className="relative z-10 container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐑</span>
            <span className="text-lg font-bold text-white/90">sheepdoggo</span>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
            <Link href="/auth">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Main content - mobile first */}
      <main className="relative z-10 container mx-auto px-4 pt-4 pb-12">
        {/* Hero text - tight and punchy */}
        <div className="text-center mb-6">
          {/* Beta badge */}
          <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-medium mb-4 border border-white/20">
            <Lock className="h-3 w-3" />
            Closed Beta
          </div>

          <h1 className="text-3xl md:text-5xl font-black text-white mb-3 leading-tight">
            Stop losing sheep.
          </h1>

          <p className="text-white/80 text-base md:text-lg max-w-md mx-auto">
            Your spreadsheet doesn&apos;t care who stopped showing up.
            <span className="text-white font-medium"> We do.</span>
          </p>
        </div>

        {/* THE FORM - right here, above the fold */}
        <div className="max-w-sm mx-auto mb-10">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 border border-white/50">
            {isSubmitted ? (
              <div className="text-center py-4">
                <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-emerald-100 mb-3">
                  <CheckCircle className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">You&apos;re in.</h3>
                <p className="text-gray-600 text-sm">
                  We&apos;ll reach out soon. Keep your flock close.
                </p>
                <p className="text-3xl mt-4 animate-float-slow">🐑 🐕</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Get early access</h3>
                  <p className="text-gray-500 text-xs">
                    We&apos;re letting in a few more ministries.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <Label htmlFor="name" className="text-xs text-gray-600">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="Pastor Sarah"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="h-10 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-xs text-gray-600">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="sarah@yourchurch.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="h-10 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="ministry" className="text-xs text-gray-600">Church / Ministry</Label>
                    <Input
                      id="ministry"
                      placeholder="Grace Community"
                      value={formData.ministry}
                      onChange={(e) => setFormData({ ...formData, ministry: e.target.value })}
                      required
                      className="h-10 text-sm"
                    />
                  </div>

                  <div>
                    <Label htmlFor="size" className="text-xs text-gray-600">Flock Size</Label>
                    <Select
                      value={formData.size}
                      onValueChange={(value) => setFormData({ ...formData, size: value })}
                      required
                    >
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="How many sheep?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Under 50</SelectItem>
                        <SelectItem value="medium">50-150</SelectItem>
                        <SelectItem value="large">150-500</SelectItem>
                        <SelectItem value="mega">500+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold shadow-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Request Access
                      </>
                    )}
                  </Button>
                </form>

                <p className="text-[10px] text-gray-400 text-center mt-3">
                  No spam. Shepherds helping shepherds.
                </p>
              </>
            )}
          </div>
        </div>

        {/* The contrast section - the "why" */}
        <div className="max-w-lg mx-auto mb-10">
          <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h2 className="text-white font-bold text-lg mb-4 text-center">
              The real problem isn&apos;t check-ins.
            </h2>

            <div className="space-y-4 text-white/80 text-sm">
              <div className="flex gap-3">
                <span className="text-xl">📋</span>
                <p>
                  <span className="text-white font-medium">Your current system:</span> Names on a clipboard.
                  Maybe a Google Sheet if you&apos;re fancy. You notice someone&apos;s missing... three weeks too late.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="text-xl">💔</span>
                <p>
                  <span className="text-white font-medium">What actually happens:</span> A kid drifts.
                  By the time you realize, they&apos;ve already decided the church forgot about them.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="text-xl">🐕</span>
                <p>
                  <span className="text-white font-medium">Sheep Doggo:</span> Gently barks when someone
                  starts wandering. AI-powered nudges before anyone falls through the cracks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick hits - not feature boxes, just vibes */}
        <div className="max-w-md mx-auto text-center mb-10">
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="bg-white/20 text-white px-3 py-1.5 rounded-full">frictionless check-ins</span>
            <span className="bg-white/20 text-white px-3 py-1.5 rounded-full">engagement insights</span>
            <span className="bg-white/20 text-white px-3 py-1.5 rounded-full">pastoral AI</span>
            <span className="bg-white/20 text-white px-3 py-1.5 rounded-full">no apps to download</span>
            <span className="bg-white/20 text-white px-3 py-1.5 rounded-full">works on any device</span>
          </div>
        </div>

        {/* The meme moment */}
        <div className="text-center mb-8">
          <p className="text-white/60 text-xs mb-2">yes, we really named it</p>
          <p className="text-4xl md:text-5xl font-black text-white mb-1">
            Sheep Doggo
          </p>
          <p className="text-white/50 text-xs">
            🐑 because every flock needs a good boy 🐕
          </p>
        </div>

        {/* Social proof hint */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-white/60 text-xs">
            <Sparkles className="h-3 w-3" />
            <span>A Seedling Team project</span>
            <Sparkles className="h-3 w-3" />
          </div>
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="relative z-10 container mx-auto px-4 py-4 border-t border-white/10">
        <p className="text-center text-white/40 text-xs">
          Built for ministries who notice when someone&apos;s missing.
        </p>
      </footer>

    </div>
  );
}
