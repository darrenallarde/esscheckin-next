"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrganization } from "@/hooks/useOrganization";
import { useMyOrgProfile } from "@/hooks/queries/use-my-profile";
import { useUpdateProfile } from "@/hooks/mutations/use-update-profile";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check } from "lucide-react";

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;

  const { data: profile, isLoading: profileLoading } = useMyOrgProfile(organizationId);
  const updateProfile = useUpdateProfile();

  const [displayName, setDisplayName] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (profile) {
      setHasChanges(displayName !== (profile.display_name || ""));
    }
  }, [displayName, profile]);

  const handleSave = async () => {
    if (!organizationId) return;

    try {
      await updateProfile.mutateAsync({
        organizationId,
        displayName,
      });

      toast({
        title: "Profile updated",
        description: "Your display name has been saved.",
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (orgLoading || profileLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">
          Manage your profile and preferences
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your display name is used when sending SMS messages to students
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email - Read only */}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={profile?.email || ""}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Your email cannot be changed.
            </p>
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Pastor Mike"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={updateProfile.isPending}
            />
            <p className="text-xs text-muted-foreground">
              This is how you appear when sending messages to students.
              Messages will end with &quot;- {displayName || "Your Name"}&quot;.
            </p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateProfile.isPending}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
            {updateProfile.isSuccess && !hasChanges && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Check className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notifications - Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Configure how you receive alerts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Notification preferences coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
