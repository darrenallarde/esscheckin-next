"use client";

import { useReducer, useEffect, useCallback, useState, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gameReducer, initialState } from "@/lib/game/state-machine";
import { getGameStatus, getRoundDirection } from "@/lib/game/utils";
import { getTheme, getThemeCSSOverrides } from "@/lib/themes";
import { useDevotionalAuth } from "@/hooks/queries/use-devotional-auth";
import { useSubmitAnswer } from "@/hooks/mutations/use-submit-answer";
import { useOrgLeaderContact } from "@/hooks/queries/use-org-leader-contact";
import { useRevealSequence } from "@/hooks/game/use-reveal-sequence";
import { useGameAudio } from "@/hooks/game/use-game-audio";
import { useHaptics } from "@/hooks/game/use-haptics";
import { useConfetti } from "@/hooks/game/use-confetti";
import { createClient } from "@/lib/supabase/client";
import { GameIntro } from "@/components/game/GameIntro";
import { GameAuthGate } from "@/components/game/GameAuthGate";
import { GameRoundPlay } from "@/components/game/GameRoundPlay";
import { GameRoundResult } from "@/components/game/GameRoundResult";
import { GameFinalResults } from "@/components/game/GameFinalResults";
import { GameLeaderboard } from "@/components/game/GameLeaderboard";
import { GameExpired } from "@/components/game/GameExpired";
import { GameHalftime } from "@/components/game/GameHalftime";
import {
  GamePrayerBonus,
  PRAYER_BONUS_POINTS,
} from "@/components/game/GamePrayerBonus";
import { GameRevealOverlay } from "@/components/game/GameRevealOverlay";
import { GameRoundInterstitial } from "@/components/game/GameRoundInterstitial";
import { AnimatedNumber } from "@/components/game/AnimatedNumber";
import { screenVariants } from "@/lib/game/timing";
import { Loader2, Volume2, VolumeX } from "lucide-react";
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
    answer_count?: number;
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
  const reveal = useRevealSequence();
  const audio = useGameAudio();
  const haptics = useHaptics();
  const confettiEffects = useConfetti();
  const theme = getTheme(organization.theme_id);
  const themeStyles = getThemeCSSOverrides(theme);
  const orgName = organization.display_name || organization.name;
  const answerCount = game.answer_count || 400;

  // Hold pending API result during reveal buildup
  const pendingResultRef = useRef<{
    sessionId: string;
    roundNumber: number;
    submittedAnswer: string;
    onList: boolean;
    rank: number | null;
    roundScore: number;
    totalScore: number;
    direction: string;
    allAnswers: { answer: string; rank: number }[];
  } | null>(null);

  // Interstitial state
  const [interstitial, setInterstitial] = useState<{
    visible: boolean;
    roundNumber: number;
    direction: "high" | "low";
  }>({ visible: false, roundNumber: 2, direction: "high" });

  // Fetch org leader contact for "Message Pastor" button
  const { data: leaderContactData } = useOrgLeaderContact(organization.id);
  const leaderContact =
    leaderContactData?.first_name && leaderContactData?.phone_number
      ? {
          name: leaderContactData.first_name,
          phone: leaderContactData.phone_number,
        }
      : null;

  // Game score = sum of round scores only (no prayer bonus)
  const gameScore = state.rounds.reduce((s, r) => s + r.roundScore, 0);

  // Streak: count consecutive high-score rounds from the end
  const streakCount = (() => {
    let count = 0;
    for (let i = state.rounds.length - 1; i >= 0; i--) {
      if (state.rounds[i].roundScore > 0) count++;
      else break;
    }
    return count;
  })();

  const { muted, toggleMute } = audio;

  // Check game status and restore auth on mount
  useEffect(() => {
    const init = async () => {
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
              const roundScoreSum = completedRounds.reduce(
                (s, r) => s + r.roundScore,
                0,
              );

              const { data: sessionData } = await supabase
                .from("game_sessions")
                .select("id, total_score")
                .eq("game_id", game.id)
                .eq("profile_id", data.id)
                .single();

              const dbTotalScore = sessionData?.total_score ?? roundScoreSum;
              const prayerBonusAwarded = dbTotalScore > roundScoreSum;

              dispatch({
                type: "RESUME_SESSION",
                sessionId: sessionData?.id ?? "",
                completedRounds,
                totalScore: dbTotalScore,
                prayerBonusAwarded,
              });

              const status = getGameStatus(game);
              if (status !== "active") {
                dispatch({ type: "GAME_EXPIRED" });
              }
              return;
            }
          }
        } catch {
          // Best effort
        }
      }

      const status = getGameStatus(game);
      dispatch({ type: "GAME_LOADED", gameStatus: status });
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartGame = useCallback(() => {
    audio.unlock();
    audio.play("tap");
    const status = getGameStatus(game);
    if (status !== "active") {
      dispatch({ type: "GAME_EXPIRED" });
      return;
    }
    dispatch({ type: "START_GAME" });
  }, [game, audio]);

  const handleAuthSuccess = useCallback(
    (profileId: string, firstName: string) => {
      audio.play("whoosh");
      dispatch({ type: "AUTH_SUCCESS", profileId, firstName });
    },
    [audio],
  );

  const handleSubmitAnswer = useCallback(
    async (answer: string) => {
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

        const resultPayload = {
          sessionId: result.session_id,
          roundNumber: result.round_number,
          submittedAnswer: result.submitted_answer,
          onList: result.on_list,
          rank: result.rank,
          roundScore: result.round_score,
          totalScore: result.total_score,
          direction: result.direction,
          allAnswers: result.all_answers,
        };

        if (result.on_list) {
          // HIT: hold result, run dramatic buildup, then dispatch
          pendingResultRef.current = resultPayload;
          audio.play("lock_in");
          reveal.startHitReveal(() => {
            audio.play("correct");
            haptics.vibrate("correct");
            // Streak escalation: if this hit makes 2+ consecutive, fire streak effects
            const hitCount =
              state.rounds.filter((r) => r.roundScore > 0).length + 1;
            const isStreak =
              hitCount >= 2 &&
              state.rounds.length > 0 &&
              state.rounds[state.rounds.length - 1].roundScore > 0;
            if (isStreak) {
              confettiEffects.fire("streak");
              audio.play("streak", { rate: 1 + (hitCount - 2) * 0.15 });
            } else {
              confettiEffects.fire("hit");
            }
            const pending = pendingResultRef.current;
            if (pending) {
              dispatch({ type: "ANSWER_RESULT", result: pending });
              pendingResultRef.current = null;
            }
          });
          // Start drumroll after lock-in phase
          setTimeout(() => audio.play("drumroll"), 200);
        } else {
          // MISS: quick lock-in then dispatch immediately
          audio.play("lock_in");
          reveal.startMissReveal(() => {
            audio.play("wrong");
            haptics.vibrate("wrong");
            dispatch({ type: "ANSWER_RESULT", result: resultPayload });
          });
        }
      } catch (err) {
        reveal.reset();
        const message =
          err instanceof Error ? err.message : "Failed to submit answer";
        dispatch({ type: "SET_ERROR", error: message });
      }
    },
    [
      game,
      state.currentRound,
      submitMutation,
      reveal,
      audio,
      haptics,
      confettiEffects,
    ],
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

        const isFirstPrayer = !state.prayerBonusAwarded;
        if (isFirstPrayer && state.sessionId) {
          const { error } = await supabase
            .from("game_sessions")
            .update({
              total_score: state.totalScore + PRAYER_BONUS_POINTS,
            })
            .eq("id", state.sessionId);

          if (error) {
            dispatch({
              type: "PRAYER_SUBMITTED",
              bonusPoints: 0,
            });
            return;
          }
        }

        audio.play("prayer");
        haptics.vibrate("correct");
        confettiEffects.fire("prayer");
        dispatch({
          type: "PRAYER_SUBMITTED",
          bonusPoints: PRAYER_BONUS_POINTS,
        });
      } catch {
        dispatch({
          type: "PRAYER_SUBMITTED",
          bonusPoints: 0,
        });
      } finally {
        setPrayerSubmitting(false);
      }
    },
    [
      game.devotional_id,
      state.sessionId,
      state.totalScore,
      state.prayerBonusAwarded,
      audio,
      haptics,
      confettiEffects,
    ],
  );

  const handleNextRound = useCallback(() => {
    const status = getGameStatus(game);
    if (status !== "active") {
      dispatch({ type: "GAME_EXPIRED" });
      return;
    }

    // If there's a next round, show interstitial first
    audio.play("tap");
    if (state.currentRound < 4) {
      const nextRound = state.currentRound + 1;
      const nextDirection = getRoundDirection(nextRound);
      setInterstitial({
        visible: true,
        roundNumber: nextRound,
        direction: nextDirection,
      });
      audio.play("whoosh");
      reveal.showInterstitial(() => {
        setInterstitial((prev) => ({ ...prev, visible: false }));
        dispatch({ type: "NEXT_ROUND" });
      });
    } else {
      audio.play("finale");
      haptics.vibrate("bigReveal");
      confettiEffects.fire("finale");
      dispatch({ type: "NEXT_ROUND" });
    }
  }, [game, state.currentRound, reveal, audio, haptics, confettiEffects]);

  return (
    <div
      data-game-theme="dark"
      className="min-h-[100dvh] select-none"
      style={{
        ...(themeStyles as React.CSSProperties),
        background: "var(--game-bg)",
        color: "var(--game-text)",
        touchAction: "manipulation",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {/* Reveal overlay (buildup phase) */}
      <GameRevealOverlay visible={reveal.phase === "buildup"} />

      {/* Round interstitial */}
      <GameRoundInterstitial
        visible={interstitial.visible}
        roundNumber={interstitial.roundNumber}
        direction={interstitial.direction}
      />

      {/* Header */}
      <header
        className="sticky top-0 z-10 backdrop-blur-md border-b"
        style={{
          background: "hsla(230, 15%, 8%, 0.9)",
          borderColor: "var(--game-border)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--game-accent)" }}
            >
              {orgName}
            </p>
            <p className="text-sm" style={{ color: "var(--game-muted)" }}>
              Hi-Lo Game
            </p>
          </div>
          <div className="flex items-center gap-3">
            {state.totalScore > 0 && (
              <AnimatedNumber
                value={state.totalScore}
                className="text-sm font-bold"
                suffix=" pts"
              />
            )}
            {state.authenticated && state.firstName && (
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center"
                style={{ background: "hsla(260, 60%, 60%, 0.2)" }}
              >
                <span
                  className="text-xs font-bold"
                  style={{ color: "var(--game-accent)" }}
                >
                  {state.firstName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <button
              onClick={toggleMute}
              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
              style={{ color: "var(--game-muted)" }}
              aria-label={muted ? "Unmute" : "Mute"}
            >
              {muted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {state.screen === "loading" && (
            <motion.div
              key="loading"
              {...screenVariants}
              className="flex items-center justify-center py-20"
            >
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: "var(--game-muted)" }}
              />
            </motion.div>
          )}

          {state.screen === "intro" && (
            <motion.div key="intro" {...screenVariants}>
              <GameIntro
                game={game}
                orgName={orgName}
                playerCount={playerCount}
                onStart={handleStartGame}
              />
            </motion.div>
          )}

          {state.screen === "auth" && (
            <motion.div key="auth" {...screenVariants}>
              <GameAuthGate
                auth={auth}
                orgId={organization.id}
                onSuccess={handleAuthSuccess}
              />
            </motion.div>
          )}

          {state.screen === "round_play" && (
            <motion.div
              key={`round-play-${state.currentRound}`}
              {...screenVariants}
            >
              <GameRoundPlay
                round={state.currentRound}
                question={game.core_question}
                submitting={state.submitting}
                error={state.error}
                lastMiss={state.lastMiss}
                revealPhase={reveal.phase}
                onSubmit={handleSubmitAnswer}
                onClearError={() => dispatch({ type: "CLEAR_ERROR" })}
              />
            </motion.div>
          )}

          {state.screen === "round_result" && state.rounds.length > 0 && (
            <motion.div
              key={`round-result-${state.rounds.length}`}
              {...screenVariants}
            >
              <GameRoundResult
                round={state.rounds[state.rounds.length - 1]}
                currentRound={state.currentRound}
                totalScore={state.totalScore}
                answerCount={answerCount}
                streakCount={streakCount}
                onNext={handleNextRound}
              />
            </motion.div>
          )}

          {state.screen === "halftime" && (
            <motion.div key="halftime" {...screenVariants}>
              <GameHalftime
                game={game}
                totalScore={state.totalScore}
                onContinue={() => dispatch({ type: "CONTINUE_HALFTIME" })}
              />
            </motion.div>
          )}

          {state.screen === "final_results" && (
            <motion.div key="final-results" {...screenVariants}>
              <GameFinalResults
                rounds={state.rounds}
                totalScore={state.totalScore}
                gameScore={gameScore}
                firstName={state.firstName}
                answerCount={answerCount}
                prayerBonusAwarded={state.prayerBonusAwarded}
                prayerCount={state.prayerCount}
                leaderContact={leaderContact}
                game={game}
                onGoToPrayer={() => dispatch({ type: "GO_TO_PRAYER" })}
                onViewLeaderboard={() => dispatch({ type: "VIEW_LEADERBOARD" })}
              />
            </motion.div>
          )}

          {state.screen === "prayer_bonus" && (
            <motion.div key="prayer-bonus" {...screenVariants}>
              <GamePrayerBonus
                firstName={state.firstName}
                prayerBonusAwarded={state.prayerBonusAwarded}
                onSubmit={handleSubmitPrayer}
                onSkip={() => dispatch({ type: "SKIP_PRAYER" })}
                submitting={prayerSubmitting}
              />
            </motion.div>
          )}

          {state.screen === "leaderboard" && (
            <motion.div key="leaderboard" {...screenVariants}>
              <GameLeaderboard
                gameId={game.id}
                profileId={state.profileId}
                onBack={() => dispatch({ type: "BACK_TO_RESULTS" })}
              />
            </motion.div>
          )}

          {state.screen === "expired" && (
            <motion.div key="expired" {...screenVariants}>
              <GameExpired
                game={game}
                onViewLeaderboard={() => dispatch({ type: "VIEW_LEADERBOARD" })}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
