"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, MessageSquare, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { SmsConversation } from "@/hooks/queries/use-sms-inbox";

interface RecentMessagesProps {
  data: SmsConversation[];
  loading?: boolean;
  viewAllHref?: string;
  onConversationClick?: (conversation: SmsConversation) => void;
}

function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `(${last10.slice(0, 3)}) ${last10.slice(3, 6)}-${last10.slice(6)}`;
  }
  return phone;
}

export function RecentMessages({
  data,
  loading = false,
  viewAllHref = "/messages",
  onConversationClick,
}: RecentMessagesProps) {
  // Calculate total unread across all conversations
  const totalUnread = data.reduce((sum, conv) => sum + conv.unreadCount, 0);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            Recent Messages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4 text-blue-500" />
          Recent Messages
          {totalUnread > 0 && (
            <Badge variant="destructive" className="text-[10px] h-5 px-1.5">
              {totalUnread} new
            </Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
          <Link href={viewAllHref}>
            View All
            <ChevronRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {data.slice(0, 4).map((conv) => {
            const isInbound = conv.lastMessageDirection === "inbound";
            const DirectionIcon = isInbound ? ArrowDownLeft : ArrowUpRight;

            return (
              <button
                key={conv.phoneNumber}
                onClick={() => onConversationClick?.(conv)}
                className={cn(
                  "w-full flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50 text-left cursor-pointer",
                  conv.unreadCount > 0 && "border-blue-500/30 bg-blue-500/5"
                )}
              >
                {/* Direction Icon */}
                <div className="mt-0.5">
                  <DirectionIcon
                    className={cn(
                      "h-4 w-4",
                      isInbound ? "text-green-500" : "text-muted-foreground"
                    )}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {conv.studentName || formatPhoneNumber(conv.phoneNumber)}
                    </span>
                    {conv.unreadCount > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                        {conv.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {isInbound ? "" : "You: "}
                    {conv.lastMessage}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.lastMessageAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </button>
            );
          })}

          {data.length === 0 && (
            <div className="py-6 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                No messages yet
              </p>
              <p className="text-xs text-muted-foreground">
                Student texts will appear here.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
