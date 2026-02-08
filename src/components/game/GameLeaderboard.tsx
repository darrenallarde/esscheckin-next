"use client";

import { Trophy, ArrowLeft, Loader2, Medal } from "lucide-react";
import { useGameLeaderboard } from "@/hooks/queries/use-game-leaderboard";

interface GameLeaderboardProps {
  gameId: string;
  profileId: string | null;
  onBack: () => void;
}

const PODIUM_STYLES = {
  1: "bg-amber-100 border-amber-300 text-amber-800",
  2: "bg-stone-100 border-stone-300 text-stone-700",
  3: "bg-orange-100 border-orange-300 text-orange-800",
} as const;

export function GameLeaderboard({
  gameId,
  profileId,
  onBack,
}: GameLeaderboardProps) {
  const { data: players, isLoading, error } = useGameLeaderboard(gameId);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-stone-600" />
        </button>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold text-stone-900">Leaderboard</h2>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-sm text-red-600">
          Failed to load leaderboard
        </div>
      )}

      {players && players.length === 0 && (
        <div className="text-center py-8 text-sm text-stone-500">
          No players yet
        </div>
      )}

      {players && players.length > 0 && (
        <div className="space-y-2">
          {players.map((player) => {
            const isMe = player.profile_id === profileId;
            const isPodium = player.player_rank <= 3;
            const podiumStyle =
              PODIUM_STYLES[player.player_rank as keyof typeof PODIUM_STYLES];

            return (
              <div
                key={player.profile_id}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isMe
                    ? "bg-violet-50 border-violet-200 ring-2 ring-violet-300"
                    : isPodium
                      ? `${podiumStyle} border`
                      : "bg-white border-stone-100"
                }`}
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  {isPodium ? (
                    <Medal
                      className={`h-5 w-5 mx-auto ${
                        player.player_rank === 1
                          ? "text-amber-500"
                          : player.player_rank === 2
                            ? "text-stone-400"
                            : "text-orange-500"
                      }`}
                    />
                  ) : (
                    <span className="text-sm font-mono text-stone-400">
                      {player.player_rank}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${isMe ? "text-violet-900" : "text-stone-800"}`}
                  >
                    {player.first_name} {player.last_name?.[0]}.
                    {isMe && (
                      <span className="ml-1 text-xs text-violet-600">
                        (you)
                      </span>
                    )}
                  </p>
                </div>

                {/* Score */}
                <span className="text-sm font-bold text-stone-900">
                  {player.total_score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
