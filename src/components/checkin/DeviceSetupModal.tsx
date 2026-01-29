"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tablet } from "lucide-react";

const SUGGESTED_NAMES = [
  "Front Door iPad",
  "Main Entrance",
  "Side Door",
  "Lobby",
  "Check-in Station 1",
  "Check-in Station 2",
];

interface DeviceSetupModalProps {
  open: boolean;
  organizationId: string;
  onDeviceCreated: (deviceId: string, deviceName: string) => void;
}

export default function DeviceSetupModal({
  open,
  organizationId,
  onDeviceCreated,
}: DeviceSetupModalProps) {
  const [customName, setCustomName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDevice = async (name: string) => {
    if (!name.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const supabase = createClient();

      const { data, error: createError } = await supabase
        .from("devices")
        .insert({
          organization_id: organizationId,
          name: name.trim(),
        })
        .select("id, name")
        .single();

      if (createError) {
        setError(createError.message);
        return;
      }

      if (data) {
        // Store in localStorage
        localStorage.setItem("deviceId", data.id);
        localStorage.setItem("deviceName", data.name);
        onDeviceCreated(data.id, data.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create device");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Tablet className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Name This Device</DialogTitle>
          <DialogDescription className="text-center">
            Give this device a name so you can track check-ins by location.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick select buttons */}
          <div className="grid grid-cols-2 gap-2">
            {SUGGESTED_NAMES.map((name) => (
              <Button
                key={name}
                variant="outline"
                className="h-auto py-3 px-4 text-left justify-start"
                onClick={() => createDevice(name)}
                disabled={isCreating}
              >
                {name}
              </Button>
            ))}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or custom name
              </span>
            </div>
          </div>

          {/* Custom name input */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter custom name..."
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && customName.trim()) {
                  createDevice(customName);
                }
              }}
              disabled={isCreating}
            />
            <Button
              onClick={() => createDevice(customName)}
              disabled={isCreating || !customName.trim()}
            >
              {isCreating ? "Saving..." : "Save"}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
