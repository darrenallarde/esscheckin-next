"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Settings, Check, Sprout, Gamepad2, ClipboardList, Minus, Copy, CheckCircle2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useOrganization } from "@/hooks/useOrganization";
import { createClient } from "@/lib/supabase/client";
import { THEME_LIST, getTheme } from "@/lib/themes";
import { SUCCESS_MESSAGES, PLATFORM_NAME } from "@/lib/copy";

export default function OrganizationSettingsPage() {
  const { toast } = useToast();
  const { currentOrganization, userRole, refreshOrganizations } = useOrganization();

  const [displayName, setDisplayName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState("default");
  const [checkinStyle, setCheckinStyle] = useState("gamified");
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Short code state
  const [shortCode, setShortCode] = useState("");
  const [originalShortCode, setOriginalShortCode] = useState("");
  const [isSavingShortCode, setIsSavingShortCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Load current settings
  useEffect(() => {
    if (currentOrganization) {
      setDisplayName(currentOrganization.displayName || currentOrganization.name || "");
      setSelectedTheme(currentOrganization.themeId || "default");
      setCheckinStyle(currentOrganization.checkinStyle || "gamified");
      // Load short code from org data
      const orgShortCode = currentOrganization.shortCode || "";
      setShortCode(orgShortCode);
      setOriginalShortCode(orgShortCode);
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
          title: "Unable to update short code",
          description: result.error || "Please try again.",
          variant: "destructive",
        });
        return;
      }

      setOriginalShortCode(shortCode.trim());
      await refreshOrganizations();

      toast({
        title: "Short code updated",
        description: shortCode.trim()
          ? `Your short URL is now active at /c/${shortCode.trim()}`
          : "Short code removed",
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
              <p>Students text <strong>{shortCode?.toUpperCase() || "your code"}</strong> to your Twilio number</p>
              <p className="text-xs">They&apos;ll be connected and can start messaging leaders</p>
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
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Organization ID</Label>
                <p className="font-mono text-lg mt-1">
                  #{currentOrganization.orgNumber || "—"}
                </p>
                <p className="text-xs text-muted-foreground">Reference this when contacting support</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Slug</Label>
                <p className="font-mono text-sm mt-1 p-2 bg-muted rounded">
                  {currentOrganization.slug}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Public Check-in URL */}
        <Card>
          <CardHeader>
            <CardTitle>Public Check-in URL</CardTitle>
            <CardDescription>
              Share this link for students to check in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Full URL */}
            <div>
              <Label className="text-muted-foreground">Full URL</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 p-2 bg-muted rounded text-sm break-all">
                  {origin}/{currentOrganization.slug}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyUrl(`${origin}/${currentOrganization.slug}`)}
                >
                  {copiedUrl === `${origin}/${currentOrganization.slug}` ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Short URL */}
            {canEdit && (
              <div>
                <Label>Short URL (optional)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-muted-foreground text-sm whitespace-nowrap">{origin}/c/</span>
                  <Input
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
                    placeholder="abc"
                    maxLength={10}
                    className="w-32 font-mono"
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
                  2-10 lowercase letters/numbers. Can be changed once per day.
                </p>
                {shortCode && !shortCodeChanged && (
                  <div className="flex items-center gap-2 mt-3 p-2 bg-muted rounded">
                    <code className="flex-1 text-sm break-all">{origin}/c/{shortCode}</code>
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
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
