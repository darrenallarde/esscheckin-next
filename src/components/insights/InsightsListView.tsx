"use client";

import { useState } from "react";
import { User, Calendar, Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useTrack } from "@/lib/amplitude/hooks";
import { EVENTS } from "@/lib/amplitude/events";
import type { PersonResult, BelongingLevel } from "@/lib/insights/types";

interface InsightsListViewProps {
  people: PersonResult[];
  organizationId?: string | null;
  onPersonClick?: (person: PersonResult) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (profileId: string) => void;
}

const BELONGING_COLORS: Record<BelongingLevel, string> = {
  ultra_core: "bg-purple-100 text-purple-800",
  core: "bg-blue-100 text-blue-800",
  connected: "bg-green-100 text-green-800",
  fringe: "bg-yellow-100 text-yellow-800",
  missing: "bg-red-100 text-red-800",
  new: "bg-gray-100 text-gray-800",
};

const BELONGING_LABELS: Record<BelongingLevel, string> = {
  ultra_core: "Ultra Core",
  core: "Core",
  connected: "Connected",
  fringe: "Fringe",
  missing: "Missing",
  new: "New",
};

function formatLastSeen(dateStr?: string): string {
  if (!dateStr) return "Never";

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

export function InsightsListView({
  people,
  onPersonClick,
  selectedIds,
  onToggleSelection,
}: InsightsListViewProps) {
  const track = useTrack();
  const [showAll, setShowAll] = useState(false);
  const hasSelection = selectedIds !== undefined && onToggleSelection !== undefined;

  const displayedPeople = showAll ? people : people.slice(0, 10);
  const hasMore = people.length > 10;

  const handlePersonClick = (person: PersonResult) => {
    track(EVENTS.INSIGHTS_PERSON_CLICKED, {
      profile_id: person.profileId,
      context: "list_view",
    });

    onPersonClick?.(person);
  };

  // Mobile card view
  const MobileCard = ({ person }: { person: PersonResult }) => (
    <Card
      className="cursor-pointer hover:bg-accent"
      onClick={() => handlePersonClick(person)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Selection checkbox */}
          {hasSelection && (
            <Checkbox
              checked={selectedIds.has(person.profileId)}
              onCheckedChange={() => onToggleSelection(person.profileId)}
              onClick={(e) => e.stopPropagation()}
              className="mt-1"
            />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="font-medium">
                  {person.firstName} {person.lastName}
                </div>
                {person.grade && (
                  <div className="text-sm text-muted-foreground">
                    Grade {person.grade}
                  </div>
                )}
              </div>
              {person.belongingLevel && (
                <Badge
                  variant="secondary"
                  className={BELONGING_COLORS[person.belongingLevel]}
                >
                  {BELONGING_LABELS[person.belongingLevel]}
                </Badge>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted-foreground">
              {person.lastCheckIn && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatLastSeen(person.lastCheckIn)}
                </div>
              )}
              {person.groups && person.groups.length > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {person.groups[0].name}
                  {person.groups.length > 1 && ` +${person.groups.length - 1}`}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {hasSelection && <TableHead className="w-10"></TableHead>}
                <TableHead>Name</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead>Groups</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedPeople.map((person) => (
                <TableRow
                  key={person.profileId}
                  className="cursor-pointer hover:bg-accent"
                  onClick={() => handlePersonClick(person)}
                >
                  {hasSelection && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(person.profileId)}
                        onCheckedChange={() => onToggleSelection(person.profileId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    {person.firstName} {person.lastName}
                  </TableCell>
                  <TableCell>{person.grade || "-"}</TableCell>
                  <TableCell>{formatLastSeen(person.lastCheckIn)}</TableCell>
                  <TableCell>
                    {person.groups && person.groups.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {person.groups[0].name}
                        </Badge>
                        {person.groups.length > 1 && (
                          <Badge variant="outline" className="text-xs">
                            +{person.groups.length - 1}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {person.belongingLevel && (
                      <Badge
                        variant="secondary"
                        className={BELONGING_COLORS[person.belongingLevel]}
                      >
                        {BELONGING_LABELS[person.belongingLevel]}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid gap-3 md:hidden">
        {displayedPeople.map((person) => (
          <MobileCard key={person.profileId} person={person} />
        ))}
      </div>

      {/* Show More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="w-full md:w-auto"
          >
            {showAll
              ? "Show less"
              : `Show all ${people.length} students`}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {people.length === 0 && (
        <div className="py-12 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No students found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your search criteria or quick reply
          </p>
        </div>
      )}
    </div>
  );
}
