"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2 } from "lucide-react";
import { useCreateGroup, DAY_NAMES, FREQUENCY_OPTIONS, MeetingFrequency } from "@/hooks/queries/use-groups";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

interface MeetingTimeInput {
  day_of_week: number;
  start_time: string;
  end_time: string;
  frequency: MeetingFrequency;
}

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
];

export function CreateGroupModal({
  open,
  onOpenChange,
  organizationId,
}: CreateGroupModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [meetingTimes, setMeetingTimes] = useState<MeetingTimeInput[]>([
    { day_of_week: 3, start_time: "19:00", end_time: "20:30", frequency: "weekly" }, // Wednesday default
  ]);

  const createGroup = useCreateGroup();

  const handleAddMeetingTime = () => {
    setMeetingTimes([
      ...meetingTimes,
      { day_of_week: 0, start_time: "10:00", end_time: "11:30", frequency: "weekly" },
    ]);
  };

  const handleRemoveMeetingTime = (index: number) => {
    setMeetingTimes(meetingTimes.filter((_, i) => i !== index));
  };

  const handleMeetingTimeChange = (
    index: number,
    field: keyof MeetingTimeInput,
    value: string | number
  ) => {
    setMeetingTimes(
      meetingTimes.map((mt, i) =>
        i === index ? { ...mt, [field]: value } : mt
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createGroup.mutateAsync({
        name,
        description: description || undefined,
        color,
        organization_id: organizationId,
        meeting_times: meetingTimes,
      });

      // Reset form and close
      setName("");
      setDescription("");
      setColor(COLORS[0]);
      setMeetingTimes([{ day_of_week: 3, start_time: "19:00", end_time: "20:30", frequency: "weekly" }]);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create group:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to organize students and track attendance.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                placeholder="e.g., MS Boys, HS Girls"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-full transition-transform ${
                      color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Meeting Times */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Meeting Schedule</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddMeetingTime}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Time
                </Button>
              </div>

              <div className="space-y-2">
                {meetingTimes.map((mt, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-2 p-2 rounded-lg border bg-muted/50"
                  >
                    <select
                      className="flex-1 min-w-[100px] rounded-md border bg-background px-2 py-1 text-sm"
                      value={mt.day_of_week}
                      onChange={(e) =>
                        handleMeetingTimeChange(index, "day_of_week", parseInt(e.target.value))
                      }
                    >
                      {DAY_NAMES.map((day, i) => (
                        <option key={i} value={i}>
                          {day}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="time"
                      className="w-28"
                      value={mt.start_time}
                      onChange={(e) =>
                        handleMeetingTimeChange(index, "start_time", e.target.value)
                      }
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={mt.end_time}
                      onChange={(e) =>
                        handleMeetingTimeChange(index, "end_time", e.target.value)
                      }
                    />
                    <select
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                      value={mt.frequency}
                      onChange={(e) =>
                        handleMeetingTimeChange(index, "frequency", e.target.value)
                      }
                    >
                      {FREQUENCY_OPTIONS.map((freq) => (
                        <option key={freq.value} value={freq.value}>
                          {freq.label}
                        </option>
                      ))}
                    </select>
                    {meetingTimes.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveMeetingTime(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="pt-2">
              <Label className="text-muted-foreground">Preview</Label>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-medium">{name || "Group Name"}</span>
                {meetingTimes.map((mt, i) => (
                  <Badge key={i} variant="secondary">
                    {DAY_NAMES[mt.day_of_week]} ({mt.frequency === "bi-weekly" ? "Bi-wk" : mt.frequency === "monthly" ? "Monthly" : "Wk"})
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name || createGroup.isPending}>
              {createGroup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
