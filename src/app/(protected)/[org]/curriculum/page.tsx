"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, Sparkles, History, Loader2 } from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { SermonUpload } from "@/components/curriculum/SermonUpload";
import { ScheduleConfig } from "@/components/curriculum/ScheduleConfig";
import { DevotionalSeriesView } from "@/components/curriculum/DevotionalSeriesView";
import {
  useDevotionalSeries,
  useActiveDevotionalSeries,
  useDevotionals,
  useCreateDevotionalSeries,
  useActivateDevotionalSeries,
  useUpdateDevotionalSeries,
  useDeleteDevotionalSeries,
  DevotionalFrequency,
  DevotionalTimeSlot,
  DevotionalSeries,
  getTotalDevotionals,
} from "@/hooks/queries/use-devotionals";
import { useToast } from "@/hooks/use-toast";
import { safeTrack } from "@/lib/amplitude";
import { EVENTS } from "@/lib/amplitude/events";
import { createClient } from "@/lib/supabase/client";

export default function CurriculumPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const organizationId = currentOrganization?.id || null;
  const { toast } = useToast();

  // Form state
  const [sermonContent, setSermonContent] = useState("");
  const [sermonTitle, setSermonTitle] = useState("");
  const [fileType, setFileType] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<DevotionalFrequency>("daily");
  const [timeSlots, setTimeSlots] = useState<DevotionalTimeSlot[]>(["morning"]);
  const [startDate, setStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  });

  // View state
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "active" | "history">(
    "create"
  );

  // Queries
  const { data: allSeries, isLoading: seriesLoading } =
    useDevotionalSeries(organizationId);
  const { data: activeSeries } = useActiveDevotionalSeries(organizationId);
  const { data: selectedDevotionals, isLoading: devotionalsLoading } =
    useDevotionals(selectedSeriesId);

  // Mutations
  const createSeries = useCreateDevotionalSeries();
  const activateSeries = useActivateDevotionalSeries();
  const updateSeries = useUpdateDevotionalSeries();
  const deleteSeries = useDeleteDevotionalSeries();

  // Get devotionals for active series
  const { data: activeDevotionals } = useDevotionals(activeSeries?.id || null);

  const handleSermonChange = (content: string, title?: string) => {
    setSermonContent(content);
    if (title !== undefined) {
      setSermonTitle(title);
    }
  };

  const handleGenerate = async () => {
    if (!organizationId || !sermonContent.trim()) {
      toast({
        title: "Missing content",
        description: "Please add your sermon content first.",
        variant: "destructive",
      });
      return;
    }

    // Track sermon upload
    safeTrack(EVENTS.SERMON_UPLOADED, {
      org_id: organizationId,
      org_slug: currentOrganization?.slug,
      source: fileType ? "file" : "paste",
      file_type: fileType,
      content_length: sermonContent.length,
    });

    // Track configuration
    const totalDevotionals = getTotalDevotionals(frequency, timeSlots);
    safeTrack(EVENTS.DEVOTIONAL_SERIES_CONFIGURED, {
      org_id: organizationId,
      org_slug: currentOrganization?.slug,
      frequency,
      time_slots: timeSlots,
      total_devotionals: totalDevotionals,
    });

    try {
      // Track generation start
      safeTrack(EVENTS.DEVOTIONAL_GENERATION_STARTED, {
        org_id: organizationId,
        org_slug: currentOrganization?.slug,
        devotional_count: totalDevotionals,
      });

      const startTime = Date.now();

      const series = await createSeries.mutateAsync({
        organizationId,
        sermonTitle: sermonTitle || undefined,
        sermonContent,
        frequency,
        timeSlots,
        startDate,
      });

      toast({
        title: "Series created!",
        description:
          "Generating devotionals... This may take up to a minute.",
      });

      // Call edge function to generate devotionals
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-devotionals`;

        const genResponse = await fetch(edgeFunctionUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ series_id: series.id }),
        });

        if (!genResponse.ok) {
          const errorData = await genResponse.json();
          console.error("Edge function error:", errorData);
          // Don't throw - series was created, just show warning
          toast({
            title: "Partial success",
            description:
              "Series created but devotional generation failed. You can retry from the History tab.",
            variant: "destructive",
          });
        } else {
          const result = await genResponse.json();
          console.log("Generation complete:", result);

          toast({
            title: "Devotionals generated!",
            description: `Created ${result.devotionals_created} devotionals.`,
          });
        }
      }

      // Track generation complete
      safeTrack(EVENTS.DEVOTIONAL_GENERATION_COMPLETED, {
        org_id: organizationId,
        org_slug: currentOrganization?.slug,
        series_id: series.id,
        duration_ms: Date.now() - startTime,
        success: true,
      });

      // Clear form and switch to history tab
      setSermonContent("");
      setSermonTitle("");
      setFileType(null);
      setSelectedSeriesId(series.id);
      setActiveTab("history");
    } catch (error) {
      console.error("Failed to create series:", error);

      safeTrack(EVENTS.DEVOTIONAL_GENERATION_COMPLETED, {
        org_id: organizationId,
        org_slug: currentOrganization?.slug,
        duration_ms: 0,
        success: false,
        error_type: error instanceof Error ? error.message : "unknown",
      });

      toast({
        title: "Generation failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleActivate = async (series: DevotionalSeries) => {
    if (!organizationId) return;

    try {
      await activateSeries.mutateAsync({
        seriesId: series.id,
        organizationId,
      });

      safeTrack(EVENTS.DEVOTIONAL_SERIES_ACTIVATED, {
        org_id: organizationId,
        org_slug: currentOrganization?.slug,
        series_id: series.id,
      });

      toast({
        title: "Series activated!",
        description: "This series is now the current devotional content.",
      });
    } catch (error) {
      toast({
        title: "Activation failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleArchive = async (series: DevotionalSeries) => {
    if (!organizationId) return;

    try {
      await updateSeries.mutateAsync({
        seriesId: series.id,
        organizationId,
        status: "archived",
      });

      toast({
        title: "Series archived",
        description: "This series has been archived.",
      });
    } catch (error) {
      toast({
        title: "Archive failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (series: DevotionalSeries) => {
    if (!organizationId) return;

    try {
      await deleteSeries.mutateAsync({
        seriesId: series.id,
        organizationId,
      });

      if (selectedSeriesId === series.id) {
        setSelectedSeriesId(null);
      }

      toast({
        title: "Series deleted",
        description: "The series has been permanently deleted.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  const pastSeries = allSeries?.filter((s) => s.status !== "active") || [];

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Curriculum
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload your sermon to generate AI-powered devotionals for your
          students
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <TabsList>
          <TabsTrigger value="create" className="gap-2">
            <Plus className="h-4 w-4" />
            Create New
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Current
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Create New Tab */}
        <TabsContent value="create" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column: Sermon Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Your Sermon</CardTitle>
              </CardHeader>
              <CardContent>
                <SermonUpload
                  value={sermonContent}
                  title={sermonTitle}
                  onChange={handleSermonChange}
                  onFileTypeChange={setFileType}
                />
              </CardContent>
            </Card>

            {/* Right Column: Schedule Config */}
            <div className="space-y-6">
              <ScheduleConfig
                frequency={frequency}
                timeSlots={timeSlots}
                startDate={startDate}
                onFrequencyChange={setFrequency}
                onTimeSlotsChange={setTimeSlots}
                onStartDateChange={setStartDate}
              />

              <Button
                onClick={handleGenerate}
                disabled={
                  !sermonContent.trim() ||
                  createSeries.isPending ||
                  !organizationId
                }
                size="lg"
                className="w-full gap-2"
              >
                {createSeries.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Devotionals
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Current/Active Tab */}
        <TabsContent value="active" className="mt-6">
          {activeSeries ? (
            <DevotionalSeriesView
              series={activeSeries}
              devotionals={activeDevotionals || []}
              isLoading={orgLoading}
              onArchive={() => handleArchive(activeSeries)}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Active Devotional Series
                </h3>
                <p className="text-muted-foreground mb-4">
                  Create a new series or activate one from your history.
                </p>
                <Button onClick={() => setActiveTab("create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Series
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          {seriesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : pastSeries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Past Series</h3>
                <p className="text-muted-foreground mb-4">
                  Your devotional series history will appear here.
                </p>
                <Button onClick={() => setActiveTab("create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Series
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Series List */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastSeries.map((series) => (
                  <Card
                    key={series.id}
                    className={`cursor-pointer transition-colors hover:border-primary ${
                      selectedSeriesId === series.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedSeriesId(series.id)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-medium truncate">
                        {series.sermon_title || "Untitled Series"}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(series.start_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {series.frequency.replace("_", "x")} •{" "}
                        {series.time_slots.join(", ")}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Selected Series Detail */}
              {selectedSeriesId && (
                <div className="mt-6">
                  {pastSeries.find((s) => s.id === selectedSeriesId) && (
                    <DevotionalSeriesView
                      series={
                        pastSeries.find((s) => s.id === selectedSeriesId)!
                      }
                      devotionals={selectedDevotionals || []}
                      isLoading={devotionalsLoading}
                      onActivate={() =>
                        handleActivate(
                          pastSeries.find((s) => s.id === selectedSeriesId)!
                        )
                      }
                      onDelete={() =>
                        handleDelete(
                          pastSeries.find((s) => s.id === selectedSeriesId)!
                        )
                      }
                      isActivating={activateSeries.isPending}
                    />
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
