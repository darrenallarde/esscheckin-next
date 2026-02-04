"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageCircle, Mail, Users } from "lucide-react";
import { Parent } from "@/types/families";
import { safeTrack } from "@/lib/amplitude";
import { EVENTS } from "@/lib/amplitude/events";
import { useOrganization } from "@/hooks/useOrganization";

interface ParentProfileModalProps {
  parent: Parent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChildClick?: (studentId: string) => void;
}

const parentTypeEmoji: Record<string, string> = {
  mother: "👩",
  father: "👨",
  guardian: "👤",
};

const parentTypeLabel: Record<string, string> = {
  mother: "Mother",
  father: "Father",
  guardian: "Guardian",
};

export function ParentProfileModal({
  parent,
  open,
  onOpenChange,
  onChildClick,
}: ParentProfileModalProps) {
  const { currentOrganization } = useOrganization();

  if (!parent) return null;

  const fullName = [parent.first_name, parent.last_name].filter(Boolean).join(" ") || "Unknown";

  const handleCall = () => {
    if (parent.phone) {
      safeTrack(EVENTS.PARENT_CALLED, {
        org_id: currentOrganization?.id,
        org_slug: currentOrganization?.slug,
        parent_type: parent.parent_type,
      });
      window.location.href = `tel:${parent.phone}`;
    }
  };

  const handleText = () => {
    if (parent.phone) {
      safeTrack(EVENTS.PARENT_TEXTED, {
        org_id: currentOrganization?.id,
        org_slug: currentOrganization?.slug,
        parent_type: parent.parent_type,
      });
      window.location.href = `sms:${parent.phone}`;
    }
  };

  const handleChildClick = (studentId: string) => {
    if (onChildClick) {
      onOpenChange(false);
      onChildClick(studentId);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
              {parentTypeEmoji[parent.parent_type] || "👤"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span>{fullName}</span>
              </div>
              <Badge variant="secondary" className="mt-1">
                {parentTypeLabel[parent.parent_type] || "Guardian"}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Contact Actions */}
          {parent.phone && (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handleCall}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" className="flex-1" onClick={handleText}>
                <MessageCircle className="h-4 w-4 mr-2" />
                Text
              </Button>
            </div>
          )}

          {/* Contact Info Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {parent.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${parent.phone}`}
                    className="text-primary hover:underline"
                  >
                    {parent.phone}
                  </a>
                </div>
              )}
              {parent.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${parent.email}`}
                    className="text-primary hover:underline truncate"
                  >
                    {parent.email}
                  </a>
                </div>
              )}
              {!parent.phone && !parent.email && (
                <p className="text-sm text-muted-foreground">
                  No contact information on file
                </p>
              )}
            </CardContent>
          </Card>

          {/* Children Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Children ({parent.children.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {parent.children.map((child) => (
                  <div
                    key={child.student_id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleChildClick(child.student_id)}
                  >
                    <div>
                      <p className="font-medium">
                        {child.first_name} {child.last_name}
                      </p>
                      {child.grade && (
                        <p className="text-sm text-muted-foreground">
                          Grade {child.grade}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-sm">
                      View profile →
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
