"use client";

import { useState } from "react";
import Link from "next/link";
import { Users, BarChart3, Heart, Sparkles, Lock, Send, CheckCircle } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-green-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🐑</span>
            <span className="text-xl font-bold text-gray-900">Sheep Doggo</span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/auth">Team Login</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Closed Beta Badge */}
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-100 to-green-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-amber-200">
            <Lock className="h-4 w-4" />
            Closed Beta · A Select Few
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Something&apos;s Stirring
            <br />
            <span className="text-green-600">in the Pasture</span>
          </h1>

          <p className="text-xl text-gray-600 mb-3">
            Meet <span className="font-semibold">Sheep Doggo</span>. Yes, that&apos;s really the name.
          </p>
          <p className="text-lg text-gray-500 mb-8 max-w-2xl mx-auto">
            A handful of ministries are quietly discovering a new way to care for their flock.
            Simple check-ins. Smart insights. A gentle nudge when someone starts to wander.
          </p>

          {/* Exclusive messaging */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>by the Seedling Team</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-white/80 backdrop-blur rounded-xl shadow-sm border">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-green-100 mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Effortless Check-ins</h3>
            <p className="text-gray-600 text-sm">
              Just a name. No apps, no passwords, no friction.
            </p>
          </div>
          <div className="text-center p-6 bg-white/80 backdrop-blur rounded-xl shadow-sm border">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-amber-100 mb-4">
              <BarChart3 className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Spot the Wanderers</h3>
            <p className="text-gray-600 text-sm">
              See who&apos;s showing up—and who might be drifting.
            </p>
          </div>
          <div className="text-center p-6 bg-white/80 backdrop-blur rounded-xl shadow-sm border">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-rose-100 mb-4">
              <Heart className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gentle Nudges</h3>
            <p className="text-gray-600 text-sm">
              AI suggestions before anyone slips through the cracks.
            </p>
          </div>
        </div>

        {/* Waitlist Form */}
        <div className="mt-20 max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border p-8">
            {isSubmitted ? (
              <div className="text-center py-8">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-green-100 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">You&apos;re on the List!</h3>
                <p className="text-gray-600">
                  We&apos;ll be in touch soon. Until then, keep your flock close.
                </p>
                <p className="text-2xl mt-4">🐑 🐕</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">Want In?</h3>
                  <p className="text-gray-600 text-sm">
                    We&apos;re opening the gate to a few more ministries.
                    <br />
                    Tell us about yours.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="Pastor John"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@yourchurch.org"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ministry">Church / Ministry Name</Label>
                    <Input
                      id="ministry"
                      placeholder="Grace Community Church"
                      value={formData.ministry}
                      onChange={(e) => setFormData({ ...formData, ministry: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="size">Congregation Size</Label>
                    <Select
                      value={formData.size}
                      onValueChange={(value) => setFormData({ ...formData, size: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="How big is your flock?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Under 50 sheep</SelectItem>
                        <SelectItem value="medium">50-150 sheep</SelectItem>
                        <SelectItem value="large">150-500 sheep</SelectItem>
                        <SelectItem value="mega">500+ sheep</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700"
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

                <p className="text-xs text-gray-400 text-center mt-4">
                  No spam. Just shepherds helping shepherds.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Fun footer element */}
        <div className="mt-16 text-center">
          <p className="text-2xl mb-2">🐑 🐕 🐑 🐑 🐑</p>
          <p className="text-gray-400 text-sm italic">
            &quot;The good shepherd knows each one by name.&quot;
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex flex-col items-center gap-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span>🐑</span>
            <span className="font-medium">Sheep Doggo</span>
            <span className="mx-2">·</span>
            <span>A Seedling Team Project</span>
          </div>
          <p className="text-xs text-gray-400">
            Built with love for ministries who care about every single person.
          </p>
        </div>
      </footer>
    </div>
  );
}
