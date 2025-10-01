import * as React from "react";
import { useEffect, useState } from "react";
import CheckInForm from "@/components/CheckInForm";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import "../jrpg.css";

const Index = () => {
  const navigate = useNavigate();
  const [stars, setStars] = useState<Array<{top: string, left: string, delay: string}>>([]);
  const [verseIndex, setVerseIndex] = useState(0);

  const verses = [
    { text: "For I know the plans I have for you, declares the LORD, plans to prosper you and not to harm you, plans to give you hope and a future.", reference: "Jeremiah 29:11" },
    { text: "Trust in the LORD with all your heart and lean not on your own understanding.", reference: "Proverbs 3:5" },
    { text: "I can do all things through Christ who strengthens me.", reference: "Philippians 4:13" },
    { text: "Be strong and courageous. Do not be afraid; do not be discouraged, for the LORD your God will be with you wherever you go.", reference: "Joshua 1:9" },
    { text: "The LORD is my shepherd, I lack nothing.", reference: "Psalm 23:1" },
    { text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God.", reference: "Philippians 4:6" },
  ];

  // Generate random stars on mount
  useEffect(() => {
    const starArray = Array.from({ length: 50 }, () => ({
      top: `${Math.random() * 100}%`,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 3}s`
    }));
    setStars(starArray);
  }, []);

  // Function to cycle to next verse (called after check-in)
  const nextVerse = () => {
    setVerseIndex((prev) => (prev + 1) % verses.length);
  };

  return (
    <div className="jrpg-background min-h-screen relative">
      {/* Animated starfield */}
      <div className="jrpg-stars">
        {stars.map((star, i) => (
          <div
            key={i}
            className="jrpg-star"
            style={{
              top: star.top,
              left: star.left,
              animationDelay: star.delay
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Hidden admin access - only accessible via direct URL /auth */}
        <div className="mb-8">
          {/* Admin login button removed for cleaner student experience */}
        </div>

        <div className="text-center mb-12">
          <h1 className="jrpg-font text-3xl md:text-5xl mb-8 drop-shadow-lg jrpg-float" style={{ color: '#2F4F2F' }}>
            🌿 CHECK IN 🌿
          </h1>
          <div className="jrpg-textbox max-w-2xl mx-auto mb-4 transition-opacity duration-500">
            <p className="jrpg-font text-xs md:text-sm text-gray-700 leading-relaxed italic mb-2">
              "{verses[verseIndex].text}"
            </p>
            <p className="jrpg-font text-xs text-gray-600 text-right">
              — {verses[verseIndex].reference}
            </p>
          </div>
        </div>

        <CheckInForm onCheckInComplete={nextVerse} />
      </div>
    </div>
  );
};

export default Index;
