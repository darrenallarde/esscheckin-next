"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { generateAllSounds, type SoundName } from "@/lib/game/sound-sprites";

const MUTE_KEY = "hilo-muted";

interface UseGameAudioReturn {
  /** Play a named sound. No-op if muted or not unlocked. */
  play: (name: SoundName, options?: { rate?: number }) => void;
  /** Toggle mute on/off. Persists to localStorage. */
  toggleMute: () => void;
  /** Current mute state */
  muted: boolean;
  /** Unlock audio context (call on first user gesture). */
  unlock: () => void;
}

/**
 * Web Audio API sound manager for the Hi-Lo game.
 *
 * Uses synthesized AudioBuffers from sound-sprites.ts.
 * Requires unlock() on first user interaction (iOS Safari requirement).
 * Mute state persists to localStorage.
 */
export function useGameAudio(): UseGameAudioReturn {
  const ctxRef = useRef<AudioContext | null>(null);
  const soundsRef = useRef<Map<SoundName, AudioBuffer> | null>(null);
  const unlockedRef = useRef(false);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(MUTE_KEY) === "true";
  });

  // Generate sound buffers on mount
  useEffect(() => {
    try {
      soundsRef.current = generateAllSounds();
    } catch {
      // Web Audio not supported — sounds just won't play
    }
  }, []);

  const getContext = useCallback((): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    try {
      ctxRef.current = new AudioContext();
      return ctxRef.current;
    } catch {
      return null;
    }
  }, []);

  const unlock = useCallback(() => {
    if (unlockedRef.current) return;
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    unlockedRef.current = true;
  }, [getContext]);

  const play = useCallback(
    (name: SoundName, options?: { rate?: number }) => {
      if (muted || !unlockedRef.current) return;
      const ctx = getContext();
      if (!ctx || !soundsRef.current) return;

      const buffer = soundsRef.current.get(name);
      if (!buffer) return;

      // Resume if suspended (can happen after background tab)
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Apply playback rate if specified (for streak pitch-up)
      if (options?.rate) {
        source.playbackRate.value = options.rate;
      }

      // Gain node for volume control
      const gain = ctx.createGain();
      gain.gain.value = 0.7;
      source.connect(gain);
      gain.connect(ctx.destination);

      source.start(0);
    },
    [muted, getContext],
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStorage.setItem(MUTE_KEY, String(next));
      return next;
    });
  }, []);

  return { play, toggleMute, muted, unlock };
}
