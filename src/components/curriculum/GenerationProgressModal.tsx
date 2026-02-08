"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

interface GenerationProgressModalProps {
  isOpen: boolean;
  sermonTitle?: string;
  onCancel?: () => void;
}

const CANCEL_DELAY_MS = 15_000;

export function GenerationProgressModal({
  isOpen,
  sermonTitle,
  onCancel,
}: GenerationProgressModalProps) {
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowCancel(false);
      return;
    }
    const timer = setTimeout(() => setShowCancel(true), CANCEL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => {
          if (showCancel) onCancel?.();
          else e.preventDefault();
        }}
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
          {showCancel && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-6 text-muted-foreground"
              onClick={onCancel}
            >
              <X className="h-4 w-4 mr-1" />
              Taking too long? Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
