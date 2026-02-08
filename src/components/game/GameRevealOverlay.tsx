"use client";

import { motion, AnimatePresence } from "framer-motion";

interface GameRevealOverlayProps {
  visible: boolean;
}

/**
 * Full-screen tension builder shown during the buildup phase.
 * "Checking the list..." with a pulsing animation.
 */
export function GameRevealOverlay({ visible }: GameRevealOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "hsla(230, 15%, 5%, 0.85)" }}
        >
          <motion.div
            className="text-center space-y-4"
            initial={{ scale: 0.9 }}
            animate={{ scale: [0.9, 1.05, 0.95, 1.02, 1] }}
            transition={{
              duration: 1.5,
              ease: "easeInOut",
            }}
          >
            {/* Pulsing circle */}
            <motion.div
              className="mx-auto h-20 w-20 rounded-full flex items-center justify-center"
              animate={{
                boxShadow: [
                  "0 0 0 0 hsla(258, 90%, 66%, 0.4)",
                  "0 0 0 20px hsla(258, 90%, 66%, 0)",
                ],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: "easeOut",
              }}
              style={{
                background: "hsla(258, 90%, 66%, 0.2)",
                border: "2px solid hsla(258, 90%, 66%, 0.5)",
              }}
            >
              <motion.span
                className="text-3xl"
                animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  repeatDelay: 0.3,
                }}
              >
                ?
              </motion.span>
            </motion.div>

            <motion.p
              className="text-lg font-bold tracking-wide"
              style={{ color: "var(--game-text)" }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >
              Checking the list...
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
