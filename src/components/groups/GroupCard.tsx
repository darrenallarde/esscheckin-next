"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { Group, getNextMeetingText } from "@/hooks/queries/use-groups";
import { cn } from "@/lib/utils";

interface GroupCardProps {
  group: Group;
  onClick: () => void;
}

export function GroupCard({ group, onClick }: GroupCardProps) {
  const nextMeeting = getNextMeetingText(group.meeting_times);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md hover:border-primary/20",
        group.color && `border-l-4`
      )}
      style={group.color ? { borderLeftColor: group.color } : undefined}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold">{group.name}</CardTitle>
          {group.needs_attention_count > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              {group.needs_attention_count}
            </Badge>
          )}
        </div>
        {group.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {group.description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Member count */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {group.member_count} {group.member_count === 1 ? "student" : "students"}
            </span>
          </div>

          {/* Next meeting */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{nextMeeting}</span>
          </div>

          {/* View button */}
          <Button variant="ghost" size="sm" className="w-full justify-between mt-2">
            View Group
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
