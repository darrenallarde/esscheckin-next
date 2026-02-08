/**
 * Hi-Lo Game Timing Constants
 *
 * All animation durations and delays in one place.
 * Values in milliseconds unless noted.
 */

export const TIMING = {
  /** Button press lock-in visual */
  LOCK_IN: 200,
  /** Dramatic buildup before hit reveal */
  BUILDUP: 1500,
  /** Shake duration on miss */
  MISS_SHAKE: 400,
  /** Green/red flash on reveal */
  RESULT_FLASH: 300,
  /** AnimatedNumber count-up duration */
  SCORE_COUNT: 800,
  /** Delay before rank appears */
  RANK_REVEAL_DELAY: 400,
  /** Round interstitial display time */
  INTERSTITIAL: 1800,
  /** AnimatedNumber tick interval (ms) */
  SCORE_TICK: 30,
} as const;

/** Framer Motion variants for screen transitions */
export const screenVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
} as const;

/** Stagger children in sequence */
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
} as const;

/** Button tap scale */
export const tapScale = { scale: 0.95 } as const;
