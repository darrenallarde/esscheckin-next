"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageCircle, Mail, User } from "lucide-react";
import { Parent } from "@/types/families";
import { safeTrack } from "@/lib/amplitude";
import { EVENTS } from "@/lib/amplitude/events";
import { useOrganization } from "@/hooks/useOrganization";

interface ParentCardProps {
  parent: Parent;
  onClick: () => void;
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

export function ParentCard({ parent, onClick, onChildClick }: ParentCardProps) {
  const { currentOrganization } = useOrganization();
  const fullName = [parent.first_name, parent.last_name].filter(Boolean).join(" ") || "Unknown";

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (parent.phone) {
      safeTrack(EVENTS.PARENT_CALLED, {
        org_id: currentOrganization?.id,
        org_slug: currentOrganization?.slug,
        parent_type: parent.parent_type,
      });
      window.location.href = `tel:${parent.phone}`;
    }
  };

  const handleText = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (parent.phone) {
      safeTrack(EVENTS.PARENT_TEXTED, {
        org_id: currentOrganization?.id,
        org_slug: currentOrganization?.slug,
        parent_type: parent.parent_type,
      });
      window.location.href = `sms:${parent.phone}`;
    }
  };

  const handleChildClick = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    if (onChildClick) {
      onChildClick(studentId);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          {/* Parent Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{parentTypeEmoji[parent.parent_type] || "👤"}</span>
              <span className="font-medium truncate">{fullName}</span>
              <Badge variant="secondary" className="text-xs shrink-0">
                {parentTypeLabel[parent.parent_type] || "Guardian"}
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="space-y-1 text-sm text-muted-foreground">
              {parent.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{parent.phone}</span>
                </div>
              )}
              {parent.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{parent.email}</span>
                </div>
              )}
            </div>

            {/* Children */}
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                <User className="h-3.5 w-3.5" />
                <span>Children:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {parent.children.map((child) => (
                  <Badge
                    key={child.student_id}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={(e) => handleChildClick(e, child.student_id)}
                  >
                    {child.first_name}
                    {child.grade && ` (${child.grade}th)`}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {parent.phone && (
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCall}
                title="Call"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleText}
                title="Text"
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
