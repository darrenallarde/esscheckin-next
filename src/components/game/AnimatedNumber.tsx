"use client";

import { useEffect, useRef, useState } from "react";
import { TIMING } from "@/lib/game/timing";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  prefix?: string;
  suffix?: string;
  format?: boolean;
}

/**
 * Counts up from previous value to `value` over `duration` ms.
 * Uses requestAnimationFrame for smooth 60fps counting.
 */
export function AnimatedNumber({
  value,
  duration = TIMING.SCORE_COUNT,
  className = "",
  style,
  prefix = "",
  suffix = "",
  format = true,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const prevValue = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = prevValue.current;
    const diff = value - start;
    if (diff === 0) return;

    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevValue.current = value;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const formatted = format ? display.toLocaleString() : String(display);

  return (
    <span
      className={className}
      style={{ fontVariantNumeric: "tabular-nums", ...style }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
