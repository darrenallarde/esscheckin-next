"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Gamepad2, Check, Copy } from "lucide-react";
import { useState } from "react";

interface GameGenerationModalProps {
  isOpen: boolean;
  isComplete: boolean;
  gameUrl?: string;
  devotionalTitle?: string;
  onClose: () => void;
}

export function GameGenerationModal({
  isOpen,
  isComplete,
  gameUrl,
  devotionalTitle,
  onClose,
}: GameGenerationModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!gameUrl) return;
    await navigator.clipboard.writeText(gameUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isComplete && gameUrl) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Game Ready!</DialogTitle>
          <DialogDescription>
            Share this link with your students to play.
          </DialogDescription>
          <div className="flex flex-col items-center py-4">
            <Gamepad2 className="h-12 w-12 text-green-600 mb-4" />
            {devotionalTitle && (
              <p className="text-sm text-muted-foreground mb-3 text-center truncate max-w-full">
                {devotionalTitle}
              </p>
            )}
            <div className="flex items-center gap-2 w-full">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm truncate">
                {gameUrl}
              </code>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Generating Hi-Lo Game</DialogTitle>
        <DialogDescription className="sr-only">
          Please wait while the AI generates your game content
        </DialogDescription>
        <div className="flex flex-col items-center py-8">
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <Gamepad2 className="h-16 w-16 text-primary/30" />
            </div>
            <Gamepad2 className="h-16 w-16 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold mt-6">Generating Hi-Lo Game</h2>
          {devotionalTitle && (
            <p className="text-muted-foreground mt-1 text-center px-4 truncate max-w-full">
              From: {devotionalTitle}
            </p>
          )}
          <p className="text-sm text-muted-foreground mt-4 text-center px-4">
            Creating 200 ranked answers and game content.
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
