"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, MessageCircle, Mail, Users } from "lucide-react";
import { useStudentSiblings } from "@/hooks/queries/use-families";
import { useStudentParents } from "@/hooks/queries/use-student-details";
import { safeTrack } from "@/lib/amplitude";
import { EVENTS } from "@/lib/amplitude/events";
import { useOrganization } from "@/hooks/useOrganization";

interface FamilySectionProps {
  studentId: string;
  onSiblingClick?: (studentId: string) => void;
}

const parentTypeEmoji: Record<string, string> = {
  mother: "👩",
  father: "👨",
  guardian: "👤",
};

export function FamilySection({ studentId, onSiblingClick }: FamilySectionProps) {
  const { currentOrganization } = useOrganization();
  const { data: siblings, isLoading: siblingsLoading } = useStudentSiblings(studentId);
  const { data: parentInfo, isLoading: parentsLoading } = useStudentParents(studentId);

  const isLoading = siblingsLoading || parentsLoading;

  const handleCall = (phone: string, parentType: string) => {
    safeTrack(EVENTS.PARENT_CALLED, {
      org_id: currentOrganization?.id,
      org_slug: currentOrganization?.slug,
      parent_type: parentType,
    });
    window.location.href = `tel:${phone}`;
  };

  const handleText = (phone: string, parentType: string) => {
    safeTrack(EVENTS.PARENT_TEXTED, {
      org_id: currentOrganization?.id,
      org_slug: currentOrganization?.slug,
      parent_type: parentType,
    });
    window.location.href = `sms:${phone}`;
  };

  const handleSiblingClick = (siblingId: string) => {
    safeTrack(EVENTS.SIBLING_CLICKED, {
      org_id: currentOrganization?.id,
      org_slug: currentOrganization?.slug,
      sibling_id: siblingId,
    });
    if (onSiblingClick) {
      onSiblingClick(siblingId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const hasParents = parentInfo && (parentInfo.mother || parentInfo.father || parentInfo.guardian);
  const hasSiblings = siblings && siblings.length > 0;

  if (!hasParents && !hasSiblings) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">No family information on file</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Add parent details when editing this student
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Parents Section */}
      {hasParents && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Parents/Guardians</span>
            </div>

            {/* Mother */}
            {parentInfo.mother && (
              <ParentRow
                type="mother"
                name={[parentInfo.mother.first_name, parentInfo.mother.last_name].filter(Boolean).join(" ") || "Mother"}
                phone={parentInfo.mother.phone}
                email={parentInfo.mother.email}
                onCall={handleCall}
                onText={handleText}
              />
            )}

            {/* Father */}
            {parentInfo.father && (
              <ParentRow
                type="father"
                name={[parentInfo.father.first_name, parentInfo.father.last_name].filter(Boolean).join(" ") || "Father"}
                phone={parentInfo.father.phone}
                email={parentInfo.father.email}
                onCall={handleCall}
                onText={handleText}
              />
            )}

            {/* Guardian (legacy) */}
            {parentInfo.guardian && (
              <ParentRow
                type="guardian"
                name={parentInfo.guardian.name || "Guardian"}
                phone={parentInfo.guardian.phone}
                email={null}
                onCall={handleCall}
                onText={handleText}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Siblings Section */}
      {hasSiblings && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Siblings</span>
            </div>
            <div className="space-y-2">
              {siblings.map((sibling) => (
                <div
                  key={sibling.student_id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => handleSiblingClick(sibling.student_id)}
                >
                  <div>
                    <p className="font-medium">
                      {sibling.first_name} {sibling.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sibling.grade && `Grade ${sibling.grade} · `}
                      {sibling.relationship}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    View →
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ParentRowProps {
  type: string;
  name: string;
  phone: string | null;
  email: string | null;
  onCall: (phone: string, type: string) => void;
  onText: (phone: string, type: string) => void;
}

function ParentRow({ type, name, phone, email, onCall, onText }: ParentRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 pb-3 border-b last:border-b-0 last:pb-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span>{parentTypeEmoji[type] || "👤"}</span>
          <span className="font-medium">{name}</span>
        </div>
        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
          {phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3" />
              <a href={`tel:${phone}`} className="hover:underline">
                {phone}
              </a>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              <a href={`mailto:${email}`} className="hover:underline truncate">
                {email}
              </a>
            </div>
          )}
        </div>
      </div>
      {phone && (
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onCall(phone, type);
            }}
            title="Call"
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onText(phone, type);
            }}
            title="Text"
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
