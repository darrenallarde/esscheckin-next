"use client";

import { useCallback } from "react";

type HapticPattern = "correct" | "wrong" | "bigReveal" | "tap";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 30,
  correct: 50,
  wrong: [50, 30, 50],
  bigReveal: 100,
};

/**
 * Vibration API wrapper for game haptic feedback.
 * Gracefully degrades — no-op on unsupported devices.
 */
export function useHaptics() {
  const vibrate = useCallback((pattern: HapticPattern) => {
    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(PATTERNS[pattern]);
      }
    } catch {
      // Fail silently — haptics are a nice-to-have
    }
  }, []);

  return { vibrate };
}
