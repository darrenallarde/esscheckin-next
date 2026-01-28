"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Settings, Check, Sprout, Gamepad2, ClipboardList, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { createClient } from "@/lib/supabase/client";
import { THEME_LIST, getTheme } from "@/lib/themes";
import { SUCCESS_MESSAGES, PLATFORM_NAME } from "@/lib/copy";

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currentOrganization, userRole, refreshOrganizations } = useOrganization();

  const [displayName, setDisplayName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [checkinStyle, setCheckinStyle] = useState("gamified");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Load current settings
  useEffect(() => {
    if (currentOrganization) {
      setDisplayName(currentOrganization.displayName || currentOrganization.name || "");
      setSelectedTheme(currentOrganization.themeId || "default");
      setCheckinStyle(currentOrganization.checkinStyle || "gamified");
    }
  }, [currentOrganization]);

  // Check for changes
  useEffect(() => {
    if (!currentOrganization) return;

    const origDisplayName = currentOrganization.displayName || currentOrganization.name || "";
    const origTheme = currentOrganization.themeId || "default";
    const origStyle = currentOrganization.checkinStyle || "gamified";

    setHasChanges(
      displayName !== origDisplayName ||
      selectedTheme !== origTheme ||
      checkinStyle !== origStyle
    );
  }, [displayName, selectedTheme, checkinStyle, currentOrganization]);

  // Only admins/owners can edit org settings
  const canEdit = userRole === "owner" || userRole === "admin";

  const handleSave = async () => {
    if (!currentOrganization) return;

    setIsSaving(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          display_name: displayName.trim() || null,
          theme_id: selectedTheme,
          checkin_style: checkinStyle,
        })
        .eq("id", currentOrganization.id);

      if (error) throw error;

      // Refresh organization data
      await refreshOrganizations();

      toast({
        title: "Settings saved",
        description: SUCCESS_MESSAGES.settingsSaved,
      });

      setHasChanges(false);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error saving settings",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentOrganization) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentTheme = getTheme(selectedTheme);

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3">
            <Settings className="h-8 w-8" />
            Organization Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Customize how your organization appears in {PLATFORM_NAME}
          </p>
        </div>
        {canEdit && hasChanges && (
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Display Name */}
        <Card>
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
            <CardDescription>
              This is how your organization appears throughout the app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Organization Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={currentOrganization.name}
                disabled={!canEdit}
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: currentTheme.primary }}
                >
                  <Sprout className="h-6 w-6" style={{ color: currentTheme.primaryForeground }} />
                </div>
                <span className="text-lg font-bold">
                  {displayName || currentOrganization.name}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>
              Choose a color theme for your organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {THEME_LIST.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => canEdit && setSelectedTheme(theme.id)}
                  disabled={!canEdit}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    selectedTheme === theme.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div
                      className="h-6 w-6 rounded-full"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <div
                      className="h-6 w-6 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                    />
                    {selectedTheme === theme.id && (
                      <Check className="h-4 w-4 text-primary ml-auto" />
                    )}
                  </div>
                  <p className="font-medium">{theme.name}</p>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Check-in Style */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Check-in Style</CardTitle>
            <CardDescription>
              Choose how your students check in at events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={checkinStyle}
              onValueChange={(value) => canEdit && setCheckinStyle(value)}
              disabled={!canEdit}
              className="grid gap-4 md:grid-cols-3"
            >
              <label
                className={`flex flex-col items-center p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  checkinStyle === "gamified"
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <RadioGroupItem value="gamified" className="sr-only" />
                <Gamepad2 className="h-10 w-10 mb-4 text-primary" />
                <span className="font-medium mb-1">Gamified</span>
                <span className="text-xs text-muted-foreground text-center">
                  JRPG-style with points, achievements, and leaderboards
                </span>
              </label>

              <label
                className={`flex flex-col items-center p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  checkinStyle === "standard"
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <RadioGroupItem value="standard" className="sr-only" />
                <ClipboardList className="h-10 w-10 mb-4 text-primary" />
                <span className="font-medium mb-1">Standard</span>
                <span className="text-xs text-muted-foreground text-center">
                  Clean, simple check-in experience
                </span>
              </label>

              <label
                className={`flex flex-col items-center p-6 rounded-lg border-2 cursor-pointer transition-all ${
                  checkinStyle === "minimal"
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                } ${!canEdit ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <RadioGroupItem value="minimal" className="sr-only" />
                <Minus className="h-10 w-10 mb-4 text-primary" />
                <span className="font-medium mb-1">Minimal</span>
                <span className="text-xs text-muted-foreground text-center">
                  Quick and distraction-free
                </span>
              </label>
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Organization Info (Read-only) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Information about your organization. Contact support to make changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Organization Slug</Label>
                <p className="font-mono text-sm mt-1 p-2 bg-muted rounded">
                  {currentOrganization.slug}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Public Check-in URL</Label>
                <p className="font-mono text-sm mt-1 p-2 bg-muted rounded break-all">
                  {typeof window !== "undefined" ? `${window.location.origin}/${currentOrganization.slug}` : `/${currentOrganization.slug}`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
