"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";

interface GenerationProgressModalProps {
  isOpen: boolean;
  sermonTitle?: string;
}

export function GenerationProgressModal({
  isOpen,
  sermonTitle,
}: GenerationProgressModalProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Generating Devotionals</DialogTitle>
        <DialogDescription className="sr-only">
          Please wait while the AI generates your devotional content
        </DialogDescription>
        <div className="flex flex-col items-center py-8">
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <Sparkles className="h-16 w-16 text-primary/30" />
            </div>
            <Sparkles className="h-16 w-16 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold mt-6">Generating Devotionals</h2>
          {sermonTitle && (
            <p className="text-muted-foreground mt-1 text-center px-4 truncate max-w-full">
              From: {sermonTitle}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-4 text-center px-4">
            Our AI is creating personalized devotional content based on your
            sermon.
            <br />
            This usually takes 30-60 seconds.
          </p>
          <div className="mt-6 w-full max-w-xs">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary relative">
              <div
                className="absolute h-full bg-primary rounded-full animate-indeterminate-progress"
                style={{ width: "40%" }}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
