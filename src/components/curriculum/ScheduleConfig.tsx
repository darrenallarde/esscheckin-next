"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Sun, Cloud, Moon } from "lucide-react";
import {
  DevotionalFrequency,
  DevotionalTimeSlot,
  FREQUENCY_LABELS,
  getTotalDevotionals,
} from "@/hooks/queries/use-devotionals";

interface ScheduleConfigProps {
  frequency: DevotionalFrequency;
  timeSlots: DevotionalTimeSlot[];
  startDate: string;
  onFrequencyChange: (frequency: DevotionalFrequency) => void;
  onTimeSlotsChange: (slots: DevotionalTimeSlot[]) => void;
  onStartDateChange: (date: string) => void;
}

const TIME_SLOT_CONFIG: {
  value: DevotionalTimeSlot;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    value: "morning",
    label: "Morning",
    icon: <Sun className="h-4 w-4" />,
    description: "Start the day with scripture",
  },
  {
    value: "afternoon",
    label: "Afternoon",
    icon: <Cloud className="h-4 w-4" />,
    description: "Midday reset and reflection",
  },
  {
    value: "evening",
    label: "Evening",
    icon: <Moon className="h-4 w-4" />,
    description: "End the day in prayer",
  },
];

export function ScheduleConfig({
  frequency,
  timeSlots,
  startDate,
  onFrequencyChange,
  onTimeSlotsChange,
  onStartDateChange,
}: ScheduleConfigProps) {
  const handleTimeSlotToggle = (slot: DevotionalTimeSlot, checked: boolean) => {
    if (checked) {
      onTimeSlotsChange([...timeSlots, slot]);
    } else {
      // Don't allow removing the last slot
      if (timeSlots.length > 1) {
        onTimeSlotsChange(timeSlots.filter((s) => s !== slot));
      }
    }
  };

  const totalDevotionals = getTotalDevotionals(frequency, timeSlots);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Schedule Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Frequency Selection */}
        <div>
          <Label className="text-base font-medium">How often?</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Choose how many days per week students receive devotionals
          </p>
          <RadioGroup
            value={frequency}
            onValueChange={(v) => onFrequencyChange(v as DevotionalFrequency)}
            className="grid grid-cols-3 gap-3"
          >
            {(
              Object.entries(FREQUENCY_LABELS) as [
                DevotionalFrequency,
                string,
              ][]
            ).map(([value, label]) => (
              <div key={value}>
                <RadioGroupItem
                  value={value}
                  id={`freq-${value}`}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={`freq-${value}`}
                  className="flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {value === "1x_week"
                      ? "1 day"
                      : value === "3x_week"
                        ? "3 days"
                        : "7 days"}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Time Slots Selection */}
        <div>
          <Label className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Time Slots
          </Label>
          <p className="text-sm text-muted-foreground mb-3">
            When should students receive their devotional each day?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TIME_SLOT_CONFIG.map(({ value, label, icon, description }) => {
              const isChecked = timeSlots.includes(value);
              const isDisabled = isChecked && timeSlots.length === 1;

              return (
                <div
                  key={value}
                  className={`flex items-start space-x-3 rounded-md border p-4 ${
                    isChecked ? "border-primary bg-primary/5" : "border-muted"
                  }`}
                >
                  <Checkbox
                    id={`slot-${value}`}
                    checked={isChecked}
                    onCheckedChange={(checked) =>
                      handleTimeSlotToggle(value, !!checked)
                    }
                    disabled={isDisabled}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={`slot-${value}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {icon}
                      {label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Start Date */}
        <div>
          <Label htmlFor="start-date" className="text-base font-medium">
            Start Date
          </Label>
          <p className="text-sm text-muted-foreground mb-2">
            When should the first devotional be available?
          </p>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            className="w-full sm:w-auto"
          />
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm font-medium">Summary</p>
          <p className="text-2xl font-bold text-primary mt-1">
            {totalDevotionals} devotionals
          </p>
          <p className="text-sm text-muted-foreground">
            {frequency === "1x_week"
              ? "1 day"
              : frequency === "3x_week"
                ? "3 days"
                : "7 days"}{" "}
            × {timeSlots.length} time slot{timeSlots.length > 1 ? "s" : ""} per
            day
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
