"use client";

import { PastoralKanban } from "@/components/pastoral/PastoralKanban";
import { Heart } from "lucide-react";

export default function PastoralPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 h-full">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3">
            <Heart className="h-8 w-8 text-rose-500" />
            Pastoral Care
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage outreach and follow up with students who need attention
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0">
        <PastoralKanban />
      </div>
    </div>
  );
}
