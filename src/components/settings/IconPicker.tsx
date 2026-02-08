"use client";

import { useState, useMemo } from "react";
import { icons, Dog, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/** Convert PascalCase to kebab-case: "AlarmClock" → "alarm-clock" */
function toKebab(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();
}

interface IconPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

// Pre-compute the icon entries once (outside component)
const iconEntries = Object.entries(icons).map(([pascal, component]) => ({
  pascal,
  kebab: toKebab(pascal),
  Component: component,
}));

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return iconEntries.slice(0, 60);
    const q = search.toLowerCase();
    return iconEntries.filter((e) => e.kebab.includes(q)).slice(0, 60);
  }, [search]);

  // Find current icon component for the trigger
  const CurrentIcon = value
    ? (iconEntries.find((e) => e.kebab === value)?.Component ?? Dog)
    : Dog;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className="h-auto gap-3 px-4 py-3"
        >
          <CurrentIcon className="h-6 w-6" />
          <span className="text-sm">{value || "dog"}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Search */}
        <div className="flex items-center gap-2 border-b p-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 border-0 p-0 shadow-none focus-visible:ring-0"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Grid */}
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-1 p-2">
            {filtered.map((entry) => (
              <button
                key={entry.pascal}
                onClick={() => {
                  onChange(entry.kebab);
                  setOpen(false);
                  setSearch("");
                }}
                title={entry.kebab}
                className={cn(
                  "flex items-center justify-center rounded-md p-2 hover:bg-accent transition-colors",
                  value === entry.kebab && "ring-2 ring-primary bg-primary/10",
                )}
              >
                <entry.Component className="h-5 w-5" />
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-6 py-6 text-center text-sm text-muted-foreground">
                No icons found
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Reset */}
        {value && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setSearch("");
              }}
            >
              Reset to default (Dog)
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
