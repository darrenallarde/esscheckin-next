"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Users, Church, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateOrganization } from "@/hooks/queries/use-admin";
import { THEMES } from "@/lib/themes";

const TIMEZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HST)" },
  { value: "America/Anchorage", label: "Alaska (AKST)" },
];

const MINISTRY_TYPES = [
  {
    value: "student",
    label: "Student Ministry",
    description: "Youth groups, Sunday school, campus ministry",
    icon: Users,
  },
  {
    value: "church",
    label: "Church / General",
    description: "Small groups, congregation, general ministry",
    icon: Church,
  },
];

export default function NewOrganizationPage() {
  const router = useRouter();
  const createOrg = useCreateOrganization();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [ministryType, setMinistryType] = useState<string>("student");
  const [themeId, setThemeId] = useState<string>("default");

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    // Generate slug if user hasn't manually edited it
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createOrg.mutateAsync({
        name,
        slug: slug || undefined,
        timezone,
        ministryType,
        themeId,
      });

      // Redirect to the new org's team settings to add members
      router.push(`/${slug || generateSlug(name)}/settings/team`);
    } catch (error) {
      console.error("Failed to create organization:", error);
    }
  };

  const isValid = name.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/organizations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">New Organization</h1>
          <p className="text-muted-foreground mt-1">
            Create a new organization for a ministry or church
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>
            Enter the basic information for the new organization. You can add team members after creation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Grace Youth Ministry"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">seedlinginsights.com/</span>
                <Input
                  id="slug"
                  placeholder="grace-youth"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Leave blank to auto-generate from the organization name.
              </p>
            </div>

            {/* Ministry Type */}
            <div className="space-y-3">
              <Label>Ministry Type</Label>
              <div className="grid gap-3 sm:grid-cols-2">
                {MINISTRY_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setMinistryType(type.value)}
                    className={`relative flex flex-col items-start gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent ${
                      ministryType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    {ministryType === type.value && (
                      <div className="absolute right-2 top-2">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <type.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selection */}
            <div className="space-y-3">
              <Label>Theme</Label>
              <div className="grid gap-2 grid-cols-3 sm:grid-cols-6">
                {Object.entries(THEMES).map(([id, theme]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setThemeId(id)}
                    className={`relative flex flex-col items-center gap-1.5 rounded-lg border p-3 transition-colors hover:bg-accent ${
                      themeId === id ? "border-primary ring-2 ring-primary/20" : "border-border"
                    }`}
                    title={theme.description}
                  >
                    <div
                      className="h-6 w-6 rounded-full"
                      style={{ backgroundColor: theme.primary }}
                    />
                    <span className="text-xs font-medium">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" asChild>
                <Link href="/admin/organizations">Cancel</Link>
              </Button>
              <Button type="submit" disabled={!isValid || createOrg.isPending}>
                {createOrg.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </div>

            {createOrg.isError && (
              <p className="text-sm text-destructive">
                Failed to create organization. Please try again.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
