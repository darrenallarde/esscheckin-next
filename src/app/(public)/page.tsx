import Link from "next/link";
import { Users, BarChart3, Heart, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-green-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl">🐑</span>
            <span className="text-xl font-bold text-gray-900">Sheep Doggo</span>
          </div>
          <Button asChild variant="outline">
            <Link href="/auth">Sign In</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Fun intro badge */}
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-full text-sm font-medium mb-8">
            <Sparkles className="h-4 w-4" />
            by the Seedling Team
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Meet Your New
            <br />
            <span className="text-green-600">Flock&apos;s Best Friend</span>
          </h1>

          <p className="text-xl text-gray-600 mb-4">
            Yes, we named it Sheep Doggo. No, we&apos;re not sorry.
          </p>
          <p className="text-lg text-gray-500 mb-8">
            Simple check-ins. Smart insights. Help your ministry know who&apos;s thriving
            and who could use a friendly nudge back to the flock.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
              <Link href="/auth">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="text-sm text-gray-400 mt-4">
            Free for ministries. Because sheep shouldn&apos;t cost extra.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-green-100 mb-4">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Effortless Check-ins</h3>
            <p className="text-gray-600 text-sm">
              People check in with just their name. No apps, no accounts, no &quot;wait, what&apos;s my password again?&quot;
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-amber-100 mb-4">
              <BarChart3 className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Spot the Wanderers</h3>
            <p className="text-gray-600 text-sm">
              See attendance trends at a glance. Know who&apos;s showing up and who might be drifting away.
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-xl shadow-sm border">
            <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-rose-100 mb-4">
              <Heart className="h-6 w-6 text-rose-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Gentle Nudges</h3>
            <p className="text-gray-600 text-sm">
              AI-powered suggestions help you reach out before someone slips through the cracks.
            </p>
          </div>
        </div>

        {/* Fun CTA */}
        <div className="mt-24 text-center">
          <p className="text-2xl mb-2">🐑 🐕 🐑 🐑 🐑</p>
          <p className="text-gray-500 text-sm">Keeping the flock together, one check-in at a time.</p>
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
