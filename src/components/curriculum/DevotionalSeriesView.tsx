"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle,
  Clock,
  Sun,
  Cloud,
  Moon,
  Edit,
  Trash2,
  Play,
  Archive,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Lightbulb,
  Heart,
  MessageCircle,
  Link2,
  Check,
} from "lucide-react";
import { useState } from "react";
import {
  DevotionalSeries,
  Devotional,
  DevotionalTimeSlot,
  FREQUENCY_LABELS,
  TIME_SLOT_LABELS,
} from "@/hooks/queries/use-devotionals";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DevotionalSeriesViewProps {
  series: DevotionalSeries;
  devotionals: Devotional[];
  isLoading?: boolean;
  onActivate?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onEditDevotional?: (devotional: Devotional) => void;
  isActivating?: boolean;
}

const TIME_SLOT_ICONS: Record<DevotionalTimeSlot, React.ReactNode> = {
  morning: <Sun className="h-4 w-4" />,
  afternoon: <Cloud className="h-4 w-4" />,
  evening: <Moon className="h-4 w-4" />,
};

// Section styling configuration for enhanced visual design
const SECTION_STYLES = {
  scripture: {
    icon: BookOpen,
    bg: "bg-blue-50 dark:bg-blue-950/30",
    border: "border-l-blue-500",
    iconColor: "text-blue-600 dark:text-blue-400",
    label: "Scripture",
  },
  reflection: {
    icon: Lightbulb,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-l-amber-500",
    iconColor: "text-amber-600 dark:text-amber-400",
    label: "Reflection",
  },
  prayer: {
    icon: Heart,
    bg: "bg-rose-50 dark:bg-rose-950/30",
    border: "border-l-rose-500",
    iconColor: "text-rose-600 dark:text-rose-400",
    label: "Prayer Prompt",
  },
  discussion: {
    icon: MessageCircle,
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-l-emerald-500",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    label: "Discussion",
  },
} as const;

function DevotionalSection({
  type,
  content,
  subContent,
}: {
  type: keyof typeof SECTION_STYLES;
  content: string;
  subContent?: string;
}) {
  const style = SECTION_STYLES[type];
  const Icon = style.icon;

  return (
    <div
      className={`p-3 rounded-lg ${style.bg} border-l-4 ${style.border}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${style.iconColor}`} />
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {style.label}
        </span>
      </div>
      {subContent && (
        <p className="text-xs text-muted-foreground mb-1">{subContent}</p>
      )}
      <p className={`text-sm ${type === "scripture" ? "italic" : ""}`}>
        {content}
      </p>
    </div>
  );
}

function DevotionalCard({
  devotional,
  onEdit,
  showCopyLink,
}: {
  devotional: Devotional;
  onEdit?: () => void;
  showCopyLink?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/d/${devotional.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              {TIME_SLOT_ICONS[devotional.time_slot]}
            </span>
            <div>
              <p className="font-medium text-sm">{devotional.title}</p>
              {devotional.scripture_reference && (
                <p className="text-xs text-muted-foreground">
                  {devotional.scripture_reference}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {showCopyLink && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                title="Copy student link"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-600" />
                ) : (
                  <Link2 className="h-3 w-3" />
                )}
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3">
            {devotional.scripture_text && (
              <DevotionalSection
                type="scripture"
                content={devotional.scripture_text}
                subContent={devotional.scripture_reference || undefined}
              />
            )}
            <DevotionalSection
              type="reflection"
              content={devotional.reflection}
            />
            {devotional.prayer_prompt && (
              <DevotionalSection
                type="prayer"
                content={devotional.prayer_prompt}
              />
            )}
            {devotional.discussion_question && (
              <DevotionalSection
                type="discussion"
                content={devotional.discussion_question}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DevotionalSeriesView({
  series,
  devotionals,
  isLoading,
  onActivate,
  onArchive,
  onDelete,
  onEditDevotional,
  isActivating,
}: DevotionalSeriesViewProps) {
  // Group devotionals by date
  const devotionalsByDate = devotionals.reduce((acc, d) => {
    const date = d.scheduled_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(d);
    return acc;
  }, {} as Record<string, Devotional[]>);

  const sortedDates = Object.keys(devotionalsByDate).sort();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = () => {
    switch (series.status) {
      case "generating":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3 animate-spin" />
            Generating...
          </Badge>
        );
      case "ready":
        return <Badge variant="outline">Ready to Activate</Badge>;
      case "active":
        return (
          <Badge className="bg-green-500 gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        );
      case "archived":
        return (
          <Badge variant="secondary">
            <Archive className="h-3 w-3 mr-1" />
            Archived
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {series.sermon_title || "Untitled Series"}
              {getStatusBadge()}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(series.start_date)} •{" "}
              {FREQUENCY_LABELS[series.frequency]} •{" "}
              {series.time_slots.map((s) => TIME_SLOT_LABELS[s]).join(", ")}
            </p>
            <p className="text-sm text-muted-foreground">
              {devotionals.length} devotionals
            </p>
          </div>
          <div className="flex items-center gap-2">
            {series.status === "ready" && onActivate && (
              <Button
                onClick={onActivate}
                disabled={isActivating}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isActivating ? "Activating..." : "Set as Current"}
              </Button>
            )}
            {series.status === "active" && onArchive && (
              <Button variant="outline" onClick={onArchive}>
                <Archive className="h-4 w-4 mr-2" />
                Archive
              </Button>
            )}
            {onDelete && series.status !== "active" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Series?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete this devotional series and
                      all {devotionals.length} devotionals. This cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedDates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Generating devotionals...</p>
            <p className="text-sm">This may take a minute.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date, index) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  Day {index + 1} — {formatDate(date)}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {devotionalsByDate[date]
                    .sort((a, b) => {
                      const order = ["morning", "afternoon", "evening"];
                      return (
                        order.indexOf(a.time_slot) - order.indexOf(b.time_slot)
                      );
                    })
                    .map((devotional) => (
                      <DevotionalCard
                        key={devotional.id}
                        devotional={devotional}
                        showCopyLink={series.status === "active"}
                        onEdit={
                          onEditDevotional
                            ? () => onEditDevotional(devotional)
                            : undefined
                        }
                      />
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
