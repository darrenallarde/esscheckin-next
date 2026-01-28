"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MessageCircle, Loader2 } from "lucide-react";
import { useSendSms } from "@/hooks/useSendSms";
import { Student } from "@/hooks/queries/use-students";
import { toast } from "sonner";

interface SendSmsModalProps {
  person: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendSmsModal({ person, open, onOpenChange }: SendSmsModalProps) {
  const [message, setMessage] = useState("");
  const { sendSms, isSending } = useSendSms();

  if (!person || !person.phone_number) return null;

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    const result = await sendSms({
      to: person.phone_number!,
      body: message,
      studentId: person.id,
    });

    if (result.success) {
      toast.success(`Message sent to ${person.first_name}!`);
      setMessage("");
      onOpenChange(false);
    } else {
      toast.error(result.error || "Failed to send message");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Text {person.first_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Sending to: {person.phone_number}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/160 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSending || !message.trim()}>
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4 mr-2" />
                Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
