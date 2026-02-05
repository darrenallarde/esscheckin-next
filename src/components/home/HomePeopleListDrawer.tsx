"use client";

/**
 * HomePeopleListDrawer - Shows a list of people for a belonging status.
 *
 * Opens from the BelongingSpectrum on the home page. Each person row is
 * tappable to open the HomeProfileDrawer for that person.
 */

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";
import { BelongingStatus } from "@/types/pastoral";

export interface BelongingPerson {
  id: string;
  first_name: string;
  last_name: string;
  days_since_last_seen: number;
  grade: string | null;
}

interface HomePeopleListDrawerProps {
  status: BelongingStatus | null;
  people: BelongingPerson[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonClick?: (person: BelongingPerson) => void;
}

const statusColors: Record<BelongingStatus, string> = {
  "Ultra-Core": "bg-green-700",
  "Core": "bg-green-500",
  "Connected": "bg-green-400",
  "On the Fringe": "bg-amber-400",
  "Missing": "bg-red-400",
};

function formatLastSeen(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  if (days < 9999) return `${Math.floor(days / 30)}mo ago`;
  return "Never";
}

export function HomePeopleListDrawer({
  status,
  people,
  open,
  onOpenChange,
  onPersonClick,
}: HomePeopleListDrawerProps) {
  if (!status) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="min-h-[60vh] max-h-[85vh] mx-auto max-w-2xl">
        <DrawerHeader className="text-left border-b pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
            <DrawerTitle>{status}</DrawerTitle>
          </div>
          <DrawerDescription>
            {people.length} {people.length === 1 ? "student" : "students"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="overflow-y-auto px-2 py-2">
          {people.map((person) => (
            <button
              key={person.id}
              onClick={() => onPersonClick?.(person)}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {person.first_name} {person.last_name}
                  </span>
                  {person.grade && (
                    <Badge variant="outline" className="text-[10px] h-5 shrink-0">
                      {person.grade}th
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last seen: {formatLastSeen(person.days_since_last_seen)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
