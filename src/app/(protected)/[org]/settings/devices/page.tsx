"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tablet, Pencil, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { orgPath } from "@/lib/navigation";
import { formatDistanceToNow } from "date-fns";

interface Device {
  id: string;
  name: string;
  created_at: string;
  last_seen_at: string;
  check_in_count: number;
}

export default function DevicesSettingsPage() {
  const { currentOrganization } = useOrganization();
  const orgSlug = currentOrganization?.slug;
  const orgId = currentOrganization?.id;
  const queryClient = useQueryClient();

  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingDevice, setDeletingDevice] = useState<Device | null>(null);

  // Fetch devices with check-in counts
  const { data: devices, isLoading } = useQuery({
    queryKey: ["devices", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const supabase = createClient();

      // Get devices
      const { data: deviceData, error: deviceError } = await supabase
        .from("devices")
        .select("id, name, created_at, last_seen_at")
        .eq("organization_id", orgId)
        .order("last_seen_at", { ascending: false });

      if (deviceError) throw deviceError;

      // Get check-in counts per device
      const { data: countData, error: countError } = await supabase
        .from("check_ins")
        .select("device_id")
        .eq("organization_id", orgId)
        .not("device_id", "is", null);

      if (countError) throw countError;

      // Count check-ins per device
      const counts: Record<string, number> = {};
      countData?.forEach((row) => {
        counts[row.device_id] = (counts[row.device_id] || 0) + 1;
      });

      return (deviceData || []).map((device) => ({
        ...device,
        check_in_count: counts[device.id] || 0,
      })) as Device[];
    },
    enabled: !!orgId,
  });

  // Rename mutation
  const renameMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("devices")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", orgId] });
      setEditingDevice(null);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("devices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices", orgId] });
      setDeletingDevice(null);
    },
  });

  const handleEditClick = (device: Device) => {
    setEditingDevice(device);
    setEditName(device.name);
  };

  const handleSaveEdit = () => {
    if (editingDevice && editName.trim()) {
      renameMutation.mutate({ id: editingDevice.id, name: editName.trim() });
    }
  };

  const handleDelete = () => {
    if (deletingDevice) {
      deleteMutation.mutate(deletingDevice.id);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Header with back link */}
      <div className="flex items-center gap-4">
        <Link href={orgPath(orgSlug, "/settings")}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Devices</h1>
          <p className="text-muted-foreground mt-1">
            Manage check-in devices for your organization
          </p>
        </div>
      </div>

      {/* Devices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tablet className="h-5 w-5" />
            Registered Devices
          </CardTitle>
          <CardDescription>
            Devices are automatically registered when someone first accesses the check-in page
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading devices...</div>
          ) : devices && devices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Name</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead className="text-right">Check-ins</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => (
                  <TableRow key={device.id}>
                    <TableCell className="font-medium">{device.name}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(device.last_seen_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">{device.check_in_count}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(device)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletingDevice(device)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Tablet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No devices registered yet</p>
              <p className="text-sm mt-1">
                Devices will appear here after someone visits the check-in page
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingDevice} onOpenChange={() => setEditingDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Device</DialogTitle>
            <DialogDescription>
              Enter a new name for this device
            </DialogDescription>
          </DialogHeader>
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Device name"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveEdit();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDevice(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={renameMutation.isPending}>
              {renameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingDevice} onOpenChange={() => setDeletingDevice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Device</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingDevice?.name}&quot;?
              This won&apos;t delete any check-in records, but the device will need to be
              re-registered on next use.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingDevice(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
