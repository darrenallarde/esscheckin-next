"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Database, Cloud, Server } from "lucide-react";
import { cn } from "@/lib/utils";

const PROVIDER_ICONS: Record<string, typeof Database> = {
  rock: Server,
  planning_center: Cloud,
  ccb: Database,
};

interface Props {
  provider: string;
  name: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export function ChmsProviderCard({
  provider,
  name,
  description,
  selected,
  onClick,
}: Props) {
  const Icon = PROVIDER_ICONS[provider] || Database;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:border-primary/50",
        selected && "border-primary bg-primary/5"
      )}
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            selected ? "bg-primary/20" : "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-6 w-6",
              selected ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <div>
          <p className="font-semibold">{name}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
