"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Loader2,
  Settings,
  Check,
  Gamepad2,
  ClipboardList,
  Minus,
  Copy,
  CheckCircle2,
  MessageSquare,
  Dog,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { createClient } from "@/lib/supabase/client";
import { THEME_LIST, getTheme } from "@/lib/themes";
import { SUCCESS_MESSAGES, PLATFORM_NAME } from "@/lib/copy";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { IconPicker } from "@/components/settings/IconPicker";

export default function OrganizationSettingsPage() {
  const { toast } = useToast();
  const { currentOrganization, userRole, refreshOrganizations } =
    useOrganization();

  const [displayName, setDisplayName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [checkinStyle, setCheckinStyle] = useState("gamified");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Short code state
  const [shortCode, setShortCode] = useState("");
  const [originalShortCode, setOriginalShortCode] = useState("");
  const [isSavingShortCode, setIsSavingShortCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Ministry priorities state
  const [ministryPriorities, setMinistryPriorities] = useState("");
  const [originalMinistryPriorities, setOriginalMinistryPriorities] =
    useState("");
  const [isSavingPriorities, setIsSavingPriorities] = useState(false);

  // Load current settings
  useEffect(() => {
    if (currentOrganization) {
      setDisplayName(
        currentOrganization.displayName || currentOrganization.name || "",
      );
      setSelectedTheme(currentOrganization.themeId || "default");
      setCheckinStyle(currentOrganization.checkinStyle || "gamified");
      setSelectedIcon(currentOrganization.icon ?? null);
      // Load short code from org data
      const orgShortCode = currentOrganization.shortCode || "";
      setShortCode(orgShortCode);
      setOriginalShortCode(orgShortCode);

      // Fetch ministry priorities (not in org context — fetch directly)
      const supabase = createClient();
      supabase
        .from("organizations")
        .select("ministry_priorities")
        .eq("id", currentOrganization.id)
        .single()
        .then(({ data }) => {
          const priorities = (data?.ministry_priorities as string) || "";
          setMinistryPriorities(priorities);
          setOriginalMinistryPriorities(priorities);
        });
    }
  }, [currentOrganization]);

  // Check for changes
  useEffect(() => {
    if (!currentOrganization) return;

    const origDisplayName =
      currentOrganization.displayName || currentOrganization.name || "";
    const origTheme = currentOrganization.themeId || "default";
    const origStyle = currentOrganization.checkinStyle || "gamified";
    const origIcon = currentOrganization.icon ?? null;

    setHasChanges(
      displayName !== origDisplayName ||
        selectedTheme !== origTheme ||
        checkinStyle !== origStyle ||
        selectedIcon !== origIcon,
    );
  }, [
    displayName,
    selectedTheme,
    checkinStyle,
    selectedIcon,
    currentOrganization,
  ]);

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
          icon: selectedIcon,
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

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the URL manually.",
        variant: "destructive",
      });
    }
  };

  const handleSaveShortCode = async () => {
    if (!currentOrganization) return;

    setIsSavingShortCode(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase.rpc("update_org_short_code", {
        p_org_id: currentOrganization.id,
        p_short_code: shortCode.trim() || null,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };

      if (!result.success) {
        toast({
          title: "Unable to update code",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setOriginalShortCode(shortCode.trim());
      await refreshOrganizations();

      toast({
        title: "Code updated",
        description: shortCode.trim()
          ? `Your URL is now /${shortCode.trim()} and SMS code is ${shortCode.trim().toUpperCase()}`
          : "Code removed",
      });
    } catch (error) {
      console.error("Error saving short code:", error);
      toast({
        title: "Error saving short code",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingShortCode(false);
    }
  };

  const handleSavePriorities = async () => {
    if (!currentOrganization) return;

    setIsSavingPriorities(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("organizations")
        .update({ ministry_priorities: ministryPriorities.trim() || null })
        .eq("id", currentOrganization.id);

      if (error) throw error;

      setOriginalMinistryPriorities(ministryPriorities.trim());

      toast({
        title: "Priorities saved",
        description:
          "Your AI co-pilot will factor these into its next briefing.",
      });
    } catch (error) {
      console.error("Error saving priorities:", error);
      toast({
        title: "Error saving priorities",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingPriorities(false);
    }
  };

  const prioritiesChanged = ministryPriorities !== originalMinistryPriorities;
  const shortCodeChanged = shortCode !== originalShortCode;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

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
                  <DynamicIcon
                    name={selectedIcon}
                    className="h-6 w-6"
                    style={{ color: currentTheme.primaryForeground }}
                  />
                </div>
                <span className="text-lg font-bold">
                  {displayName || currentOrganization.name}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Icon */}
        <Card>
          <CardHeader>
            <CardTitle>Sidebar Icon</CardTitle>
            <CardDescription>
              Choose an icon that represents your organization in the sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IconPicker
              value={selectedIcon}
              onChange={setSelectedIcon}
              disabled={!canEdit}
            />
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
                  <p className="text-xs text-muted-foreground">
                    {theme.description}
                  </p>
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

        {/* Co-Pilot Priorities */}
        <Card className="lg:col-span-2 border-purple-200 bg-purple-50/30 dark:border-purple-900 dark:bg-purple-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Dog className="h-5 w-5 text-purple-600" />
              Co-Pilot Priorities
            </CardTitle>
            <CardDescription>
              Tell your AI co-pilot about upcoming events, ministry goals, or
              things on your mind this week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={ministryPriorities}
              onChange={(e) => {
                if (e.target.value.length <= 1000) {
                  setMinistryPriorities(e.target.value);
                }
              }}
              placeholder="e.g., Winter camp registration closes Friday. Focus on connecting new 6th graders. Jake needs a personal invite."
              rows={4}
              disabled={!canEdit}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {ministryPriorities.length}/1000 characters
              </p>
              {canEdit && prioritiesChanged && (
                <Button
                  onClick={handleSavePriorities}
                  disabled={isSavingPriorities}
                  size="sm"
                >
                  {isSavingPriorities ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Save Priorities
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SMS Code */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              SMS Code
            </CardTitle>
            <CardDescription>
              Students can text this code to connect with your ministry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-center p-6 bg-background rounded-lg border-2 border-dashed">
              <span className="text-4xl font-mono font-bold tracking-widest uppercase">
                {shortCode || "—"}
              </span>
            </div>
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p>
                Students text{" "}
                <strong>{shortCode?.toUpperCase() || "your code"}</strong> to
                your Twilio number
              </p>
              <p className="text-xs">
                They&apos;ll be connected and can start messaging leaders
              </p>
            </div>
            {shortCode && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleCopyUrl(shortCode.toUpperCase())}
              >
                {copiedUrl === shortCode.toUpperCase() ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy SMS Code
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Details</CardTitle>
            <CardDescription>
              Reference information for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Organization ID</Label>
              <p className="font-mono text-lg mt-1">
                #{currentOrganization.orgNumber || "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                Reference this when contacting support
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Organization Code & URL */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Code</CardTitle>
            <CardDescription>
              This code is used for your URL and SMS. Changing it updates both.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Code Input */}
            {canEdit ? (
              <div>
                <Label>Code</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={shortCode}
                    onChange={(e) =>
                      setShortCode(
                        e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""),
                      )
                    }
                    placeholder="myorg"
                    maxLength={10}
                    className="w-40 font-mono text-lg"
                  />
                  <Button
                    onClick={handleSaveShortCode}
                    disabled={isSavingShortCode || !shortCodeChanged}
                    size="sm"
                  >
                    {isSavingShortCode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Save"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  2-10 lowercase letters/numbers
                </p>
              </div>
            ) : (
              <div>
                <Label className="text-muted-foreground">Code</Label>
                <p className="font-mono text-lg mt-1">
                  {shortCode || "Not set"}
                </p>
              </div>
            )}

            {/* URLs Preview */}
            {shortCode && (
              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium">
                  {shortCodeChanged ? "URLs will be:" : "Your URLs:"}
                </p>
                <div className="flex items-center gap-2">
                  <code
                    className={`flex-1 p-2 rounded text-sm ${shortCodeChanged ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}
                  >
                    {origin}/{shortCode}
                  </code>
                  {!shortCodeChanged && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyUrl(`${origin}/${shortCode}`)}
                    >
                      {copiedUrl === `${origin}/${shortCode}` ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <code
                    className={`flex-1 p-2 rounded text-sm ${shortCodeChanged ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}
                  >
                    {origin}/c/{shortCode}
                  </code>
                  {!shortCodeChanged && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyUrl(`${origin}/c/${shortCode}`)}
                    >
                      {copiedUrl === `${origin}/c/${shortCode}` ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
