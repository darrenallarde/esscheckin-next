"use client";

import { useReducer, useEffect, useCallback, useState } from "react";
import { gameReducer, initialState } from "@/lib/game/state-machine";
import { getGameStatus } from "@/lib/game/utils";
import { getTheme, getThemeCSSOverrides } from "@/lib/themes";
import { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";
import { useSubmitAnswer } from "@/hooks/mutations/use-submit-answer";
import { createClient } from "@/lib/supabase/client";
import { GameIntro } from "@/components/game/GameIntro";
import { GameAuthGate } from "@/components/game/GameAuthGate";
import { GameRoundPlay } from "@/components/game/GameRoundPlay";
import { GameRoundResult } from "@/components/game/GameRoundResult";
import { GameFinalResults } from "@/components/game/GameFinalResults";
import { GameLeaderboard } from "@/components/game/GameLeaderboard";
import { GameExpired } from "@/components/game/GameExpired";
import {
  GamePrayerBonus,
  PRAYER_BONUS_POINTS,
} from "@/components/game/GamePrayerBonus";
import { Loader2 } from "lucide-react";
import type { RoundData } from "@/lib/game/state-machine";

interface GamePageProps {
  game: {
    id: string;
    organization_id: string;
    devotional_id: string;
    scripture_verses: string;
    historical_facts: { fact: string; source?: string }[];
    fun_facts: { fact: string }[];
    core_question: string;
    status: "generating" | "ready" | "active" | "completed";
    opens_at: string | null;
    closes_at: string | null;
    created_at: string;
  };
  organization: {
    id: string;
    name: string;
    display_name: string | null;
    slug: string;
    theme_id: string | null;
  };
  playerCount: number;
}

export function GamePage({ game, organization, playerCount }: GamePageProps) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialState);
  const auth = useDevotionalAuth();
  const submitMutation = useSubmitAnswer();
  const theme = getTheme(organization.theme_id);
  const themeStyles = getThemeCSSOverrides(theme);
  const orgName = organization.display_name || organization.name;

  // Check game status and restore auth on mount
  useEffect(() => {
    const init = async () => {
      // Check auth session
      const session = await auth.checkSession();
      if (session) {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from("profiles")
            .select("id, first_name")
            .eq("user_id", session.user.id)
            .single();
          if (data) {
            dispatch({
              type: "AUTH_RESTORED",
              profileId: data.id,
              firstName: data.first_name || "",
            });

            // Check for existing session (resume support)
            const { data: results } = await supabase.rpc("get_game_results", {
              p_game_id: game.id,
              p_profile_id: data.id,
            });

            if (results && Array.isArray(results) && results.length > 0) {
              const completedRounds: RoundData[] = results.map(
                (r: {
                  round_number: number;
                  submitted_answer: string;
                  on_list: boolean;
                  answer_rank: number | null;
                  round_score: number;
                  direction: string;
                }) => ({
                  roundNumber: r.round_number,
                  submittedAnswer: r.submitted_answer,
                  onList: r.on_list,
                  rank: r.answer_rank,
                  roundScore: r.round_score,
                  direction: r.direction,
                  allAnswers: [],
                }),
              );
              const totalScore = completedRounds.reduce(
                (s, r) => s + r.roundScore,
                0,
              );

              // Get session ID
              const { data: sessionData } = await supabase
                .from("game_sessions")
                .select("id")
                .eq("game_id", game.id)
                .eq("profile_id", data.id)
                .single();

              dispatch({
                type: "RESUME_SESSION",
                sessionId: sessionData?.id ?? "",
                completedRounds,
                totalScore,
              });

              // Check game status after resuming
              const status = getGameStatus(game);
              if (status !== "active") {
                dispatch({ type: "GAME_EXPIRED" });
              }
              return;
            }
          }
        } catch {
          // Best effort — continue without resume
        }
      }

      // Set game status
      const status = getGameStatus(game);
      dispatch({ type: "GAME_LOADED", gameStatus: status });
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartGame = useCallback(() => {
    // Re-check game status before starting
    const status = getGameStatus(game);
    if (status !== "active") {
      dispatch({ type: "GAME_EXPIRED" });
      return;
    }
    dispatch({ type: "START_GAME" });
  }, [game]);

  const handleAuthSuccess = useCallback(
    (profileId: string, firstName: string) => {
      dispatch({ type: "AUTH_SUCCESS", profileId, firstName });
    },
    [],
  );

  const handleSubmitAnswer = useCallback(
    async (answer: string) => {
      // Check game status before submit
      const status = getGameStatus(game);
      if (status !== "active") {
        dispatch({ type: "GAME_EXPIRED" });
        return;
      }

      dispatch({ type: "SUBMIT_ANSWER", answer });

      try {
        const result = await submitMutation.mutateAsync({
          gameId: game.id,
          roundNumber: state.currentRound,
          answer,
        });

        dispatch({
          type: "ANSWER_RESULT",
          result: {
            sessionId: result.session_id,
            roundNumber: result.round_number,
            submittedAnswer: result.submitted_answer,
            onList: result.on_list,
            rank: result.rank,
            roundScore: result.round_score,
            totalScore: result.total_score,
            direction: result.direction,
            allAnswers: result.all_answers,
          },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to submit answer";
        dispatch({ type: "SET_ERROR", error: message });
      }
    },
    [game, state.currentRound, submitMutation],
  );

  const [prayerSubmitting, setPrayerSubmitting] = useState(false);

  const handleSubmitPrayer = useCallback(
    async (prayer: string) => {
      setPrayerSubmitting(true);
      try {
        const supabase = createClient();
        await supabase.rpc("record_devotional_engagement", {
          p_devotional_id: game.devotional_id,
          p_action: "prayed",
          p_journal_text: prayer,
        });

        // Update game session score with bonus
        if (state.sessionId) {
          await supabase
            .from("game_sessions")
            .update({
              total_score: state.totalScore + PRAYER_BONUS_POINTS,
            })
            .eq("id", state.sessionId);
        }

        dispatch({
          type: "PRAYER_SUBMITTED",
          bonusPoints: PRAYER_BONUS_POINTS,
        });
      } catch {
        // Best effort — still advance to leaderboard
        dispatch({
          type: "PRAYER_SUBMITTED",
          bonusPoints: PRAYER_BONUS_POINTS,
        });
      } finally {
        setPrayerSubmitting(false);
      }
    },
    [game.devotional_id, state.sessionId, state.totalScore],
  );

  const handleNextRound = useCallback(() => {
    const status = getGameStatus(game);
    if (status !== "active") {
      dispatch({ type: "GAME_EXPIRED" });
      return;
    }
    dispatch({ type: "NEXT_ROUND" });
  }, [game]);

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100"
      style={themeStyles as React.CSSProperties}
    >
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {orgName}
            </p>
            <p className="text-sm text-muted-foreground">Hi-Lo Game</p>
          </div>
          <div className="flex items-center gap-3">
            {state.totalScore > 0 && (
              <div className="text-sm font-semibold text-stone-700">
                {state.totalScore.toLocaleString()} pts
              </div>
            )}
            {state.authenticated && state.firstName && (
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">
                    {state.firstName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={async () => {
                    await auth.signOut();
                    window.location.reload();
                  }}
                  className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {state.screen === "loading" && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
          </div>
        )}

        {state.screen === "intro" && (
          <GameIntro
            game={game}
            orgName={orgName}
            playerCount={playerCount}
            onStart={handleStartGame}
          />
        )}

        {state.screen === "auth" && (
          <GameAuthGate
            auth={auth}
            orgId={organization.id}
            orgSlug={organization.slug}
            onSuccess={handleAuthSuccess}
          />
        )}

        {state.screen === "round_play" && (
          <GameRoundPlay
            round={state.currentRound}
            question={game.core_question}
            submitting={state.submitting}
            error={state.error}
            lastMiss={state.lastMiss}
            onSubmit={handleSubmitAnswer}
            onClearError={() => dispatch({ type: "CLEAR_ERROR" })}
          />
        )}

        {state.screen === "round_result" && state.rounds.length > 0 && (
          <GameRoundResult
            round={state.rounds[state.rounds.length - 1]}
            currentRound={state.currentRound}
            totalScore={state.totalScore}
            onNext={handleNextRound}
          />
        )}

        {state.screen === "final_results" && (
          <GameFinalResults
            rounds={state.rounds}
            totalScore={state.totalScore}
            firstName={state.firstName}
            onGoToPrayer={() => dispatch({ type: "GO_TO_PRAYER" })}
            onViewLeaderboard={() => dispatch({ type: "VIEW_LEADERBOARD" })}
          />
        )}

        {state.screen === "prayer_bonus" && (
          <GamePrayerBonus
            firstName={state.firstName}
            onSubmit={handleSubmitPrayer}
            onSkip={() => dispatch({ type: "SKIP_PRAYER" })}
            submitting={prayerSubmitting}
          />
        )}

        {state.screen === "leaderboard" && (
          <GameLeaderboard
            gameId={game.id}
            profileId={state.profileId}
            onBack={() => dispatch({ type: "BACK_TO_RESULTS" })}
          />
        )}

        {state.screen === "expired" && (
          <GameExpired
            game={game}
            onViewLeaderboard={() => dispatch({ type: "VIEW_LEADERBOARD" })}
          />
        )}
      </main>
    </div>
  );
}
