"use client";

import { BookHeart, PenLine, Users } from "lucide-react";

export function DevotionalAuthGate() {
  return (
    <section className="bg-white rounded-xl p-6 border border-stone-200 shadow-sm">
      <div className="text-center space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          Want to engage deeper?
        </p>
        <div className="flex items-center justify-center gap-6 text-muted-foreground">
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <PenLine className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-xs">Journal</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
              <BookHeart className="h-5 w-5 text-rose-600" />
            </div>
            <span className="text-xs">Pray</span>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <span className="text-xs">Community</span>
          </div>
        </div>
        <button
          disabled
          className="w-full py-3 px-4 rounded-lg bg-stone-900 text-white text-sm font-medium opacity-70 cursor-not-allowed"
        >
          Sign in with your phone number
        </button>
        <p className="text-xs text-muted-foreground">
          Coming soon &mdash; sign in to journal, submit prayer requests, and connect with your community.
        </p>
      </div>
    </section>
  );
}
