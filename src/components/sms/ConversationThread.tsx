"use client";

import { useEffect, useRef } from "react";
import { SmsMessage } from "@/hooks/queries/use-sms-conversation";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationThreadProps {
  messages: SmsMessage[];
  loading?: boolean;
  className?: string;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) {
    return timeStr;
  } else if (diffDays === 1) {
    return `Yesterday ${timeStr}`;
  } else if (diffDays < 7) {
    return `${date.toLocaleDateString("en-US", { weekday: "short" })} ${timeStr}`;
  } else {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

function ChatBubble({ message, isNew }: { message: SmsMessage; isNew?: boolean }) {
  const isOutbound = message.direction === "outbound";

  return (
    <div
      className={cn(
        "flex w-full animate-in fade-in-0 duration-300",
        isOutbound ? "justify-end" : "justify-start",
        isNew && (isOutbound ? "slide-in-from-right-2" : "slide-in-from-left-2")
      )}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2 shadow-sm",
          isOutbound
            ? "bg-primary text-primary-foreground rounded-br-md"
            : "bg-muted rounded-bl-md"
        )}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.body}</p>
        <div
          className={cn(
            "flex items-center gap-1.5 mt-1 text-xs",
            isOutbound ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
          )}
        >
          {isOutbound && message.sent_by_name && (
            <>
              <span>{message.sent_by_name}</span>
              <span>·</span>
            </>
          )}
          <span>{formatTime(message.created_at)}</span>
          {isOutbound && message.status && (
            <>
              <span>·</span>
              <span className="capitalize">{message.status}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConversationThread({
  messages,
  loading,
  className,
}: ConversationThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(messages.length);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Track which messages are new
  useEffect(() => {
    prevLengthRef.current = messages.length;
  }, [messages.length]);

  if (loading) {
    return (
      <div className={cn("flex flex-col gap-3 p-4", className)}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
            <Skeleton className={cn("h-12 rounded-2xl", i % 2 === 0 ? "w-48" : "w-56")} />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
        <MessageCircle className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground">No messages yet</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Send a message to start the conversation
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "flex flex-col gap-2 overflow-y-auto p-4 scroll-smooth",
        className
      )}
    >
      {messages.map((message, index) => (
        <ChatBubble
          key={message.id}
          message={message}
          isNew={index >= prevLengthRef.current}
        />
      ))}
    </div>
  );
}
