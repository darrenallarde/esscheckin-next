"use client";

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
  color = "bg-emerald-500",
}: GameScoreBarProps) {
  const pct = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-stone-500">
          <span>{label}</span>
          <span className="font-medium text-stone-700">{score}</span>
        </div>
      )}
      <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
