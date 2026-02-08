"use client";

import { Clock, Trophy } from "lucide-react";

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
    <div className="space-y-6 animate-fade-in-up">
      <div className="text-center space-y-4 py-8">
        <div className="flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-stone-100 flex items-center justify-center">
            <Clock className="h-8 w-8 text-stone-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-stone-900">
            {isCompleted ? "Game Over" : "Game Closed"}
          </h2>
          <p className="text-sm text-stone-500 max-w-sm mx-auto">
            {isCompleted
              ? "This game has ended. Check out how everyone scored!"
              : "This game is no longer accepting answers."}
          </p>
        </div>

        <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 max-w-sm mx-auto">
          <p className="text-sm text-stone-500">The question was:</p>
          <p className="text-base font-medium text-stone-800 mt-1">
            {game.core_question}
          </p>
        </div>
      </div>

      <button
        onClick={onViewLeaderboard}
        className="w-full py-3.5 px-6 rounded-xl bg-stone-900 text-white text-base font-semibold hover:bg-stone-800 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        <Trophy className="h-5 w-5" />
        View Leaderboard
      </button>
    </div>
  );
}
