"use client";

import { motion } from "framer-motion";
import { Trophy, ArrowLeft, Loader2, Medal } from "lucide-react";
import { useGameLeaderboard } from "@/hooks/queries/use-game-leaderboard";
import { tapScale } from "@/lib/game/timing";

interface GameLeaderboardProps {
  gameId: string;
  profileId: string | null;
  onBack: () => void;
}

export function GameLeaderboard({
  gameId,
  profileId,
  onBack,
}: GameLeaderboardProps) {
  const { data: players, isLoading, error } = useGameLeaderboard(gameId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <motion.button
          onClick={onBack}
          whileTap={tapScale}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "var(--game-muted)" }}
        >
          <ArrowLeft className="h-5 w-5" />
        </motion.button>
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" style={{ color: "var(--game-gold)" }} />
          <h2 className="text-xl font-bold">Leaderboard</h2>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2
            className="h-6 w-6 animate-spin"
            style={{ color: "var(--game-muted)" }}
          />
        </div>
      )}

      {error && (
        <div className="text-center py-8 text-sm text-red-400">
          Failed to load leaderboard
        </div>
      )}

      {players && players.length === 0 && (
        <div
          className="text-center py-8 text-sm"
          style={{ color: "var(--game-muted)" }}
        >
          No players yet
        </div>
      )}

      {players && players.length > 0 && (
        <div className="space-y-2">
          {players.map((player, i) => {
            const isMe = player.profile_id === profileId;
            const isPodium = player.player_rank <= 3;

            const podiumGlow =
              player.player_rank === 1
                ? "0 0 12px hsla(38, 92%, 50%, 0.3)"
                : player.player_rank === 2
                  ? "0 0 12px hsla(0, 0%, 70%, 0.2)"
                  : "0 0 12px hsla(25, 70%, 50%, 0.2)";

            return (
              <motion.div
                key={player.profile_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors"
                style={{
                  background: isMe
                    ? "hsla(258, 90%, 66%, 0.1)"
                    : "var(--game-surface)",
                  borderColor: isMe
                    ? "hsla(258, 90%, 66%, 0.4)"
                    : "var(--game-border)",
                  boxShadow: isMe
                    ? "0 0 12px hsla(258, 90%, 66%, 0.2)"
                    : isPodium
                      ? podiumGlow
                      : "none",
                }}
              >
                {/* Rank */}
                <div className="w-8 text-center">
                  {isPodium ? (
                    <Medal
                      className="h-5 w-5 mx-auto"
                      style={{
                        color:
                          player.player_rank === 1
                            ? "var(--game-gold)"
                            : player.player_rank === 2
                              ? "#a8a8a8"
                              : "#cd7f32",
                      }}
                    />
                  ) : (
                    <span
                      className="text-sm font-mono"
                      style={{ color: "var(--game-muted)" }}
                    >
                      {player.player_rank}
                    </span>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {player.first_name} {player.last_name?.[0]}.
                    {isMe && (
                      <span
                        className="ml-1 text-xs"
                        style={{ color: "var(--game-accent)" }}
                      >
                        (you)
                      </span>
                    )}
                  </p>
                </div>

                {/* Score */}
                <span className="text-sm font-bold">
                  {player.total_score.toLocaleString()}
                </span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
