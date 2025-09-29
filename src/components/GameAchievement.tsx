import { Achievement } from "@/utils/gamification";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GameAchievementProps {
  achievement: Achievement;
  isNew?: boolean;
  className?: string;
}

const GameAchievement = ({ achievement, isNew = false, className = "" }: GameAchievementProps) => {
  const rarityColors = {
    common: "bg-gray-100 border-gray-300 text-gray-700",
    rare: "bg-blue-100 border-blue-300 text-blue-700",
    epic: "bg-purple-100 border-purple-300 text-purple-700",
    legendary: "bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-400 text-yellow-800",
  };

  const rarityBadgeColors = {
    common: "secondary",
    rare: "default",
    epic: "destructive",
    legendary: "outline",
  } as const;

  return (
    <Card className={`p-4 transition-all duration-300 ${rarityColors[achievement.rarity]} ${
      isNew ? "animate-pulse shadow-lg scale-105" : ""
    } ${className}`}>
      <div className="flex items-center space-x-3">
        <div className="text-2xl">{achievement.emoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm truncate">{achievement.title}</h4>
            <Badge variant={rarityBadgeColors[achievement.rarity]} className="text-xs">
              {achievement.rarity}
            </Badge>
          </div>
          <p className="text-xs opacity-80 mt-1">{achievement.description}</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-medium">+{achievement.points} pts</span>
            {isNew && (
              <Badge variant="destructive" className="text-xs animate-bounce">
                NEW!
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default GameAchievement;