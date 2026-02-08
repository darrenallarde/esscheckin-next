"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Lightbulb,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Users,
} from "lucide-react";
import { staggerContainer, staggerItem, tapScale } from "@/lib/game/timing";

interface GameIntroProps {
  game: {
    scripture_verses: string;
    historical_facts: { fact: string; source?: string }[];
    fun_facts: { fact: string }[];
    core_question: string;
  };
  orgName: string;
  playerCount: number;
  onStart: () => void;
}

const card = "rounded-xl p-5 border";
const cardDark = `${card} bg-white/5 border-white/10`;

export function GameIntro({
  game,
  orgName,
  playerCount,
  onStart,
}: GameIntroProps) {
  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="initial"
      animate="animate"
    >
      {/* Title */}
      <motion.div variants={staggerItem} className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Hi-Lo Game
        </h1>
        <p className="text-sm" style={{ color: "var(--game-muted)" }}>
          Can you guess the most &mdash; and least &mdash; popular answers?
        </p>
      </motion.div>

      {/* Scripture */}
      <motion.section variants={staggerItem} className={cardDark}>
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="h-4 w-4 text-blue-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Scripture
          </span>
        </div>
        <blockquote className="text-base italic leading-relaxed border-l-3 border-blue-500/40 pl-4 text-blue-100">
          {game.scripture_verses}
        </blockquote>
      </motion.section>

      {/* Fun Facts */}
      <motion.section variants={staggerItem} className={cardDark}>
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            Did you know?
          </span>
        </div>
        <ul className="space-y-2 text-sm" style={{ color: "var(--game-text)" }}>
          {game.fun_facts.map((f, i) => (
            <li key={i} className="flex gap-2">
              <Sparkles className="h-4 w-4 text-amber-400/60 shrink-0 mt-0.5" />
              <span>{f.fact}</span>
            </li>
          ))}
        </ul>
      </motion.section>

      {/* The Question */}
      <motion.section variants={staggerItem} className={cardDark}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles
            className="h-4 w-4"
            style={{ color: "var(--game-accent)" }}
          />
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--game-accent)" }}
          >
            The Question
          </span>
        </div>
        <p className="text-lg font-semibold">{game.core_question}</p>
      </motion.section>

      {/* How to play */}
      <motion.section variants={staggerItem} className={cardDark}>
        <p
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: "var(--game-muted)" }}
        >
          How to play
        </p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-lg p-3 bg-white/5 border border-white/10">
            <ArrowUp className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="font-medium">Rounds 1-2: HIGH</p>
              <p className="text-xs" style={{ color: "var(--game-muted)" }}>
                Guess the most popular answer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg p-3 bg-white/5 border border-white/10">
            <ArrowDown className="h-5 w-5 text-orange-400" />
            <div>
              <p className="font-medium">Rounds 3-4: LOW</p>
              <p className="text-xs" style={{ color: "var(--game-muted)" }}>
                Guess the least popular answer
              </p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Player count + CTA */}
      <motion.div variants={staggerItem} className="space-y-3">
        {playerCount > 0 && (
          <div
            className="flex items-center justify-center gap-1.5 text-sm"
            style={{ color: "var(--game-muted)" }}
          >
            <Users className="h-4 w-4" />
            <span>
              {playerCount} player{playerCount !== 1 ? "s" : ""} so far
            </span>
          </div>
        )}
        <motion.button
          onClick={onStart}
          whileTap={tapScale}
          className="w-full py-3.5 px-6 rounded-xl text-base font-semibold transition-all"
          style={{
            background: "var(--game-correct)",
            color: "#000",
            boxShadow: "0 0 20px hsla(142, 71%, 45%, 0.3)",
          }}
        >
          Play Now
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
