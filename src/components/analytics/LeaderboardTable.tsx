"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trophy } from "lucide-react";
import { LeaderboardEntry } from "@/hooks/queries/use-gamification";
import { cn } from "@/lib/utils";

interface LeaderboardTableProps {
  data: LeaderboardEntry[];
  loading?: boolean;
}

const positionStyles = {
  1: "bg-yellow-500/10 border-yellow-500/30",
  2: "bg-slate-300/10 border-slate-400/30",
  3: "bg-amber-700/10 border-amber-700/30",
};

const positionEmojis: Record<number, string> = {
  1: "🥇",
  2: "🥈",
  3: "🥉",
};

export function LeaderboardTable({ data, loading = false }: LeaderboardTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Full Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Full Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Rank</TableHead>
              <TableHead>Student</TableHead>
              <TableHead className="text-center">Level</TableHead>
              <TableHead className="text-right">Points</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) => (
              <TableRow
                key={entry.student_id}
                className={cn(
                  entry.position <= 3 && positionStyles[entry.position as 1 | 2 | 3]
                )}
              >
                <TableCell className="font-medium">
                  {entry.position <= 3 ? (
                    <span className="text-lg">{positionEmojis[entry.position]}</span>
                  ) : (
                    <span className="text-muted-foreground">#{entry.position}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {entry.first_name} {entry.last_name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant="secondary"
                    className="gap-1"
                    style={{
                      backgroundColor: `${entry.rank_info.color}20`,
                      color: entry.rank_info.color,
                      borderColor: entry.rank_info.color,
                    }}
                  >
                    {entry.rank_info.emoji} {entry.current_rank}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-bold" style={{ color: entry.rank_info.color }}>
                    {entry.total_points.toLocaleString()}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  No students yet. Check-ins will populate the leaderboard!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
