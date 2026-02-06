"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useUpdateGroup, useDeleteGroup, Group, DAY_NAMES, FREQUENCY_OPTIONS, MeetingFrequency } from "@/hooks/queries/use-groups";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GroupSettingsModalProps {
  group: Group | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

interface MeetingTimeInput {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  frequency: MeetingFrequency;
}

const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

const ALL_GRADES = ["6", "7", "8", "9", "10", "11", "12"];
const MS_GRADES = ["6", "7", "8"];
const HS_GRADES = ["9", "10", "11", "12"];

export function GroupSettingsModal({
  group,
  open,
  onOpenChange,
  organizationId,
}: GroupSettingsModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [meetingTimes, setMeetingTimes] = useState<MeetingTimeInput[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [defaultGrades, setDefaultGrades] = useState<string[]>([]);
  const [defaultGender, setDefaultGender] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  // Populate form when group changes
  useEffect(() => {
    if (group) {
      setName(group.name);
      setDescription(group.description || "");
      setColor(group.color || COLORS[0]);
      setMeetingTimes(
        group.meeting_times.length > 0
          ? group.meeting_times.map((mt) => ({
              id: mt.id,
              day_of_week: mt.day_of_week,
              start_time: mt.start_time,
              end_time: mt.end_time,
              frequency: mt.frequency || "weekly",
            }))
          : [{ day_of_week: 3, start_time: "19:00", end_time: "20:30", frequency: "weekly" }]
      );
      setIsDefault(group.is_default || false);
      setDefaultGrades(group.default_grades || []);
      setDefaultGender(group.default_gender || null);
    }
  }, [group]);

  const handleGradeToggle = (grade: string, checked: boolean) => {
    if (checked) {
      setDefaultGrades([...defaultGrades, grade]);
    } else {
      setDefaultGrades(defaultGrades.filter((g) => g !== grade));
    }
  };

  const handleSelectGradeGroup = (grp: "ms" | "hs" | "all" | "none") => {
    switch (grp) {
      case "ms": setDefaultGrades(MS_GRADES); break;
      case "hs": setDefaultGrades(HS_GRADES); break;
      case "all": setDefaultGrades(ALL_GRADES); break;
      case "none": setDefaultGrades([]); break;
    }
  };

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
    if (!group) return;

    try {
      await updateGroup.mutateAsync({
        id: group.id,
        name,
        description: description || undefined,
        color,
        organization_id: organizationId,
        meeting_times: meetingTimes,
        is_default: isDefault,
        default_grades: isDefault && defaultGrades.length > 0 ? defaultGrades : undefined,
        default_gender: isDefault && defaultGender ? defaultGender : undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update group:", error);
    }
  };

  const handleDelete = async () => {
    if (!group) return;
    try {
      await deleteGroup.mutateAsync({ groupId: group.id, organizationId });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Group Settings</DialogTitle>
              <DialogDescription>
                Edit settings for {group?.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="edit-name">Group Name *</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., MS Boys, HS Girls"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
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

              {/* Default Group Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <Label htmlFor="edit-is-default">Default Group</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      New students matching the criteria will be auto-assigned
                    </p>
                  </div>
                  <Switch
                    id="edit-is-default"
                    checked={isDefault}
                    onCheckedChange={setIsDefault}
                  />
                </div>

                {isDefault && (
                  <div className="space-y-4 pl-6 border-l-2 border-amber-200">
                    <div className="space-y-2">
                      <Label>Grade Filter</Label>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to match all grades
                      </p>
                      <div className="flex gap-2 flex-wrap mb-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectGradeGroup("ms")}
                          className={defaultGrades.length === 3 && MS_GRADES.every(g => defaultGrades.includes(g)) ? "bg-primary/10" : ""}>
                          MS (6-8)
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectGradeGroup("hs")}
                          className={defaultGrades.length === 4 && HS_GRADES.every(g => defaultGrades.includes(g)) ? "bg-primary/10" : ""}>
                          HS (9-12)
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectGradeGroup("all")}>All</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleSelectGradeGroup("none")}>Clear</Button>
                      </div>
                      <div className="flex gap-3 flex-wrap">
                        {ALL_GRADES.map((grade) => (
                          <div key={grade} className="flex items-center space-x-1">
                            <Checkbox
                              id={`edit-grade-${grade}`}
                              checked={defaultGrades.includes(grade)}
                              onCheckedChange={(checked) => handleGradeToggle(grade, checked === true)}
                            />
                            <label htmlFor={`edit-grade-${grade}`} className="text-sm cursor-pointer">
                              {grade}th
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Gender Filter</Label>
                      <p className="text-xs text-muted-foreground">
                        Leave as &quot;Any&quot; to match all genders
                      </p>
                      <Select
                        value={defaultGender || "any"}
                        onValueChange={(value) => setDefaultGender(value === "any" ? null : value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Gender</SelectItem>
                          <SelectItem value="male">Male Only</SelectItem>
                          <SelectItem value="female">Female Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              {/* Meeting Times */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Meeting Schedule</Label>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddMeetingTime}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Time
                  </Button>
                </div>

                <div className="space-y-2">
                  {meetingTimes.map((mt, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2 p-2 rounded-lg border bg-muted/50">
                      <select
                        className="flex-1 min-w-[100px] rounded-md border bg-background px-2 py-1 text-sm"
                        value={mt.day_of_week}
                        onChange={(e) => handleMeetingTimeChange(index, "day_of_week", parseInt(e.target.value))}
                      >
                        {DAY_NAMES.map((day, i) => (
                          <option key={i} value={i}>{day}</option>
                        ))}
                      </select>
                      <Input type="time" className="w-28" value={mt.start_time}
                        onChange={(e) => handleMeetingTimeChange(index, "start_time", e.target.value)} />
                      <span className="text-muted-foreground">to</span>
                      <Input type="time" className="w-28" value={mt.end_time}
                        onChange={(e) => handleMeetingTimeChange(index, "end_time", e.target.value)} />
                      <select
                        className="rounded-md border bg-background px-2 py-1 text-sm"
                        value={mt.frequency}
                        onChange={(e) => handleMeetingTimeChange(index, "frequency", e.target.value)}
                      >
                        {FREQUENCY_OPTIONS.map((freq) => (
                          <option key={freq.value} value={freq.value}>{freq.label}</option>
                        ))}
                      </select>
                      {meetingTimes.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => handleRemoveMeetingTime(index)}>
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
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: color }} />
                  <span className="font-medium">{name || "Group Name"}</span>
                  {isDefault && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <Sparkles className="h-3 w-3 mr-1" />
                      DEFAULT
                    </Badge>
                  )}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name || updateGroup.isPending}>
                {updateGroup.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{group?.name}&quot;? This will remove all members and meeting times. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGroup.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteGroup.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGroup.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</>
              ) : (
                "Delete Group"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
