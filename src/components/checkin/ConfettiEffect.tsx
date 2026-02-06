"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  velocity: {
    x: number;
    y: number;
    rotation: number;
  };
}

interface ConfettiEffectProps {
  active: boolean;
  duration?: number;
}

const CONFETTI_COLORS = [
  "#F59E0B", "#10B981", "#6366F1", "#EC4899", "#3B82F6",
  "#F97316",
];

const ConfettiEffect = ({ active, duration = 3000 }: ConfettiEffectProps) => {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [isVisible, setIsVisible] = useState(false);


  useEffect(() => {
    if (!active) return;

    const generatePieces = () => {
      const pieces: ConfettiPiece[] = [];

      for (let i = 0; i < 15; i++) {
        pieces.push({
          id: i,
          x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
          y: -10,
          rotation: Math.random() * 360,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          size: Math.random() * 8 + 4,
          velocity: {
            x: (Math.random() - 0.5) * 4,
            y: Math.random() * 3 + 2,
            rotation: (Math.random() - 0.5) * 10,
          },
        });
      }

      return pieces;
    };

    setIsVisible(true);
    setConfetti(generatePieces());

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setConfetti([]), 1000);
    }, duration);

    return () => clearTimeout(timer);
  }, [active, duration]);

  useEffect(() => {
    if (confetti.length === 0) return;

    const animationFrame = setInterval(() => {
      setConfetti(prev =>
        prev.map(piece => ({
          ...piece,
          x: piece.x + piece.velocity.x,
          y: piece.y + piece.velocity.y,
          rotation: piece.rotation + piece.velocity.rotation,
        })).filter(piece => piece.y < (typeof window !== 'undefined' ? window.innerHeight : 1000) + 50)
      );
    }, 16);

    return () => clearInterval(animationFrame);
  }, [confetti.length]);

  if (!isVisible && confetti.length === 0) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none z-50 transition-opacity duration-1000 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: piece.x,
            top: piece.y,
            transform: `rotate(${piece.rotation}deg)`,
            backgroundColor: piece.color,
            width: piece.size,
            height: piece.size,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
};

export default ConfettiEffect;
