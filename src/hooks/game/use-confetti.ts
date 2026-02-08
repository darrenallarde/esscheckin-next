"use client";

import { useCallback } from "react";
import confetti from "canvas-confetti";

type ConfettiPreset = "hit" | "streak" | "finale" | "prayer";

/**
 * canvas-confetti presets for game celebrations.
 */
export function useConfetti() {
  const fire = useCallback((preset: ConfettiPreset) => {
    try {
      switch (preset) {
        case "hit":
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ["#22c55e", "#8b5cf6", "#f59e0b"],
          });
          break;

        case "streak":
          confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.5 },
            colors: ["#f59e0b", "#fbbf24", "#d4d4d8"],
          });
          break;

        case "finale": {
          // Score-proportional celebration: 3 bursts
          const fire = (delay: number) =>
            setTimeout(() => {
              confetti({
                particleCount: 100,
                spread: 120,
                origin: { y: 0.5, x: 0.3 + Math.random() * 0.4 },
                colors: ["#22c55e", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6"],
              });
            }, delay);
          fire(0);
          fire(400);
          fire(800);
          break;
        }

        case "prayer":
          confetti({
            particleCount: 40,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#8b5cf6", "#a78bfa", "#c084fc", "#e879f9"],
            shapes: ["circle"],
            gravity: 0.6,
            drift: 0.2,
          });
          break;
      }
    } catch {
      // Fail silently
    }
  }, []);

  return { fire };
}
