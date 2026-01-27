"use client";

import { useEffect, useState } from "react";
import { getRandomVerse, BibleVerse } from "@/utils/bibleVerses";
import { BookOpen } from "lucide-react";

interface EncouragingMessageProps {
  className?: string;
}

export function EncouragingMessage({ className }: EncouragingMessageProps) {
  const [verse, setVerse] = useState<BibleVerse | null>(null);

  useEffect(() => {
    // Get a random verse on mount
    setVerse(getRandomVerse());
  }, []);

  if (!verse) return null;

  return (
    <div className={className}>
      <div className="flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/10 p-4">
        <BookOpen className="h-5 w-5 text-primary/70 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm text-foreground/80 italic leading-relaxed">
            &ldquo;{verse.text}&rdquo;
          </p>
          <p className="mt-2 text-xs font-medium text-primary/70">
            — {verse.reference}
          </p>
        </div>
      </div>
    </div>
  );
}
