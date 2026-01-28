import Link from "next/link";
import { Sprout, Users, BarChart3, Heart, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLATFORM_NAME } from "@/lib/copy";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
              <Sprout className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">{PLATFORM_NAME}</span>
          </div>
          <Button asChild variant="outline">
            <Link href="/auth">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Nurture Every Student&apos;s Growth
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Simple check-ins. Meaningful insights. Help your ministry see who&apos;s thriving and who needs a little extra care.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
              <Link href="/auth">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
          <div className="text-center p-6">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-green-100 mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Easy Check-ins</h3>
            <p className="text-gray-600 text-sm">
              Students check in with just their name. No apps to download, no accounts to create.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-green-100 mb-4">
              <BarChart3 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Attendance Insights</h3>
            <p className="text-gray-600 text-sm">
              See trends at a glance. Know who&apos;s showing up consistently and who might be drifting.
            </p>
          </div>
          <div className="text-center p-6">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-green-100 mb-4">
              <Heart className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Pastoral Care</h3>
            <p className="text-gray-600 text-sm">
              AI-powered recommendations help you reach out to students before they slip through the cracks.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Sprout className="h-4 w-4" />
          <span>{PLATFORM_NAME}</span>
          <span className="mx-2">|</span>
          <span>Helping ministries nurture growth</span>
        </div>
      </footer>
    </div>
  );
}
