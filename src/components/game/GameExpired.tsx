"use client";

import { motion } from "framer-motion";
import { Clock, Trophy } from "lucide-react";
import { tapScale } from "@/lib/game/timing";

interface GameExpiredProps {
  game: {
    status: string;
    core_question: string;
  };
  onViewLeaderboard: () => void;
}

export function GameExpired({ game, onViewLeaderboard }: GameExpiredProps) {
  const isCompleted = game.status === "completed";

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center"
            style={{ background: "var(--game-surface-light)" }}
          >
            <Clock className="h-8 w-8" style={{ color: "var(--game-muted)" }} />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            {isCompleted ? "Game Over" : "Game Closed"}
          </h2>
          <p
            className="text-sm max-w-sm mx-auto"
            style={{ color: "var(--game-muted)" }}
          >
            {isCompleted
              ? "This game has ended. Check out how everyone scored!"
              : "This game is no longer accepting answers."}
          </p>
        </div>

        <div
          className="rounded-xl p-4 border max-w-sm mx-auto"
          style={{
            background: "var(--game-surface)",
            borderColor: "var(--game-border)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--game-muted)" }}>
            The question was:
          </p>
          <p className="text-base font-medium mt-1">{game.core_question}</p>
        </div>
      </div>

      <motion.button
        onClick={onViewLeaderboard}
        whileTap={tapScale}
        className="w-full py-3.5 px-6 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2"
        style={{
          background: "var(--game-accent)",
          color: "#fff",
        }}
      >
        <Trophy className="h-5 w-5" />
        View Leaderboard
      </motion.button>
    </div>
  );
}
