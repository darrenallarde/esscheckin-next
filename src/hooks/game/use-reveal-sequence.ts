"use client";

import { useState, useCallback, useRef } from "react";
import { TIMING } from "@/lib/game/timing";

export type RevealPhase =
  | "idle"
  | "lock_in"
  | "buildup"
  | "reveal"
  | "interstitial";

interface UseRevealSequenceReturn {
  phase: RevealPhase;
  /** Call after API returns a HIT. Runs lock-in → buildup → calls onReveal */
  startHitReveal: (onReveal: () => void) => void;
  /** Call after API returns a MISS. Quick lock-in → calls onMiss */
  startMissReveal: (onMiss: () => void) => void;
  /** Show interstitial between rounds, then call onDone */
  showInterstitial: (onDone: () => void) => void;
  /** Reset to idle */
  reset: () => void;
}

/**
 * Orchestrates the dramatic reveal timing between API response and state dispatch.
 * HIT: lock-in (200ms) → buildup (1500ms) → reveal
 * MISS: lock-in (200ms) → immediate miss
 */
export function useRevealSequence(): UseRevealSequenceReturn {
  const [phase, setPhase] = useState<RevealPhase>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setPhase("idle");
  }, [clearTimers]);

  const startHitReveal = useCallback(
    (onReveal: () => void) => {
      clearTimers();
      setPhase("lock_in");

      timeoutRef.current = setTimeout(() => {
        setPhase("buildup");

        timeoutRef.current = setTimeout(() => {
          setPhase("reveal");
          onReveal();

          // Auto-reset after flash
          timeoutRef.current = setTimeout(() => {
            setPhase("idle");
          }, TIMING.RESULT_FLASH);
        }, TIMING.BUILDUP);
      }, TIMING.LOCK_IN);
    },
    [clearTimers],
  );

  const startMissReveal = useCallback(
    (onMiss: () => void) => {
      clearTimers();
      setPhase("lock_in");

      timeoutRef.current = setTimeout(() => {
        setPhase("idle");
        onMiss();
      }, TIMING.LOCK_IN);
    },
    [clearTimers],
  );

  const showInterstitial = useCallback(
    (onDone: () => void) => {
      clearTimers();
      setPhase("interstitial");

      timeoutRef.current = setTimeout(() => {
        setPhase("idle");
        onDone();
      }, TIMING.INTERSTITIAL);
    },
    [clearTimers],
  );

  return { phase, startHitReveal, startMissReveal, showInterstitial, reset };
}
