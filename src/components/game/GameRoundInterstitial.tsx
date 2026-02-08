"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown } from "lucide-react";

interface GameRoundInterstitialProps {
  visible: boolean;
  roundNumber: number;
  direction: "high" | "low";
}

/**
 * Between-round swoosh overlay.
 * Shows "Round 2 — HIGH!" with a directional arrow.
 */
export function GameRoundInterstitial({
  visible,
  roundNumber,
  direction,
}: GameRoundInterstitialProps) {
  const isHigh = direction === "high";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "hsla(230, 15%, 5%, 0.9)" }}
        >
          <motion.div
            className="text-center space-y-4"
            initial={{ scale: 0.5, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <motion.p
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: "var(--game-muted)" }}
            >
              Get Ready
            </motion.p>

            <motion.div
              className="flex items-center justify-center gap-3"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <span className="text-4xl font-black">Round {roundNumber}</span>
            </motion.div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-lg font-bold"
              style={{
                background: isHigh
                  ? "hsla(142, 71%, 45%, 0.15)"
                  : "hsla(25, 95%, 53%, 0.15)",
                color: isHigh ? "var(--game-correct)" : "#f97316",
                boxShadow: isHigh
                  ? "0 0 24px hsla(142, 71%, 45%, 0.3)"
                  : "0 0 24px hsla(25, 95%, 53%, 0.3)",
              }}
            >
              {isHigh ? (
                <ArrowUp className="h-6 w-6" />
              ) : (
                <ArrowDown className="h-6 w-6" />
              )}
              {isHigh ? "HIGH!" : "LOW!"}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
