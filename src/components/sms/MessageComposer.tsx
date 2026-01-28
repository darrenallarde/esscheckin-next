"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Sparkles } from "lucide-react";
import { QuickTemplatePills } from "./QuickTemplatePills";
import { useSendSms } from "@/hooks/useSendSms";
import { useRefreshConversation } from "@/hooks/queries/use-sms-conversation";
import { playSendSound } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MessageComposerProps {
  studentId: string;
  phoneNumber: string;
  personName?: string;
  aiSuggestion?: string | null;
  onSuggestMessage?: () => void;
  isLoadingAiSuggestion?: boolean;
  className?: string;
}

export function MessageComposer({
  studentId,
  phoneNumber,
  personName,
  aiSuggestion,
  onSuggestMessage,
  isLoadingAiSuggestion,
  className,
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const { sendSms, isSending } = useSendSms();
  const refreshConversation = useRefreshConversation();

  const handleSend = async () => {
    if (!message.trim() || isSending) return;

    const result = await sendSms({
      to: phoneNumber,
      body: message.trim(),
      studentId,
    });

    if (result.success) {
      playSendSound();
      setMessage("");
      refreshConversation(studentId);
      toast.success("Message sent!");
    } else {
      toast.error(result.error || "Failed to send message");
    }
  };

  const handleTemplateSelect = (text: string) => {
    setMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Cmd/Ctrl + Enter to send
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Quick template pills */}
      <div className="flex items-start gap-2">
        <div className="flex-1 overflow-x-auto pb-1">
          <QuickTemplatePills
            onSelect={handleTemplateSelect}
            aiSuggestion={aiSuggestion}
            personName={personName}
          />
        </div>

        {/* AI Suggest button */}
        {onSuggestMessage && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSuggestMessage}
            disabled={isLoadingAiSuggestion}
            className="shrink-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
          >
            {isLoadingAiSuggestion ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Suggest
              </>
            )}
          </Button>
        )}
      </div>

      {/* Compose area */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Textarea
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="resize-none pr-12"
            disabled={isSending}
          />
          <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {message.length}/160
          </span>
        </div>
        <Button
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          size="icon"
          className={cn(
            "h-[68px] w-12 shrink-0",
            "transition-all duration-200",
            message.trim() && !isSending && "scale-100",
            (!message.trim() || isSending) && "scale-95 opacity-70"
          )}
        >
          {isSending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-muted-foreground text-center">
        Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd>+
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to send
      </p>
    </div>
  );
}
