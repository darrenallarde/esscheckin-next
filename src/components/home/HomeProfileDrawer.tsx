"use client";

/**
 * HomeProfileDrawer - Mobile-first profile quick-view using a vaul bottom-sheet Drawer.
 *
 * Used exclusively on the home page (/home) to keep users in-context when tapping
 * a student name. Other pages continue to use PersonProfileModal (Dialog).
 *
 * Composes basic profile info, contact details, groups, and quick stats.
 * Provides "Send Text" to transition into HomeMessageDrawer and a "View Full Profile"
 * fallback link for the rare case full detail is needed.
 */

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Mail,
  GraduationCap,
  Users,
  MessageSquare,
  ExternalLink,
  Trophy,
  Flame,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export interface HomeProfilePerson {
  profile_id: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  email: string | null;
  grade: string | null;
  gender: string | null;
  high_school: string | null;
  groups?: Array<{ id: string; name: string; color: string | null }>;
  group_names?: string[];
  last_check_in?: string | null;
  days_since_last_check_in?: number | null;
  total_check_ins?: number;
  current_rank?: string;
  total_points?: number;
}

interface HomeProfileDrawerProps {
  person: HomeProfilePerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendMessage?: (person: HomeProfilePerson) => void;
  orgSlug?: string;
}

function getBelongingBadge(days: number | null | undefined) {
  if (days === null || days === undefined) return null;
  if (days <= 7) return { label: "Connected", variant: "default" as const };
  if (days <= 21) return { label: "Drifting", variant: "secondary" as const };
  if (days <= 45) return { label: "Distant", variant: "outline" as const };
  return { label: "Missing", variant: "destructive" as const };
}

function formatLastSeen(days: number | null | undefined): string {
  if (days === null || days === undefined) return "Never checked in";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
  }
  return phone;
}

export function HomeProfileDrawer({
  person,
  open,
  onOpenChange,
  onSendMessage,
  orgSlug,
}: HomeProfileDrawerProps) {
  if (!person) return null;

  const belongingBadge = getBelongingBadge(person.days_since_last_check_in);
  const groupList = person.groups?.map((g) => g.name) ?? person.group_names ?? [];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh] mx-auto max-w-lg">
        <DrawerHeader className="text-left border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <DrawerTitle className="text-xl">
                {person.first_name} {person.last_name}
              </DrawerTitle>
              <DrawerDescription className="flex items-center gap-2 mt-1">
                {person.grade && (
                  <Badge variant="secondary" className="text-xs">
                    {person.grade}th Grade
                  </Badge>
                )}
                {person.gender && (
                  <Badge variant="outline" className="text-xs">
                    {person.gender === "male" ? "M" : "F"}
                  </Badge>
                )}
                {belongingBadge && (
                  <Badge variant={belongingBadge.variant} className="text-xs">
                    {belongingBadge.label}
                  </Badge>
                )}
              </DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-4 py-4 space-y-5">
          {/* Contact Info */}
          <div className="space-y-2">
            {person.phone_number && (
              <a
                href={`tel:${person.phone_number}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{formatPhone(person.phone_number)}</span>
              </a>
            )}
            {person.email && (
              <a
                href={`mailto:${person.email}`}
                className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{person.email}</span>
              </a>
            )}
            {person.high_school && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <GraduationCap className="h-4 w-4 shrink-0" />
                <span>{person.high_school}</span>
              </div>
            )}
          </div>

          {/* Groups */}
          {groupList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" />
                Groups
              </div>
              <div className="flex flex-wrap gap-1.5">
                {groupList.map((name) => (
                  <Badge key={name} variant="secondary" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          {(person.total_check_ins !== undefined || person.current_rank || person.total_points !== undefined) && (
            <div className="grid grid-cols-3 gap-3">
              {person.total_check_ins !== undefined && (
                <div className="rounded-lg border p-3 text-center">
                  <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                  <div className="text-lg font-semibold">{person.total_check_ins}</div>
                  <div className="text-[10px] text-muted-foreground">Check-ins</div>
                </div>
              )}
              {person.current_rank && (
                <div className="rounded-lg border p-3 text-center">
                  <Trophy className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                  <div className="text-sm font-semibold truncate">{person.current_rank}</div>
                  <div className="text-[10px] text-muted-foreground">Rank</div>
                </div>
              )}
              {person.total_points !== undefined && (
                <div className="rounded-lg border p-3 text-center">
                  <Flame className="h-4 w-4 mx-auto text-orange-500 mb-1" />
                  <div className="text-lg font-semibold">{person.total_points}</div>
                  <div className="text-[10px] text-muted-foreground">Points</div>
                </div>
              )}
            </div>
          )}

          {/* Last Seen */}
          <div className="text-xs text-muted-foreground text-center">
            Last seen: {formatLastSeen(person.days_since_last_check_in)}
          </div>
        </div>

        <DrawerFooter className="border-t pt-3">
          <div className="flex gap-2 w-full">
            {person.phone_number && onSendMessage && (
              <Button
                className="flex-1"
                onClick={() => onSendMessage(person)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Text
              </Button>
            )}
            {orgSlug && (
              <Button variant="outline" className="flex-1" asChild>
                <Link href={`/${orgSlug}/people?profile=${person.profile_id}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Full Profile
                </Link>
              </Button>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
