"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, BarChart3, Heart, Sparkles, Lock, Send, CheckCircle, Zap } from "lucide-react";
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

    // For now, just simulate submission - you can wire this up to a real endpoint later
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // TODO: Send to actual waitlist endpoint
    console.log("Waitlist submission:", formData);

    setIsSubmitting(false);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white overflow-hidden relative">
      {/* Animated gradient background - playful purple/lime vibes */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-fuchsia-950/40 to-lime-950/30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-lime-500/15 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-fuchsia-600/20 via-transparent to-transparent" />

      {/* Animated orbs - chartreuse and purple */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-lime-400/20 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-fuchsia-500/25 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-500/15 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '2s' }} />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="text-4xl">🐑</span>
                <span className="absolute -top-1 -right-1 text-xl">✨</span>
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-lime-300 via-white to-fuchsia-300 bg-clip-text text-transparent">
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

        {/* Hero */}
        <main className="container mx-auto px-4 py-12 md:py-20">
          <div className="max-w-3xl mx-auto text-center">
            {/* Closed Beta Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-lime-500/20 to-fuchsia-500/20 backdrop-blur-sm border border-lime-400/40 text-lime-200 px-5 py-2.5 rounded-full text-base font-semibold mb-8">
              <Lock className="h-5 w-5 text-lime-400" />
              <span className="bg-gradient-to-r from-lime-300 to-lime-100 bg-clip-text text-transparent font-bold">
                Closed Beta
              </span>
              <span className="text-white/40">·</span>
              <span className="text-white/90">Invite Only</span>
              <Zap className="h-5 w-5 text-fuchsia-400" />
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-[1.1] tracking-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/90 bg-clip-text text-transparent">
                Something&apos;s Stirring
              </span>
              <br />
              <span className="bg-gradient-to-r from-lime-400 via-fuchsia-400 to-violet-400 bg-clip-text text-transparent">
                in the Pasture
              </span>
            </h1>

            <p className="text-2xl md:text-3xl text-white/90 mb-4 font-medium">
              Meet <span className="font-black text-transparent bg-gradient-to-r from-lime-300 to-fuchsia-300 bg-clip-text">Sheep Doggo</span>. Yes, that&apos;s really the name.
            </p>
            <p className="text-xl md:text-2xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
              A handful of ministries are quietly discovering a new way to care for their flock.
              Simple check-ins. Smart insights. A gentle nudge when someone starts to wander.
            </p>

            {/* Exclusive messaging */}
            <div className="flex items-center justify-center gap-3 text-base text-white/50 mb-4">
              <Sparkles className="h-5 w-5 text-lime-400" />
              <span>by the <span className="text-white/80 font-semibold">Seedling Team</span></span>
              <Sparkles className="h-5 w-5 text-fuchsia-400" />
            </div>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-20 max-w-5xl mx-auto">
            <div className="group text-center p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:border-lime-400/50 hover:bg-white/10 transition-all duration-300">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400/20 to-lime-500/20 border border-lime-400/40 mb-5 group-hover:scale-110 transition-transform">
                <Users className="h-8 w-8 text-lime-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Effortless Check-ins</h3>
              <p className="text-white/60 text-lg">
                Just a name. No apps, no passwords, no friction.
              </p>
            </div>
            <div className="group text-center p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:border-fuchsia-500/50 hover:bg-white/10 transition-all duration-300">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-600/20 border border-fuchsia-500/40 mb-5 group-hover:scale-110 transition-transform">
                <BarChart3 className="h-8 w-8 text-fuchsia-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Spot the Wanderers</h3>
              <p className="text-white/60 text-lg">
                See who&apos;s showing up—and who might be drifting.
              </p>
            </div>
            <div className="group text-center p-8 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10 hover:border-violet-500/50 hover:bg-white/10 transition-all duration-300">
              <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/20 border border-violet-500/40 mb-5 group-hover:scale-110 transition-transform">
                <Heart className="h-8 w-8 text-violet-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Gentle Nudges</h3>
              <p className="text-white/60 text-lg">
                AI suggestions before anyone slips through the cracks.
              </p>
            </div>
          </div>

          {/* Waitlist Form */}
          <div className="mt-24 max-w-lg mx-auto">
            <div className="relative">
              {/* Glow effect behind card */}
              <div className="absolute -inset-2 bg-gradient-to-r from-lime-500/40 via-fuchsia-500/40 to-violet-500/40 rounded-[2rem] blur-2xl opacity-60" />

              <div className="relative bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 p-10">
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-gradient-to-br from-lime-400/30 to-lime-500/30 border border-lime-400/50 mb-5">
                      <CheckCircle className="h-10 w-10 text-lime-400" />
                    </div>
                    <h3 className="text-2xl font-bold mb-3 text-white">You&apos;re on the List!</h3>
                    <p className="text-white/70 text-lg">
                      We&apos;ll be in touch soon. Until then, keep your flock close.
                    </p>
                    <p className="text-4xl mt-6">🐑 🐕</p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-8">
                      <h3 className="text-3xl font-black mb-3 bg-gradient-to-r from-lime-300 via-white to-fuchsia-300 bg-clip-text text-transparent">
                        Want In?
                      </h3>
                      <p className="text-white/60 text-lg">
                        We&apos;re opening the gate to a few more ministries.
                        <br />
                        Tell us about yours.
                      </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-white/80 text-base font-medium">Your Name</Label>
                        <Input
                          id="name"
                          placeholder="Pastor John"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400/50 focus:ring-lime-400/20 h-12 text-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white/80 text-base font-medium">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@yourchurch.org"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400/50 focus:ring-lime-400/20 h-12 text-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ministry" className="text-white/80 text-base font-medium">Church / Ministry Name</Label>
                        <Input
                          id="ministry"
                          placeholder="Grace Community Church"
                          value={formData.ministry}
                          onChange={(e) => setFormData({ ...formData, ministry: e.target.value })}
                          required
                          className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-lime-400/50 focus:ring-lime-400/20 h-12 text-lg"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="size" className="text-white/80 text-base font-medium">Congregation Size</Label>
                        <Select
                          value={formData.size}
                          onValueChange={(value) => setFormData({ ...formData, size: value })}
                          required
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white focus:border-lime-400/50 focus:ring-lime-400/20 [&>span]:text-white/60 h-12 text-lg">
                            <SelectValue placeholder="How big is your flock?" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#1a1a2f] border-white/20">
                            <SelectItem value="small" className="text-white focus:bg-white/10 text-base">Under 50 sheep</SelectItem>
                            <SelectItem value="medium" className="text-white focus:bg-white/10 text-base">50-150 sheep</SelectItem>
                            <SelectItem value="large" className="text-white focus:bg-white/10 text-base">150-500 sheep</SelectItem>
                            <SelectItem value="mega" className="text-white focus:bg-white/10 text-base">500+ sheep</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-lime-500 to-lime-400 hover:from-lime-400 hover:to-lime-300 text-black font-bold border-0 shadow-lg shadow-lime-500/30 h-14 text-lg"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Sending...
                          </span>
                        ) : (
                          <>
                            <Send className="mr-2 h-5 w-5" />
                            Request Access
                          </>
                        )}
                      </Button>
                    </form>

                    <p className="text-sm text-white/40 text-center mt-5">
                      No spam. Just shepherds helping shepherds.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Fun footer element */}
          <div className="mt-20 text-center">
            <p className="text-4xl mb-4 drop-shadow-[0_0_12px_rgba(163,230,53,0.4)]">🐑 🐕 🐑 🐑 🐑</p>
            <p className="text-white/50 text-lg italic">
              &quot;The good shepherd knows each one by name.&quot;
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 py-10 border-t border-white/10">
          <div className="flex flex-col items-center gap-3 text-base text-white/50">
            <div className="flex items-center gap-3">
              <span className="text-xl">🐑</span>
              <span className="font-bold text-white/80">Sheep Doggo</span>
              <span className="mx-2 text-white/30">·</span>
              <span>A Seedling Team Project</span>
            </div>
            <p className="text-sm text-white/40">
              Built with love for ministries who care about every single person.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
