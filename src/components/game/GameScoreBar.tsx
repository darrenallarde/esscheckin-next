"use client";

import { motion } from "framer-motion";

interface GameScoreBarProps {
  score: number;
  maxScore: number;
  label?: string;
  color?: string;
}

export function GameScoreBar({
  score,
  maxScore,
  label,
  color = "var(--game-correct)",
}: GameScoreBarProps) {
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: "var(--game-muted)" }}>{label}</span>
          <span className="font-medium">{score}</span>
        </div>
      )}
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: "hsla(0, 0%, 100%, 0.08)" }}
      >
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </div>
  );
}
